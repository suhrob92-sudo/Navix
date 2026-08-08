import { DeliveryStatus, FoodOrderStatus, MarketOrderStatus, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { startOfTashkentDay, startOfTashkentDaysAgo } from '@/lib/date';
import { logger } from '@/lib/logger';
import { tiyinToNumber } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import { prisma } from '@/lib/prisma';
import type { ServiceColor } from '@/config/modules';
import { notifyUser } from '@/modules/notification/notification.service';
import { creditEarning, getOrCreateWallet } from '@/modules/wallet/wallet.service';
import {
  MAX_ACTIVE_DELIVERIES,
  canTransition,
  type CourierStats,
  type DeliveryKind,
  type DeliveryStatusName,
  type DeliveryView,
} from '@/modules/courier/courier.types';
import { formatWeight } from '@/modules/parcel/parcel.types';
import type { DeliveryQuery, UpdateDeliveryStatusInput } from '@/modules/courier/courier.schemas';

/**
 * Kuryer moduli.
 *
 * ── Bu modul nimasi bilan boshqalardan farq qiladi ────────────────────
 * Restoran va do'kon kabinetlarida EGALIK oldindan ma'lum: do'kon
 * kimningdir nomiga yozilgan va u o'zgarmaydi. Kuryerda esa egalik
 * ish jarayonida TUG'ILADI — topshiriq egasiz paydo bo'ladi va uni
 * birinchi ulgurgan kuryer oladi.
 *
 * Shundan ikkita qoida kelib chiqadi:
 *
 * 1. TOPSHIRIQNI OLISH — RAQOBATLI AMAL. O'nta kuryer bir vaqtda
 *    bosishi mumkin. Shuning uchun u shartli `UPDATE` bilan
 *    bajariladi (zaxira bilan bir xil naqsh):
 *
 *        UPDATE deliveries SET "courierId" = ?, status = 'ACCEPTED'
 *        WHERE id = ? AND "courierId" IS NULL AND status = 'OFFERED'
 *
 *    Nol qator o'zgarsa — kimdir ulgurgan.
 *
 * 2. QOLGAN HAMMA AMALDA EGALIK SHARTI BOR: `courierId = userId`.
 *    Begona topshiriqni o'zgartirish u yoqda tursin, ko'rib ham
 *    bo'lmaydi.
 *
 * ── Nima uchun xaritasiz ──────────────────────────────────────────────
 * Jonli kuzatuv xarita API kalitini talab qiladi va u pullik. Lekin
 * yetkazishning asosiy qismi kalitsiz ham ishlaydi: kim oldi, nima
 * olib ketilyapti, qayerga, mijozning telefoni va har bosqichdagi
 * xabar. Xarita keyinchalik shu poydevor ustiga qo'shiladi —
 * bosqichlar va jadval o'zgarmaydi.
 */

const MODULE = 'delivery';

/** Kuryer hali ish qilishi kerak bo'lgan holatlar. */
const ACTIVE_STATUSES: DeliveryStatus[] = [DeliveryStatus.ACCEPTED, DeliveryStatus.PICKED_UP];

// ── Topshiriq yaratish (boshqa modullar chaqiradi) ────────────────────

/**
 * Ovqat buyurtmasi uchun topshiriq ochadi.
 *
 * Restoran "yo'lga chiqarish" tugmasini bosganda chaqiriladi va
 * O'SHA TRANZAKSIYA ichida bajariladi: buyurtma "yo'lda" bo'lib,
 * topshiriq esa yaratilmay qolishi mumkin emas — unda buyurtma
 * hech kimga ko'rinmasdan osilib qolardi.
 */
export async function createFoodDelivery(
  tx: Prisma.TransactionClient,
  order: { id: string; deliveryFee: bigint },
): Promise<void> {
  await tx.delivery.create({
    data: { foodOrderId: order.id, feeTiyin: order.deliveryFee, status: DeliveryStatus.OFFERED },
  });
}

/** Marketplace buyurtmasi uchun topshiriq ochadi. */
export async function createMarketDelivery(
  tx: Prisma.TransactionClient,
  order: { id: string; deliveryFee: bigint },
): Promise<void> {
  await tx.delivery.create({
    data: { marketOrderId: order.id, feeTiyin: order.deliveryFee, status: DeliveryStatus.OFFERED },
  });
}

/**
 * Buyurtmani sotuvchi/restoran o'zi "yetkazildi" deb belgilay oladimi.
 *
 * Yo'q — agar unga kuryer topshirig'i ochilgan va u hali yakunlanmagan
 * bo'lsa. Aks holda ikki manba bitta haqiqatni aytardi: kabinet
 * "yetkazildi" derdi, kuryer esa hali yo'lda bo'lardi va haq ham
 * yozilmasdi.
 */
export async function assertDeliveryNotPending(
  tx: Prisma.TransactionClient,
  where: { foodOrderId: string } | { marketOrderId: string },
): Promise<void> {
  const delivery = await tx.delivery.findFirst({
    where: { ...where, status: { in: ACTIVE_STATUSES } },
    select: { status: true },
  });

  if (delivery) {
    throw new ConflictError('Buyurtmani kuryer topshiradi. Yetkazilgach holat o‘zi o‘zgaradi.');
  }

  const waiting = await tx.delivery.findFirst({
    where: { ...where, status: DeliveryStatus.OFFERED },
    select: { id: true },
  });

  if (waiting) {
    throw new ConflictError('Buyurtmani hali hech qaysi kuryer olmagan. Kuryer topilishini kuting.');
  }
}

// ── O'qish ────────────────────────────────────────────────────────────

const DELIVERY_SELECT = {
  id: true,
  courierId: true,
  status: true,
  feeTiyin: true,
  createdAt: true,
  acceptedAt: true,
  pickedUpAt: true,
  deliveredAt: true,
  foodOrder: {
    select: {
      id: true,
      orderNumber: true,
      total: true,
      deliveryAddress: true,
      deliveryNote: true,
      restaurant: { select: { name: true, color: true } },
      user: { select: { firstName: true, lastName: true, phone: true } },
      items: { select: { name: true, quantity: true }, orderBy: { name: 'asc' as const } },
    },
  },
  marketOrder: {
    select: {
      id: true,
      orderNumber: true,
      total: true,
      deliveryAddress: true,
      deliveryNote: true,
      shop: { select: { name: true, color: true } },
      user: { select: { firstName: true, lastName: true, phone: true } },
      items: { select: { name: true, quantity: true }, orderBy: { name: 'asc' as const } },
    },
  },
  parcel: {
    select: {
      id: true,
      parcelNumber: true,
      priceTiyin: true,
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
    },
  },
} as const;

type DeliveryRow = Prisma.DeliveryGetPayload<{ select: typeof DELIVERY_SELECT }>;

function fullName(user: { firstName: string | null; lastName: string | null }): string | null {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
}

/**
 * Bazadagi qatorni kuryer ko'radigan ko'rinishga o'giradi.
 *
 * Ikkala havoladan aynan bittasi to'lgan bo'lishi bazadagi `CHECK`
 * cheklovi bilan kafolatlangan. Shunga qaramay `null` holati ham
 * ishlanadi: agar kelajakda kimdir cheklovni olib tashlasa, ilova
 * tushunarli xato bersin, `undefined` o'qib ishlamay qolmasin.
 *
 * ── Mijozning raqami EGASIZ topshiriqda berilmaydi ────────────────────
 * Umumiy ro'yxatni har bir kuryer ko'radi. Agar javobda telefon
 * bo'lsa, buyurtma bermagan o'nlab odam mijozning raqamini olardi —
 * ekranda yashirish yetarli emas, chunki javobni to'g'ridan-to'g'ri
 * o'qish mumkin. Shuning uchun u SERVERDA kesiladi va faqat
 * topshiriqni olgan kuryerga ochiladi.
 *
 * Manzil esa qoladi: kuryer "bu yo'nalish menga to'g'ri keladimi"
 * degan qarorni usiz qabul qila olmaydi.
 */
function toDeliveryView(row: DeliveryRow): DeliveryView {
  const source = resolveSource(row);

  if (!source) {
    throw new ConflictError("Topshiriq manbaga bog'lanmagan. Qo'llab-quvvatlashga murojaat qiling.");
  }

  const isClaimed = row.courierId !== null;

  return {
    id: row.id,
    status: row.status,
    kind: source.kind,
    orderNumber: source.orderNumber,
    fee: tiyinToNumber(row.feeTiyin),
    pickup: source.pickup,
    pickupAddress: source.pickupAddress,
    dropoffAddress: source.dropoffAddress,
    dropoffNote: source.dropoffNote,
    customer: isClaimed ? source.customer : { name: null, phone: '' },
    items: source.items,
    orderTotal: source.orderTotal,
    createdAt: row.createdAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    pickedUpAt: row.pickedUpAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    orderUrl: source.orderUrl,
  };
}

interface DeliverySource {
  kind: DeliveryKind;
  orderNumber: string;
  pickup: { name: string; color: ServiceColor };
  pickupAddress: string | null;
  dropoffAddress: string;
  dropoffNote: string | null;
  customer: { name: string | null; phone: string };
  items: { name: string; quantity: number }[];
  orderTotal: number;
  orderUrl: string;
}

/**
 * Uch xil manbani BITTA ko'rinishga keltiradi.
 *
 * ── Nima uchun alohida funksiya ───────────────────────────────────────
 * Manbalar soni ikkitadan uchtaga chiqdi va ichma-ich shartlar
 * o'qib bo'lmas holga keldi. Endi har bir manba o'z blokida —
 * to'rtinchisi qo'shilsa ham shu tartib buzilmaydi.
 */
function resolveSource(row: DeliveryRow): DeliverySource | null {
  if (row.foodOrder !== null) {
    const order = row.foodOrder;

    return {
      kind: 'FOOD',
      orderNumber: order.orderNumber,
      pickup: { name: order.restaurant.name, color: order.restaurant.color as ServiceColor },
      // Restoranning manzili kuryerga tanish — u ro'yxatda va bir joyda.
      pickupAddress: null,
      dropoffAddress: order.deliveryAddress,
      dropoffNote: order.deliveryNote,
      customer: { name: fullName(order.user), phone: order.user.phone },
      items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
      orderTotal: tiyinToNumber(order.total),
      orderUrl: `/orders/${order.id}`,
    };
  }

  if (row.marketOrder !== null) {
    const order = row.marketOrder;

    return {
      kind: 'MARKET',
      orderNumber: order.orderNumber,
      pickup: { name: order.shop.name, color: order.shop.color as ServiceColor },
      pickupAddress: null,
      dropoffAddress: order.deliveryAddress,
      dropoffNote: order.deliveryNote,
      customer: { name: fullName(order.user), phone: order.user.phone },
      items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
      orderTotal: tiyinToNumber(order.total),
      orderUrl: `/marketplace/orders/${order.id}`,
    };
  }

  if (row.parcel !== null) {
    const parcel = row.parcel;

    /**
     * Posilkada "sotuvchi" yo'q — olib ketish nuqtasi jo'natuvchining
     * manzili. Shuning uchun `pickupAddress` aynan shu yerda to'ladi:
     * usiz kuryer qayerga borishini bilmasdi.
     *
     * Mijoz sifatida esa QABUL QILUVCHI ko'rsatiladi — kuryer yetib
     * borgach aynan unga qo'ng'iroq qiladi.
     */
    return {
      kind: 'PARCEL',
      orderNumber: parcel.parcelNumber,
      pickup: { name: `Jo'natuvchi — ${parcel.fromRegion}`, color: 'pink' },
      pickupAddress: parcel.fromNote
        ? `${parcel.fromAddress} (${parcel.fromNote})`
        : parcel.fromAddress,
      dropoffAddress: `${parcel.toRegion}, ${parcel.toAddress}`,
      dropoffNote: parcel.toNote,
      customer: { name: parcel.recipientName, phone: parcel.recipientPhone },
      items: [{ name: `${parcel.description} · ${formatWeight(parcel.weightGrams)}`, quantity: 1 }],
      orderTotal: tiyinToNumber(parcel.priceTiyin),
      orderUrl: `/delivery/${parcel.id}`,
    };
  }

  return null;
}

/**
 * Topshiriqlar ro'yxati.
 *
 * `AVAILABLE` — umumiy ro'yxat: EGASIZ topshiriqlar, eng eskisi
 * tepada. Navbat tartibi muhim: birinchi kelgan mijoz birinchi
 * yetkazilishi kerak.
 *
 * Qolgan filtrlarda faqat kuryerning O'Z topshiriqlari ko'rinadi.
 */
export async function listDeliveries(
  userId: string,
  query: DeliveryQuery,
): Promise<{ deliveries: DeliveryView[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);
  const isQueue = query.status === 'AVAILABLE';

  const where: Prisma.DeliveryWhereInput = isQueue
    ? { courierId: null, status: DeliveryStatus.OFFERED }
    : { courierId: userId, ...buildOwnStatusFilter(query.status) };

  const [rows, total] = await Promise.all([
    prisma.delivery.findMany({
      where,
      select: DELIVERY_SELECT,
      orderBy: isQueue ? { createdAt: 'asc' } : { createdAt: query.order },
      skip,
      take,
    }),
    prisma.delivery.count({ where }),
  ]);

  return { deliveries: rows.map(toDeliveryView), total };
}

function buildOwnStatusFilter(status: DeliveryQuery['status']): Prisma.DeliveryWhereInput {
  if (status === 'ALL') return {};
  if (status === 'ACTIVE') return { status: { in: ACTIVE_STATUSES } };

  return { status: DeliveryStatus.DELIVERED };
}

/**
 * Bitta topshiriq.
 *
 * Kuryer o'z topshirig'ini yoki umumiy ro'yxatdagi EGASIZ topshiriqni
 * ko'ra oladi. Boshqa kuryer olgan topshiriq "topilmadi" qaytaradi —
 * unda mijozning telefon raqami va manzili bor.
 */
export async function getDelivery(userId: string, deliveryId: string): Promise<DeliveryView> {
  const row = await prisma.delivery.findFirst({
    where: {
      id: deliveryId,
      OR: [{ courierId: userId }, { courierId: null, status: DeliveryStatus.OFFERED }],
    },
    select: DELIVERY_SELECT,
  });

  if (!row) {
    throw new NotFoundError('Topshiriq');
  }

  return toDeliveryView(row);
}

/** Kabinetdagi raqamlar va hozir qo'lidagi topshiriqlar. */
export async function getCourierOverview(userId: string): Promise<{ stats: CourierStats; active: DeliveryView[] }> {
  const todayStart = startOfTashkentDay();
  const weekStart = startOfTashkentDaysAgo(7);

  const done = { courierId: userId, status: DeliveryStatus.DELIVERED };

  const [today, week, activeRows, available] = await Promise.all([
    prisma.delivery.aggregate({
      _count: true,
      _sum: { feeTiyin: true },
      where: { ...done, deliveredAt: { gte: todayStart } },
    }),
    prisma.delivery.aggregate({
      _count: true,
      _sum: { feeTiyin: true },
      where: { ...done, deliveredAt: { gte: weekStart } },
    }),
    prisma.delivery.findMany({
      where: { courierId: userId, status: { in: ACTIVE_STATUSES } },
      select: DELIVERY_SELECT,
      orderBy: { acceptedAt: 'asc' },
    }),
    prisma.delivery.count({ where: { courierId: null, status: DeliveryStatus.OFFERED } }),
  ]);

  return {
    stats: {
      todayDeliveries: today._count,
      todayEarnings: today._sum.feeTiyin === null ? 0 : tiyinToNumber(today._sum.feeTiyin),
      weekDeliveries: week._count,
      weekEarnings: week._sum.feeTiyin === null ? 0 : tiyinToNumber(week._sum.feeTiyin),
      activeDeliveries: activeRows.length,
      availableDeliveries: available,
    },
    active: activeRows.map(toDeliveryView),
  };
}

interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

// ── Topshiriqni olish ─────────────────────────────────────────────────

/**
 * Kuryer topshiriqni o'ziga oladi.
 *
 * ── Nima uchun shartli UPDATE ─────────────────────────────────────────
 * "Avval o'qib, keyin yozish" bu yerda ishlamaydi: o'qish bilan yozish
 * orasida boshqa kuryer ulgurib qoladi va ikkalasi ham bitta
 * buyurtmaga yo'lga chiqadi.
 *
 * `updateMany` sharti (`courierId IS NULL AND status = 'OFFERED'`)
 * PostgreSQL'da atomar bajariladi: yutqazgan so'rov 0 qator
 * o'zgartiradi va biz buni ko'rib tushunarli javob qaytaramiz.
 */
export async function acceptDelivery(
  userId: string,
  deliveryId: string,
  meta: OperationMeta = {},
): Promise<DeliveryView> {
  const activeCount = await prisma.delivery.count({
    where: { courierId: userId, status: { in: ACTIVE_STATUSES } },
  });

  if (activeCount >= MAX_ACTIVE_DELIVERIES) {
    throw new ConflictError(
      `Bir vaqtda ko'pi bilan ${MAX_ACTIVE_DELIVERIES} ta topshiriq olish mumkin. Avval birortasini yakunlang.`,
    );
  }

  const claimed = await prisma.delivery.updateMany({
    where: { id: deliveryId, courierId: null, status: DeliveryStatus.OFFERED },
    data: { courierId: userId, status: DeliveryStatus.ACCEPTED, acceptedAt: new Date() },
  });

  if (claimed.count === 0) {
    // Topshiriq yo'q ham bo'lishi mumkin, lekin ko'p holatda —
    // kimdir ulgurgan. Kuryerga aynan shu foydali xabar.
    throw new ConflictError("Bu topshiriqni boshqa kuryer oldi. Ro'yxatni yangilang.");
  }

  const delivery = await getDelivery(userId, deliveryId);
  const courier = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { firstName: true, lastName: true, phone: true },
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.COURIER_DELIVERY_ACCEPTED,
    resourceType: 'Delivery',
    resourceId: deliveryId,
    module: MODULE,
    metadata: { orderNumber: delivery.orderNumber, kind: delivery.kind, feeTiyin: String(delivery.fee) },
    ...meta,
  });

  // Mijoz kuryer topilganini va uning raqamini bilishi kerak.
  await notifyCustomer(delivery, 'delivery.courier_assigned', {
    orderUrl: delivery.orderUrl,
    orderNumber: delivery.orderNumber,
    courierName: fullName(courier) ?? 'Kuryer',
    courierPhone: formatUzPhone(courier.phone),
  });

  logger.info({ userId, deliveryId, orderNumber: delivery.orderNumber }, 'Kuryer topshiriqni oldi');

  return delivery;
}

// ── Bosqichlar ────────────────────────────────────────────────────────

/**
 * Topshiriq holatini o'zgartiradi.
 *
 * Uchta yo'l bor va ular jiddiy farq qiladi:
 *  · `PICKED_UP` — oddiy bosqich;
 *  · `OFFERED`  — topshiriqdan voz kechish (egasi olib tashlanadi);
 *  · `DELIVERED`— yakun: buyurtma ham yopiladi va haq yoziladi.
 */
export async function updateDeliveryStatus(
  userId: string,
  deliveryId: string,
  input: UpdateDeliveryStatusInput,
  meta: OperationMeta = {},
): Promise<DeliveryView> {
  const row = await prisma.delivery.findFirst({
    where: { id: deliveryId, courierId: userId },
    select: {
      id: true,
      status: true,
      feeTiyin: true,
      foodOrderId: true,
      marketOrderId: true,
    },
  });

  if (!row) {
    throw new NotFoundError('Topshiriq');
  }

  const from = row.status as DeliveryStatusName;
  const to = input.status as DeliveryStatusName;

  if (!canTransition(from, to)) {
    throw new ConflictError(buildTransitionMessage(from, to));
  }

  if (to === 'OFFERED') {
    return releaseDelivery(userId, row, input.reason ?? 'Kuryer topshiriqdan voz kechdi', meta);
  }

  if (to === 'DELIVERED') {
    return completeDelivery(userId, row, meta);
  }

  const updated = await prisma.delivery.updateMany({
    where: { id: row.id, courierId: userId, status: row.status },
    data: { status: DeliveryStatus.PICKED_UP, pickedUpAt: new Date() },
  });

  if (updated.count === 0) {
    throw new ConflictError("Topshiriq holati o'zgardi. Sahifani yangilang.");
  }

  const delivery = await getDelivery(userId, deliveryId);
  const courier = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.COURIER_DELIVERY_PICKED_UP,
    resourceType: 'Delivery',
    resourceId: row.id,
    module: MODULE,
    metadata: { orderNumber: delivery.orderNumber },
    ...meta,
  });

  await notifyCustomer(delivery, 'delivery.picked_up', {
    orderUrl: delivery.orderUrl,
    orderNumber: delivery.orderNumber,
    courierName: fullName(courier) ?? 'Kuryer',
  });

  logger.info({ userId, deliveryId, orderNumber: delivery.orderNumber }, 'Kuryer buyurtmani olib chiqdi');

  return delivery;
}

function buildTransitionMessage(from: DeliveryStatusName, to: DeliveryStatusName): string {
  if (from === 'DELIVERED' || from === 'CANCELLED') {
    return "Topshiriq yakunlangan — uni o'zgartirib bo'lmaydi.";
  }

  if (to === 'OFFERED') {
    return "Buyurtma qo'lingizda — undan voz kechib bo'lmaydi. Yetkazib bering yoki qo'llab-quvvatlashga murojaat qiling.";
  }

  return "Bosqichni sakrab o'tib bo'lmaydi. Avval buyurtmani olib chiqing.";
}

/**
 * Kuryer topshiriqdan voz kechadi — u umumiy ro'yxatga QAYTADI.
 *
 * Egasi olib tashlanadi va holat `OFFERED` ga qaytadi, `acceptedAt`
 * esa tozalanadi: keyingi kuryer uchun bu yangi topshiriq.
 *
 * Faqat buyurtma HALI OLINMAGAN bo'lsa mumkin — buni holatlar
 * avtomati (`DELIVERY_TRANSITIONS`) hal qiladi.
 */
async function releaseDelivery(
  userId: string,
  row: { id: string; status: DeliveryStatus },
  reason: string,
  meta: OperationMeta,
): Promise<DeliveryView> {
  const released = await prisma.delivery.updateMany({
    where: { id: row.id, courierId: userId, status: row.status },
    data: {
      courierId: null,
      status: DeliveryStatus.OFFERED,
      acceptedAt: null,
      cancelReason: reason,
    },
  });

  if (released.count === 0) {
    throw new ConflictError("Topshiriq holati o'zgardi. Sahifani yangilang.");
  }

  await recordAudit({
    actorId: userId,
    action: AuditAction.COURIER_DELIVERY_RELEASED,
    resourceType: 'Delivery',
    resourceId: row.id,
    module: MODULE,
    metadata: { reason },
    ...meta,
  });

  logger.warn({ userId, deliveryId: row.id, reason }, 'Kuryer topshiriqdan voz kechdi');

  // Endi topshiriq yana EGASIZ — uni umumiy ro'yxat orqali o'qiymiz.
  return getDelivery(userId, row.id);
}

/**
 * Kuryer buyurtmani topshirdi — uchta ish BITTA tranzaksiyada.
 *
 * ── Nima uchun ajratib bo'lmaydi ──────────────────────────────────────
 *  · topshiriq yopilib, buyurtma "yo'lda" qolsa — mijoz ilovada
 *    hech qachon "yetkazildi" ni ko'rmaydi;
 *  · buyurtma yopilib, haq yozilmasa — kuryer bepul ishlagan bo'ladi.
 *
 * Idempotentlik kaliti topshiriq ID'sidan hisoblanadi va ustun bazada
 * UNIQUE: tugma ikki marta bosilsa ham haq ikki marta yozilmaydi.
 */
async function completeDelivery(
  userId: string,
  row: { id: string; status: DeliveryStatus; feeTiyin: bigint; foodOrderId: string | null; marketOrderId: string | null },
  meta: OperationMeta,
): Promise<DeliveryView> {
  // Hamyon tranzaksiyadan OLDIN tayyorlanadi: uni ichkarida yaratish
  // qulfni keraksiz uzoq ushlab turardi.
  const wallet = await getOrCreateWallet(userId);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.delivery.updateMany({
      where: { id: row.id, courierId: userId, status: row.status },
      data: { status: DeliveryStatus.DELIVERED, deliveredAt: now },
    });

    if (claimed.count === 0) {
      throw new ConflictError("Topshiriq holati o'zgardi. Sahifani yangilang.");
    }

    /**
     * Buyurtmani ham yakunlaymiz — holat sharti bilan.
     *
     * ── POSILKADA buyurtma YO'Q ────────────────────────────────────────
     * Ovqat va Marketplace'da yetkazish tugagach BUYURTMA holati ham
     * "yetkazildi" ga o'tishi kerak. Posilkada esa yakunlanadigan
     * buyurtma yo'q: uning holati aynan shu yetkazish yozuvi.
     *
     * Bu shart qo'shilmasa, posilka yetkazilganda kod bo'sh
     * `marketOrderId` bilan buyurtma qidirib, baza xatosiga
     * uchrardi — kuryer haqini ololmasdi. Xato haqiqiy baza
     * ustidagi tekshiruvda ushlandi.
     */
    if (row.foodOrderId !== null || row.marketOrderId !== null) {
      const finished = row.foodOrderId
        ? await tx.foodOrder.updateMany({
            where: { id: row.foodOrderId, status: FoodOrderStatus.DELIVERING },
            data: { status: FoodOrderStatus.DELIVERED, deliveredAt: now },
          })
        : await tx.marketOrder.updateMany({
            where: { id: row.marketOrderId!, status: MarketOrderStatus.SHIPPED },
            data: { status: MarketOrderStatus.DELIVERED, deliveredAt: now },
          });

      if (finished.count === 0) {
        throw new ConflictError("Buyurtma holati o'zgardi. Sahifani yangilang.");
      }
    }

    const payout = await creditEarning(tx, {
      walletId: wallet.id,
      amountTiyin: row.feeTiyin,
      description: 'Yetkazish haqi',
      sourceModule: MODULE,
      sourceId: row.id,
      idempotencyKey: `delivery-payout-${row.id}`,
    });

    await tx.delivery.update({ where: { id: row.id }, data: { payoutTransactionId: payout.id } });
  });

  const delivery = await getDelivery(userId, row.id);

  await recordAudit({
    actorId: userId,
    action: AuditAction.COURIER_DELIVERY_COMPLETED,
    resourceType: 'Delivery',
    resourceId: row.id,
    module: MODULE,
    metadata: {
      orderNumber: delivery.orderNumber,
      kind: delivery.kind,
      amountTiyin: row.feeTiyin.toString(),
    },
    ...meta,
  });

  await notifyUser(userId, 'courier.delivery_paid', {
    deliveryId: row.id,
    orderNumber: delivery.orderNumber,
    amountTiyin: tiyinToNumber(row.feeTiyin),
  });

  // Mijozga buyurtma bosqichi haqidagi odatiy xabar boradi.
  await notifyOrderDelivered(delivery, row);

  logger.info(
    { userId, deliveryId: row.id, orderNumber: delivery.orderNumber, feeTiyin: row.feeTiyin.toString() },
    'Kuryer yetkazib berdi',
  );

  return delivery;
}

// ── Bildirishnomalar ──────────────────────────────────────────────────

/**
 * Buyurtma egasiga xabar yuboradi.
 *
 * Kuryer mijozning ID'sini bilmaydi (va bilishi ham shart emas) —
 * shuning uchun u buyurtmadan qidiriladi.
 */
async function notifyCustomer(
  delivery: DeliveryView,
  event: 'delivery.courier_assigned' | 'delivery.picked_up',
  data: { orderUrl: string; orderNumber: string; courierName: string; courierPhone?: string },
): Promise<void> {
  const customerId = await findCustomerId(delivery.id);
  if (!customerId) return;

  if (event === 'delivery.courier_assigned') {
    await notifyUser(customerId, event, {
      orderUrl: data.orderUrl,
      orderNumber: data.orderNumber,
      courierName: data.courierName,
      courierPhone: data.courierPhone ?? '',
    });

    return;
  }

  await notifyUser(customerId, event, {
    orderUrl: data.orderUrl,
    orderNumber: data.orderNumber,
    courierName: data.courierName,
  });
}

async function notifyOrderDelivered(
  delivery: DeliveryView,
  row: { foodOrderId: string | null; marketOrderId: string | null },
): Promise<void> {
  const customerId = await findCustomerId(delivery.id);
  if (!customerId) return;

  if (row.foodOrderId) {
    await notifyUser(customerId, 'food.order_status_changed', {
      orderId: row.foodOrderId,
      orderNumber: delivery.orderNumber,
      restaurantName: delivery.pickup.name,
      status: 'DELIVERED',
    });

    return;
  }

  await notifyUser(customerId, 'market.order_status_changed', {
    orderId: row.marketOrderId ?? '',
    orderNumber: delivery.orderNumber,
    shopName: delivery.pickup.name,
    status: 'DELIVERED',
  });
}

async function findCustomerId(deliveryId: string): Promise<string | null> {
  const row = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    select: {
      foodOrder: { select: { userId: true } },
      marketOrder: { select: { userId: true } },
    },
  });

  return row?.foodOrder?.userId ?? row?.marketOrder?.userId ?? null;
}
