import { DeliveryStatus, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { runIdempotent } from '@/lib/idempotency';
import { logger } from '@/lib/logger';
import { tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/modules/notification/notification.service';
import {
  chargeWallet,
  findTransactionByIdempotencyKey,
  getOrCreateWallet,
  refundWallet,
} from '@/modules/wallet/wallet.service';
import type { DeliveryStatusName } from '@/modules/courier/courier.types';
import { calculateParcelPrice, isWeightAllowed } from '@/modules/parcel/parcel.pricing';
import { canCancelParcel, type ParcelView } from '@/modules/parcel/parcel.types';
import type { CancelParcelInput, CreateParcelInput, ParcelQuery } from '@/modules/parcel/parcel.schemas';

/**
 * Posilka jo'natish moduli.
 *
 * ── Ovqat va Marketplace'dan ENG KATTA farqi ──────────────────────────
 * U yerlarda SOTUVCHI bor: restoran ovqat tayyorlaydi, do'kon tovarni
 * yig'adi va ular buyurtmani qabul qilishi kerak.
 *
 * Bu yerda sotuvchi YO'Q. Foydalanuvchi to'laydi va jo'natma darhol
 * kuryerlarning umumiy ro'yxatiga tushadi. Shuning uchun "qabul
 * qilish" bosqichi ham yo'q.
 *
 * ── Holat qayerda saqlanadi ───────────────────────────────────────────
 * Posilkaning O'Z holati YO'Q. U `Delivery` jadvalidan o'qiladi.
 *
 * Ikkita holat ustuni bo'lganda ular ertaga bir-biridan ajralib
 * qolardi: kuryer "yo'lda" derdi, posilka sahifasi esa "kuryer
 * kutilmoqda". Bir haqiqatni ikki joyda saqlamaymiz.
 *
 * ── Pul ───────────────────────────────────────────────────────────────
 * To'lov jo'natish paytida to'liq yechiladi (`chargeWallet`), bekor
 * qilinganda esa qaytariladi (`refundWallet`). Idempotentlik kaliti
 * takroriy bosishdan himoya qiladi — bu hamyondagi bilan bir xil
 * naqsh.
 */

const MODULE = 'parcel';

/** Hali yakunlanmagan jo'natmalar. */
const ACTIVE_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.OFFERED,
  DeliveryStatus.ACCEPTED,
  DeliveryStatus.PICKED_UP,
];

const PARCEL_SELECT = {
  id: true,
  parcelNumber: true,
  fromRegion: true,
  fromAddress: true,
  fromNote: true,
  toRegion: true,
  toAddress: true,
  toNote: true,
  recipientName: true,
  recipientPhone: true,
  description: true,
  weightGrams: true,
  priceTiyin: true,
  cancelReason: true,
  createdAt: true,
  cancelledAt: true,
  delivery: {
    select: {
      status: true,
      acceptedAt: true,
      pickedUpAt: true,
      deliveredAt: true,
      courier: { select: { firstName: true, lastName: true, phone: true } },
    },
  },
} as const;

type ParcelRow = Prisma.ParcelGetPayload<{ select: typeof PARCEL_SELECT }>;

function fullName(user: { firstName: string | null; lastName: string | null } | null): string | null {
  if (!user) return null;

  const parts = [user.firstName, user.lastName].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : null;
}

function toParcelView(row: ParcelRow): ParcelView {
  const delivery = row.delivery;

  return {
    id: row.id,
    parcelNumber: row.parcelNumber,
    /**
     * Yetkazish yozuvi bo'lmasligi mumkin emas — u jo'natma bilan
     * BIR TRANZAKSIYADA yaratiladi. Lekin tur darajasida u ixtiyoriy,
     * shuning uchun zaxira qiymat beramiz.
     */
    status: (delivery?.status ?? 'CANCELLED') as DeliveryStatusName,

    fromRegion: row.fromRegion,
    fromAddress: row.fromAddress,
    fromNote: row.fromNote,

    toRegion: row.toRegion,
    toAddress: row.toAddress,
    toNote: row.toNote,

    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,

    description: row.description,
    weightGrams: row.weightGrams,
    priceTiyin: tiyinToNumber(row.priceTiyin),

    createdAt: row.createdAt.toISOString(),
    acceptedAt: delivery?.acceptedAt?.toISOString() ?? null,
    pickedUpAt: delivery?.pickedUpAt?.toISOString() ?? null,
    deliveredAt: delivery?.deliveredAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelReason: row.cancelReason,

    // Kuryer topshiriqni olmaguncha uning raqami yo'q.
    courier: delivery?.courier
      ? { name: fullName(delivery.courier), phone: delivery.courier.phone }
      : null,
  };
}

/** Jo'natma raqami: NVX-P-20260806-A1B2C3 */
function generateParcelNumber(): string {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('');

  return `NVX-P-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Jo'natmani yaratadi va pulni yechadi.
 *
 * Hammasi BITTA tranzaksiyada: jo'natma, yetkazish topshirig'i va
 * to'lov. Aks holda pul yechilib, topshiriq yaratilmay qolishi
 * mumkin edi — mijoz to'lagan, lekin hech kim kelmaydigan holat.
 */
export async function createParcel(
  userId: string,
  input: CreateParcelInput,
  meta: OperationMeta = {},
): Promise<ParcelView> {
  /**
   * Bir vaqtda kelgan takroriy so'rov.
   *
   * Pastdagi tekshiruv ketma-ket so'rovlar uchun yetarli. Ikkita
   * so'rov BIR VAQTDA kelsa esa ikkalasi ham "yo'q" deb ko'radi va
   * ikkinchisi yagona indeksga urilib, 500 qaytarardi.
   */
  return runIdempotent(
    () => performCreateParcel(userId, input, meta),
    async () => {
      const duplicate = await findTransactionByIdempotencyKey(input.idempotencyKey);

      return duplicate?.sourceId ? getParcel(userId, duplicate.sourceId) : null;
    },
  );
}

async function performCreateParcel(
  userId: string,
  input: CreateParcelInput,
  meta: OperationMeta,
): Promise<ParcelView> {
  if (!isWeightAllowed(input.weightGrams)) {
    throw new ValidationError("Og'irlik ruxsat etilgan chegaradan tashqarida");
  }

  /**
   * TAKRORIY so'rov — tugma ikki marta bosilgan.
   *
   * ── Nima uchun xato EMAS ──────────────────────────────────────────
   * Bu foydalanuvchining aybi emas: sekin internetda tugma bosilib,
   * javob kelmasa, odam yana bosadi. Unga xato ko'rsatish "pulim
   * yechildimi yoki yo'qmi?" degan qo'rquv tug'diradi.
   *
   * Shuning uchun birinchi jo'natmaning O'ZI qaytariladi — xuddi
   * so'rov endi bajarilgandek. Ikkinchi jo'natma ham, ikkinchi
   * to'lov ham bo'lmaydi.
   *
   * Bu tekshiruvsiz bazadagi UNIQUE cheklovi ishga tushardi va
   * mijoz xom baza xatosini ko'rardi — bu haqiqiy baza ustidagi
   * tekshiruvda topildi.
   */
  const duplicate = await findTransactionByIdempotencyKey(input.idempotencyKey);

  if (duplicate?.sourceId) {
    return getParcel(userId, duplicate.sourceId);
  }

  /**
   * Narx SERVERDA hisoblanadi.
   *
   * Mijozdan kelgan summaga ishonib bo'lmaydi — so'rovni tahrirlab
   * Xorazmga 100 so'mga posilka jo'natish mumkin bo'lardi.
   */
  const price = calculateParcelPrice({
    fromRegion: input.fromRegion,
    toRegion: input.toRegion,
    weightGrams: input.weightGrams,
  });

  const wallet = await getOrCreateWallet(userId);
  const parcelNumber = generateParcelNumber();

  const created = await prisma.$transaction(async (tx) => {
    const parcel = await tx.parcel.create({
      data: {
        senderId: userId,
        parcelNumber,
        fromRegion: input.fromRegion,
        fromAddress: input.fromAddress,
        fromNote: input.fromNote ?? null,
        toRegion: input.toRegion,
        toAddress: input.toAddress,
        toNote: input.toNote ?? null,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        description: input.description,
        weightGrams: input.weightGrams,
        priceTiyin: BigInt(price.priceTiyin),
        courierFeeTiyin: BigInt(price.courierFeeTiyin),
      },
      select: { id: true },
    });

    /**
     * Topshiriq DARHOL umumiy ro'yxatga tushadi.
     *
     * Ovqat va Marketplace'da avval sotuvchi qabul qilishi kerak.
     * Bu yerda kutadigan hech kim yo'q — mijoz to'ladi, demak
     * jo'natma tayyor.
     */
    await tx.delivery.create({
      data: {
        parcelId: parcel.id,
        feeTiyin: BigInt(price.courierFeeTiyin),
        status: DeliveryStatus.OFFERED,
      },
    });

    const charge = await chargeWallet(tx, {
      userId,
      walletId: wallet.id,
      amountTiyin: BigInt(price.priceTiyin),
      description: `Posilka ${parcelNumber} — ${input.toRegion}`,
      sourceModule: MODULE,
      sourceId: parcel.id,
      idempotencyKey: input.idempotencyKey,
    });

    return tx.parcel.update({
      where: { id: parcel.id },
      data: { walletTransactionId: charge.id },
      select: PARCEL_SELECT,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.PARCEL_CREATED,
    resourceType: 'Parcel',
    resourceId: created.id,
    module: MODULE,
    metadata: {
      parcelNumber,
      amountTiyin: price.priceTiyin.toString(),
      route: `${input.fromRegion} → ${input.toRegion}`,
    },
    ...meta,
  });

  await notifyUser(userId, 'parcel.created', {
    parcelId: created.id,
    parcelNumber,
    toRegion: input.toRegion,
    amountTiyin: price.priceTiyin,
  });

  logger.info({ userId, parcelId: created.id, parcelNumber }, "Posilka jo'natildi");

  return toParcelView(created);
}

/** Narxni oldindan hisoblaydi — hech narsa saqlanmaydi. */
export function quoteParcel(input: { fromRegion: string; toRegion: string; weightGrams: number }) {
  const price = calculateParcelPrice(input);

  return { priceTiyin: price.priceTiyin, breakdown: price.breakdown };
}

function buildStatusFilter(status: ParcelQuery['status']): Prisma.ParcelWhereInput {
  if (status === 'ALL') return {};
  if (status === 'ACTIVE') return { delivery: { status: { in: ACTIVE_STATUSES } } };
  if (status === 'DELIVERED') return { delivery: { status: DeliveryStatus.DELIVERED } };

  return { delivery: { status: DeliveryStatus.CANCELLED } };
}

/** Foydalanuvchining jo'natmalari. */
export async function listParcels(
  userId: string,
  query: ParcelQuery,
): Promise<{ parcels: ParcelView[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  const where: Prisma.ParcelWhereInput = { senderId: userId, ...buildStatusFilter(query.status) };

  const [rows, total] = await Promise.all([
    prisma.parcel.findMany({ where, select: PARCEL_SELECT, orderBy: { createdAt: query.order }, skip, take }),
    prisma.parcel.count({ where }),
  ]);

  return { parcels: rows.map(toParcelView), total };
}

/**
 * Bitta jo'natma.
 *
 * Egalik sharti (`senderId`) shu yerda: begona jo'natmani ko'rish
 * qabul qiluvchining telefon raqamini oshkor qilardi.
 */
export async function getParcel(userId: string, parcelId: string): Promise<ParcelView> {
  const row = await prisma.parcel.findFirst({
    where: { id: parcelId, senderId: userId },
    select: PARCEL_SELECT,
  });

  if (!row) {
    throw new NotFoundError('Jo\'natma');
  }

  return toParcelView(row);
}

/**
 * Jo'natmani bekor qiladi va pulni qaytaradi.
 *
 * ── Nima uchun faqat kuryer OLIB CHIQMAGUNCHA ─────────────────────────
 * Posilka kuryerning qo'liga o'tgandan keyin uni "bekor qilish"
 * ma'nosini yo'qotadi: buyum allaqachon yo'lda va uni qaytarish
 * alohida ish, alohida xarajat.
 *
 * ── Raqobatdan himoya ─────────────────────────────────────────────────
 * Shu oniyda kuryer topshiriqni olib qo'ygan bo'lishi mumkin. Shuning
 * uchun holat SHARTLI yangilanadi: `count === 0` bo'lsa, demak kimdir
 * ulgurgan va bekor qilish o'tmaydi.
 */
export async function cancelParcel(
  userId: string,
  parcelId: string,
  input: CancelParcelInput,
  meta: OperationMeta = {},
): Promise<ParcelView> {
  const parcel = await prisma.parcel.findFirst({
    where: { id: parcelId, senderId: userId },
    select: {
      id: true,
      parcelNumber: true,
      priceTiyin: true,
      walletTransactionId: true,
      delivery: { select: { id: true, status: true } },
    },
  });

  if (!parcel) {
    throw new NotFoundError('Jo\'natma');
  }

  const status = (parcel.delivery?.status ?? 'CANCELLED') as DeliveryStatusName;

  if (!canCancelParcel(status)) {
    throw new ConflictError(
      status === 'PICKED_UP'
        ? "Posilka kuryerning qo'lida — bekor qilib bo'lmaydi. Qo'llab-quvvatlashga murojaat qiling."
        : 'Bu jo\'natma allaqachon yakunlangan.',
    );
  }

  const wallet = await getOrCreateWallet(userId);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.delivery.updateMany({
      where: { id: parcel.delivery!.id, status: parcel.delivery!.status },
      data: {
        status: DeliveryStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: input.reason ?? null,
        // Ish tugadi — kuryerning oxirgi nuqtasi saqlanib qolmaydi.
        courierLat: null,
        courierLng: null,
        locationAt: null,
      },
    });

    if (updated.count === 0) {
      throw new ConflictError("Jo'natma holati o'zgardi. Sahifani yangilang.");
    }

    await tx.parcel.update({
      where: { id: parcel.id },
      data: { cancelledAt: new Date(), cancelReason: input.reason ?? null },
    });

    /**
     * Pul QAYTARILADI.
     *
     * Idempotentlik kaliti jo'natma ID'siga bog'langan: tugma ikki
     * marta bosilsa ham ikkinchi qaytarish yozilmaydi.
     */
    await refundWallet(tx, {
      walletId: wallet.id,
      amountTiyin: parcel.priceTiyin,
      description: `Posilka ${parcel.parcelNumber} bekor qilindi`,
      sourceModule: MODULE,
      sourceId: parcel.id,
      idempotencyKey: `parcel-refund-${parcel.id}`,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.PARCEL_CANCELLED,
    resourceType: 'Parcel',
    resourceId: parcel.id,
    module: MODULE,
    metadata: { parcelNumber: parcel.parcelNumber, refundTiyin: parcel.priceTiyin.toString() },
    ...meta,
  });

  await notifyUser(userId, 'parcel.cancelled', {
    parcelId: parcel.id,
    parcelNumber: parcel.parcelNumber,
    refundTiyin: tiyinToNumber(parcel.priceTiyin),
  });

  logger.info({ userId, parcelId: parcel.id }, 'Posilka bekor qilindi');

  return getParcel(userId, parcel.id);
}
