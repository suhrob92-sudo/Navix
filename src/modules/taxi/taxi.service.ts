import { Prisma, TaxiRideStatus } from '@/generated/prisma/client';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { clientIdempotencyKey, runIdempotent } from '@/lib/idempotency';
import { logger } from '@/lib/logger';
import { tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { isAccurateEnough, type Point } from '@/config/delivery-eta';
import {
  TAXI_SEARCH_RADIUS_KM,
  TAXI_TARIFFS,
  type TaxiTariffName,
} from '@/config/taxi';
import { notifyUser } from '@/modules/notification/notification.service';
import {
  chargeWallet,
  creditEarning,
  findTransactionByIdempotencyKey,
  getOrCreateWallet,
  refundWallet,
} from '@/modules/wallet/wallet.service';
import {
  calculateTaxiFare,
  isTaxiDistanceAllowed,
  routeDistanceKm,
  taxiMinutes,
} from '@/modules/taxi/taxi.pricing';
import {
  canCancelRide,
  type DriverProfileView,
  type RideOfferView,
  type RideView,
  type TaxiQuote,
} from '@/modules/taxi/taxi.types';
import type {
  CancelRideInput,
  CreateRideInput,
  DriverLocationInput,
  DriverOnlineInput,
  DriverProfileInput,
  RateRideInput,
  RideOffersInput,
  RideQuery,
  TaxiQuoteInput,
} from '@/modules/taxi/taxi.schemas';

/**
 * Taksi moduli.
 *
 * ── Posilka va Ovqatdan ENG KATTA farqi ───────────────────────────────
 * U yerlarda buyurtma bir marta yaratiladi va keyin kuzatiladi. Taksida
 * esa safar BOSQICHMA-BOSQICH o'tadi va har bosqichni BOSHQA odam
 * boshlaydi: mijoz chaqiradi, haydovchi qabul qiladi, haydovchi yetib
 * keladi, haydovchi boshlaydi, haydovchi yakunlaydi.
 *
 * Shuning uchun har bir o'tish alohida funksiya va har birida IKKI
 * tekshiruv bor: kim so'rayapti (egalik) va hozirgi holat o'tishga
 * ruxsat beradimi. Ikkinchisisiz haydovchi safarni boshlanmasdan
 * "yakunlab", pulni olib ketishi mumkin bo'lardi.
 *
 * ── Pul qachon harakatlanadi ──────────────────────────────────────────
 * Mijozdan pul BUYURTMA paytida yechiladi (`chargeWallet`) — Posilkadagi
 * bilan bir xil. Bekor qilinsa qaytariladi (`refundWallet`), safar
 * yakunlansa haydovchiga daromad yoziladi (`creditEarning`).
 *
 * Nima uchun oldindan: yechilmasa, mijoz mashinada manzilga yetib
 * borib, "hamyonimda pul yo'q" deyishi mumkin edi va haydovchi
 * hech narsasiz qolardi.
 *
 * ── Egalik qayerda tekshiriladi ───────────────────────────────────────
 * HECH QACHON `findUnique({ where: { id } })` ishlatilmaydi. Egalik
 * so'rovning O'ZIGA yoziladi (`findFirst({ where: { id, riderId } })`),
 * shunda uni unutib bo'lmaydi. Bu — 53-bosqichdagi ma'lumot auditining
 * qoidasi va `data-ownership.test.ts` uni qo'riqlaydi.
 */

const MODULE = 'taxi';

/** Hali yakunlanmagan safarlar. */
const ACTIVE_STATUSES: TaxiRideStatus[] = [
  TaxiRideStatus.SEARCHING,
  TaxiRideStatus.ACCEPTED,
  TaxiRideStatus.ARRIVED,
  TaxiRideStatus.IN_PROGRESS,
];

const RIDE_SELECT = {
  id: true,
  status: true,
  tariff: true,
  fromLat: true,
  fromLng: true,
  fromAddress: true,
  toLat: true,
  toLng: true,
  toAddress: true,
  distanceKm: true,
  priceTiyin: true,
  driverLat: true,
  driverLng: true,
  locationAt: true,
  rating: true,
  cancelReason: true,
  createdAt: true,
  acceptedAt: true,
  arrivedAt: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  driver: {
    select: {
      carModel: true,
      carColor: true,
      plateNumber: true,
      ratingSum: true,
      ratingCount: true,
      user: { select: { firstName: true, lastName: true, phone: true } },
    },
  },
} as const;

type RideRow = Prisma.TaxiRideGetPayload<{ select: typeof RIDE_SELECT }>;

export interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

function fullName(user: { firstName: string | null; lastName: string | null } | null): string | null {
  if (!user) return null;

  const parts = [user.firstName, user.lastName].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * O'rtacha reyting — yig'indidan hisoblanadi.
 *
 * Baholanmagan haydovchi uchun `null`, nol emas: nol "eng yomon"
 * degan ma'no berardi, holbuki u shunchaki hali baholanmagan.
 */
function averageRating(sum: number, count: number): number | null {
  if (count === 0) return null;

  return Math.round((sum / count) * 10) / 10;
}

function toNumber(value: Prisma.Decimal): number {
  return Number(value);
}

function toRideView(row: RideRow): RideView {
  return {
    id: row.id,
    status: row.status,
    tariff: row.tariff as TaxiTariffName,

    from: {
      latitude: toNumber(row.fromLat),
      longitude: toNumber(row.fromLng),
      address: row.fromAddress,
    },
    to: {
      latitude: toNumber(row.toLat),
      longitude: toNumber(row.toLng),
      address: row.toAddress,
    },

    distanceKm: toNumber(row.distanceKm),
    priceTiyin: tiyinToNumber(row.priceTiyin),

    /*
      Haydovchi ma'lumoti — telefon raqami bilan — faqat u buyurtmani
      OLGANDAN keyin mavjud bo'ladi. Qidiruv bosqichida bu maydon
      butunlay `null`, ya'ni hech qanday shaxsiy ma'lumot yuborilmaydi.
    */
    driver: row.driver
      ? {
          name: fullName(row.driver.user),
          phone: row.driver.user.phone,
          carModel: row.driver.carModel,
          carColor: row.driver.carColor,
          plateNumber: row.driver.plateNumber,
          rating: averageRating(row.driver.ratingSum, row.driver.ratingCount),
          ratingCount: row.driver.ratingCount,
        }
      : null,

    driverLocation:
      row.driverLat !== null && row.driverLng !== null && row.locationAt !== null
        ? {
            latitude: toNumber(row.driverLat),
            longitude: toNumber(row.driverLng),
            reportedAt: row.locationAt.toISOString(),
          }
        : null,

    rating: row.rating,
    cancelReason: row.cancelReason,

    createdAt: row.createdAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    arrivedAt: row.arrivedAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
  };
}

// ---------------------------------------------------------------------------
// Mijoz tomoni
// ---------------------------------------------------------------------------

/**
 * Narxni oldindan hisoblaydi — hech narsa saqlanmaydi.
 *
 * Ikkala tarif ham qaytariladi: mijoz ekranda ularni yonma-yon
 * ko'rib tanlaydi. Ikki alohida so'rov yuborish keraksiz ish
 * bo'lardi.
 */
export function quoteRide(input: TaxiQuoteInput): TaxiQuote {
  const from: Point = { latitude: input.fromLat, longitude: input.fromLng };
  const to: Point = { latitude: input.toLat, longitude: input.toLng };

  const km = routeDistanceKm(from, to);

  if (!isTaxiDistanceAllowed(km)) {
    throw new ValidationError(
      km === 0
        ? "Boradigan manzilni tanlang — u hozir turgan joyingiz bilan bir xil"
        : "Bu masofa taksi uchun juda uzoq — Sayohat bo'limidan foydalaning",
    );
  }

  const options = (Object.keys(TAXI_TARIFFS) as TaxiTariffName[]).map((tariff) => {
    const fare = calculateTaxiFare(tariff, km);
    const rate = TAXI_TARIFFS[tariff];

    return {
      tariff,
      label: rate.label,
      description: rate.description,
      seats: rate.seats,
      priceTiyin: fare.priceTiyin,
      minutes: taxiMinutes(km),
    };
  });

  return { distanceKm: km, options };
}

/**
 * Safar buyurtma qiladi va pulni yechadi.
 *
 * Hammasi BITTA tranzaksiyada: safar yozuvi va to'lov. Aks holda
 * pul yechilib, safar yaratilmay qolishi mumkin edi — mijoz
 * to'lagan, lekin hech kim kelmaydigan holat.
 */
export async function createRide(
  userId: string,
  input: CreateRideInput,
  meta: OperationMeta = {},
): Promise<RideView> {
  /*
    Bir vaqtda kelgan takroriy so'rov — `parcel.service.ts` dagi
    bilan bir xil himoya. Ketma-ket so'rovlar uchun pastdagi
    tekshiruv yetarli; bir vaqtda kelganda esa ikkalasi ham "yo'q"
    deb ko'rib, ikkinchisi yagona indeksga urilardi.
  */
  return runIdempotent(
    () => performCreateRide(userId, input, meta),
    async () => {
      const duplicate = await findTransactionByIdempotencyKey(userId, input.idempotencyKey);

      return duplicate?.sourceId ? getRide(userId, duplicate.sourceId) : null;
    },
  );
}

async function performCreateRide(
  userId: string,
  input: CreateRideInput,
  meta: OperationMeta,
): Promise<RideView> {
  /*
    TAKRORIY so'rov — tugma ikki marta bosilgan.

    Xato EMAS: sekin internetda javob kelmasa, odam yana bosadi.
    Unga xato ko'rsatish "pulim yechildimi?" degan qo'rquv
    tug'diradi. Shuning uchun birinchi safarning O'ZI qaytariladi.
  */
  const duplicate = await findTransactionByIdempotencyKey(userId, input.idempotencyKey);

  if (duplicate?.sourceId) {
    return getRide(userId, duplicate.sourceId);
  }

  /*
    BITTA odam BITTA vaqtda BITTA safar qila oladi.

    Bu tekshiruvsiz mijoz o'nta taksi chaqirib, hamyonidagi pulni
    bloklab qo'yishi va o'nta haydovchini bekorga yugurtirishi
    mumkin edi.
  */
  const active = await prisma.taxiRide.findFirst({
    where: { riderId: userId, status: { in: ACTIVE_STATUSES } },
    select: { id: true },
  });

  if (active) {
    throw new ConflictError('Sizda tugallanmagan safar bor — avval uni yakunlang yoki bekor qiling.');
  }

  /*
    Narx va masofa SERVERDA hisoblanadi.

    Mijozdan kelgan summaga ishonib bo'lmaydi — so'rovni tahrirlab
    butun shaharni 100 so'mga kesib o'tish mumkin bo'lardi.
  */
  const from: Point = { latitude: input.fromLat, longitude: input.fromLng };
  const to: Point = { latitude: input.toLat, longitude: input.toLng };

  const km = routeDistanceKm(from, to);

  if (!isTaxiDistanceAllowed(km)) {
    throw new ValidationError('Bu masofaga taksi chaqirib bo\'lmaydi');
  }

  const fare = calculateTaxiFare(input.tariff, km);
  const wallet = await getOrCreateWallet(userId);

  const created = await prisma.$transaction(async (tx) => {
    const ride = await tx.taxiRide.create({
      data: {
        riderId: userId,
        status: TaxiRideStatus.SEARCHING,
        tariff: input.tariff,
        fromLat: new Prisma.Decimal(input.fromLat),
        fromLng: new Prisma.Decimal(input.fromLng),
        fromAddress: input.fromAddress,
        toLat: new Prisma.Decimal(input.toLat),
        toLng: new Prisma.Decimal(input.toLng),
        toAddress: input.toAddress,
        distanceKm: new Prisma.Decimal(fare.distanceKm),
        priceTiyin: BigInt(fare.priceTiyin),
        driverFeeTiyin: BigInt(fare.driverFeeTiyin),
        idempotencyKey: clientIdempotencyKey(userId, input.idempotencyKey),
      },
      select: { id: true },
    });

    const charge = await chargeWallet(tx, {
      userId,
      walletId: wallet.id,
      amountTiyin: BigInt(fare.priceTiyin),
      description: `Taksi — ${input.toAddress}`,
      sourceModule: MODULE,
      sourceId: ride.id,
      idempotencyKey: clientIdempotencyKey(userId, input.idempotencyKey),
    });

    return tx.taxiRide.update({
      where: { id: ride.id },
      data: { paymentTransactionId: charge.id },
      select: RIDE_SELECT,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.TAXI_RIDE_CREATED,
    resourceType: 'TaxiRide',
    resourceId: created.id,
    module: MODULE,
    metadata: {
      tariff: input.tariff,
      distanceKm: fare.distanceKm.toString(),
      amountTiyin: fare.priceTiyin.toString(),
    },
    ...meta,
  });

  logger.info({ userId, rideId: created.id, tariff: input.tariff }, 'Taksi buyurtma qilindi');

  return toRideView(created);
}

/**
 * Bitta safar — FAQAT egasiga.
 *
 * Egalik so'rovning ichida: begona ID shunchaki "topilmadi"
 * qaytaradi va hech qanday ma'lumot sizmaydi.
 */
export async function getRide(userId: string, rideId: string): Promise<RideView> {
  const row = await prisma.taxiRide.findFirst({
    where: { id: rideId, riderId: userId },
    select: RIDE_SELECT,
  });

  if (!row) throw new NotFoundError('Safar topilmadi');

  return toRideView(row);
}

/** Foydalanuvchining safarlari. */
export async function listRides(
  userId: string,
  query: RideQuery,
): Promise<{ rides: RideView[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  const where: Prisma.TaxiRideWhereInput = {
    riderId: userId,
    ...(query.active ? { status: { in: ACTIVE_STATUSES } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.taxiRide.findMany({
      where,
      select: RIDE_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.taxiRide.count({ where }),
  ]);

  return { rides: rows.map(toRideView), total };
}

/**
 * Mijoz safarni bekor qiladi va pul qaytariladi.
 *
 * Yo'lda (IN_PROGRESS) bekor qilib bo'lmaydi — sabab
 * `taxi.types.ts` dagi `canCancelRide` da yozilgan.
 */
export async function cancelRide(
  userId: string,
  rideId: string,
  input: CancelRideInput,
  meta: OperationMeta = {},
): Promise<RideView> {
  const row = await prisma.taxiRide.findFirst({
    where: { id: rideId, riderId: userId },
    select: { id: true, status: true, priceTiyin: true, driverId: true },
  });

  if (!row) throw new NotFoundError('Safar topilmadi');

  if (!canCancelRide(row.status)) {
    throw new ConflictError(
      row.status === TaxiRideStatus.IN_PROGRESS
        ? "Safar boshlangan — uni haydovchi yakunlaydi."
        : 'Bu safarni bekor qilib bo\'lmaydi.',
    );
  }

  const refundTiyin = tiyinToNumber(row.priceTiyin);

  await prisma.$transaction(async (tx) => {
    /*
      Holat SO'ROV ICHIDA tekshiriladi.

      Yuqoridagi tekshiruvdan keyin, tranzaksiya boshlanguncha
      haydovchi safarni qabul qilib ulgurishi mumkin. `updateMany`
      shartga mos qator topmasa nol qaytaradi va biz to'xtaymiz —
      aks holda ikki marta pul qaytarilardi.
    */
    const updated = await tx.taxiRide.updateMany({
      where: { id: row.id, status: { in: [TaxiRideStatus.SEARCHING, TaxiRideStatus.ACCEPTED, TaxiRideStatus.ARRIVED] } },
      data: {
        status: TaxiRideStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: input.reason ?? null,
      },
    });

    if (updated.count === 0) {
      throw new ConflictError('Safar holati o\'zgardi — sahifani yangilang.');
    }

    const wallet = await getOrCreateWallet(userId);

    await refundWallet(tx, {
      walletId: wallet.id,
      amountTiyin: row.priceTiyin,
      description: 'Taksi bekor qilindi',
      sourceModule: MODULE,
      sourceId: row.id,
      idempotencyKey: `taxi-refund-${row.id}`,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.TAXI_RIDE_CANCELLED,
    resourceType: 'TaxiRide',
    resourceId: row.id,
    module: MODULE,
    metadata: { refundTiyin: refundTiyin.toString(), reason: input.reason ?? null },
    ...meta,
  });

  await notifyUser(userId, 'taxi.ride_cancelled', {
    rideId: row.id,
    refundTiyin,
    byDriver: false,
  });

  logger.info({ userId, rideId: row.id }, 'Taksi bekor qilindi');

  return getRide(userId, row.id);
}

/**
 * Safarni baholaydi.
 *
 * ── Nima uchun baho O'ZGARTIRILMAYDI ──────────────────────────────────
 * Baho bir marta qo'yiladi. Aks holda mijoz haydovchi bilan
 * janjallashib, ertasiga bahoni tushirib qo'yishi mumkin edi —
 * reyting o'sha zahoti ishonchsiz bo'lib qolardi.
 */
export async function rateRide(
  userId: string,
  rideId: string,
  input: RateRideInput,
): Promise<RideView> {
  const row = await prisma.taxiRide.findFirst({
    where: { id: rideId, riderId: userId },
    select: { id: true, status: true, rating: true, driverId: true },
  });

  if (!row) throw new NotFoundError('Safar topilmadi');

  if (row.status !== TaxiRideStatus.COMPLETED) {
    throw new ConflictError('Faqat yakunlangan safarni baholash mumkin.');
  }

  if (row.rating !== null) {
    throw new ConflictError('Bu safar allaqachon baholangan.');
  }

  await prisma.$transaction(async (tx) => {
    /*
      Bahoni ham SHARTLI yozamiz: ikkita so'rov bir vaqtda kelsa,
      ikkinchisi qator topmaydi va haydovchi reytingi ikki marta
      oshib ketmaydi.
    */
    const updated = await tx.taxiRide.updateMany({
      where: { id: row.id, rating: null, status: TaxiRideStatus.COMPLETED },
      data: { rating: input.rating },
    });

    if (updated.count === 0) {
      throw new ConflictError('Bu safar allaqachon baholangan.');
    }

    if (row.driverId) {
      await tx.taxiDriver.update({
        where: { id: row.driverId },
        data: {
          ratingSum: { increment: input.rating },
          ratingCount: { increment: 1 },
        },
      });
    }
  });

  return getRide(userId, row.id);
}

// ---------------------------------------------------------------------------
// Haydovchi tomoni
// ---------------------------------------------------------------------------

const DRIVER_SELECT = {
  id: true,
  carModel: true,
  carColor: true,
  plateNumber: true,
  tariff: true,
  isOnline: true,
  ratingSum: true,
  ratingCount: true,
} as const;

type DriverRow = Prisma.TaxiDriverGetPayload<{ select: typeof DRIVER_SELECT }>;

function toDriverView(row: DriverRow, completedRides: number): DriverProfileView {
  return {
    id: row.id,
    carModel: row.carModel,
    carColor: row.carColor,
    plateNumber: row.plateNumber,
    tariff: row.tariff as TaxiTariffName,
    isOnline: row.isOnline,
    rating: averageRating(row.ratingSum, row.ratingCount),
    ratingCount: row.ratingCount,
    completedRides,
  };
}

/**
 * Haydovchining o'z profilini topadi.
 *
 * O'chirilgan profil topilmaydi: haydovchilikni tashlab ketgan odam
 * qaytadan ro'yxatdan o'tishi kerak.
 */
async function requireDriver(userId: string): Promise<DriverRow> {
  const row = await prisma.taxiDriver.findFirst({
    where: { userId, deletedAt: null },
    select: DRIVER_SELECT,
  });

  if (!row) {
    throw new ForbiddenError("Avval haydovchi profilini to'ldiring.");
  }

  return row;
}

export async function getDriverProfile(userId: string): Promise<DriverProfileView> {
  const row = await requireDriver(userId);

  const completedRides = await prisma.taxiRide.count({
    where: { driverId: row.id, status: TaxiRideStatus.COMPLETED },
  });

  return toDriverView(row, completedRides);
}

/**
 * Haydovchi profilini yaratadi yoki yangilaydi.
 *
 * ── Nima uchun `upsert` emas ──────────────────────────────────────────
 * `upsert` yangi profil yaratilganini AYTMAYDI, biz esa buni bilishimiz
 * kerak: birinchi ro'yxatdan o'tish audit jurnaliga yoziladi, oddiy
 * tahrir esa yozilmaydi.
 */
export async function saveDriverProfile(
  userId: string,
  input: DriverProfileInput,
  meta: OperationMeta = {},
): Promise<DriverProfileView> {
  const existing = await prisma.taxiDriver.findFirst({
    where: { userId },
    select: { id: true, deletedAt: true },
  });

  /*
    Davlat raqami butun tizimda YAGONA. Boshqa haydovchi shu raqam
    bilan turgan bo'lsa, aniq xabar beramiz — aks holda mijoz xom
    baza xatosini ko'rardi.
  */
  const plateOwner = await prisma.taxiDriver.findFirst({
    where: { plateNumber: input.plateNumber, NOT: { userId } },
    select: { id: true },
  });

  if (plateOwner) {
    throw new ConflictError('Bu davlat raqami boshqa haydovchida ro\'yxatdan o\'tgan.');
  }

  const row = existing
    ? await prisma.taxiDriver.update({
        where: { id: existing.id },
        data: { ...input, deletedAt: null },
        select: DRIVER_SELECT,
      })
    : await prisma.taxiDriver.create({
        data: { userId, ...input },
        select: DRIVER_SELECT,
      });

  if (!existing) {
    await recordAudit({
      actorId: userId,
      action: AuditAction.TAXI_DRIVER_REGISTERED,
      resourceType: 'TaxiDriver',
      resourceId: row.id,
      module: MODULE,
      metadata: { plateNumber: input.plateNumber, tariff: input.tariff },
      ...meta,
    });
  }

  const completedRides = await prisma.taxiRide.count({
    where: { driverId: row.id, status: TaxiRideStatus.COMPLETED },
  });

  return toDriverView(row, completedRides);
}

/**
 * Onlayn tugmasi.
 *
 * Oflayn bo'lganda joylashuv ham TOZALANADI: ishdan chiqqan
 * haydovchining oxirgi manzili bazada qolib ketmasligi kerak.
 * Uchala ustun birga tozalanadi — bazadagi CHECK shuni talab qiladi.
 */
export async function setDriverOnline(
  userId: string,
  input: DriverOnlineInput,
): Promise<DriverProfileView> {
  const driver = await requireDriver(userId);

  await prisma.taxiDriver.update({
    where: { id: driver.id },
    data: input.isOnline
      ? { isOnline: true }
      : { isOnline: false, lastLat: null, lastLng: null, locationAt: null },
  });

  return getDriverProfile(userId);
}

/**
 * Haydovchining joylashuvini yozadi.
 *
 * ── Nima uchun IKKI joyga yoziladi ────────────────────────────────────
 * `taxi_drivers` — "yaqinimda mashina bormi" so'rovi uchun; safar
 * yozuvi esa MIJOZNING xaritasi uchun. Ikkinchisisiz mijoz safar
 * tugagandan keyin ham haydovchini kuzatib turardi.
 *
 * Juda noaniq nuqta (500 metrdan katta xato) RAD etiladi: u xaritada
 * mashinani butunlay boshqa ko'chada ko'rsatardi.
 */
export async function reportDriverLocation(
  userId: string,
  input: DriverLocationInput,
): Promise<{ accepted: boolean }> {
  const driver = await requireDriver(userId);

  if (!isAccurateEnough(input.accuracy)) {
    return { accepted: false };
  }

  const now = new Date();
  const lat = new Prisma.Decimal(input.latitude);
  const lng = new Prisma.Decimal(input.longitude);

  await prisma.$transaction([
    prisma.taxiDriver.update({
      where: { id: driver.id },
      data: { lastLat: lat, lastLng: lng, locationAt: now },
    }),
    /*
      Faqat FAOL safarga yoziladi. `updateMany` ishlatiladi, chunki
      faol safar bo'lmasligi ham mumkin — u holda hech narsa
      yangilanmaydi va bu xato emas.
    */
    prisma.taxiRide.updateMany({
      where: {
        driverId: driver.id,
        status: { in: [TaxiRideStatus.ACCEPTED, TaxiRideStatus.ARRIVED, TaxiRideStatus.IN_PROGRESS] },
      },
      data: { driverLat: lat, driverLng: lng, locationAt: now },
    }),
  ]);

  return { accepted: true };
}

/**
 * Yaqin atrofdagi ochiq buyurtmalar.
 *
 * ── Nima uchun masofa DASTURDA hisoblanadi ────────────────────────────
 * PostgreSQL da geografik qidiruv uchun PostGIS kengaytmasi kerak.
 * Uni Neon da yoqish mumkin, lekin bu qo'shimcha bog'liqlik va
 * migratsiya.
 *
 * Bir shaharda bir vaqtda ochiq turgan buyurtmalar soni o'nlab —
 * ularni o'qib, dasturda saralash bir necha millisekund. PostGIS
 * kerak bo'ladigan hajmga yetganda bu funksiya alohida
 * o'zgartiriladi.
 *
 * Baribir `status + createdAt` indeksi bor va faqat SEARCHING
 * qatorlar o'qiladi — butun jadval emas.
 */
export async function listRideOffers(
  userId: string,
  input: RideOffersInput,
): Promise<RideOfferView[]> {
  const driver = await requireDriver(userId);

  const radius = input.radiusKm ?? TAXI_SEARCH_RADIUS_KM;
  const here: Point = { latitude: input.latitude, longitude: input.longitude };

  const rows = await prisma.taxiRide.findMany({
    where: {
      status: TaxiRideStatus.SEARCHING,
      /*
        Haydovchi FAQAT o'z tarifidagi buyurtmalarni ko'radi:
        Ekonom mashina Komfort narxidagi buyurtmani olsa, mijoz
        to'lagan xizmatni olmagan bo'lardi.
      */
      tariff: driver.tariff,
    },
    select: {
      id: true,
      tariff: true,
      fromLat: true,
      fromLng: true,
      fromAddress: true,
      toLat: true,
      toLng: true,
      toAddress: true,
      distanceKm: true,
      driverFeeTiyin: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  return rows
    .map((row) => {
      const pickup: Point = { latitude: toNumber(row.fromLat), longitude: toNumber(row.fromLng) };

      return {
        id: row.id,
        tariff: row.tariff as TaxiTariffName,
        from: {
          latitude: pickup.latitude,
          longitude: pickup.longitude,
          address: row.fromAddress,
        },
        to: {
          latitude: toNumber(row.toLat),
          longitude: toNumber(row.toLng),
          address: row.toAddress,
        },
        distanceKm: toNumber(row.distanceKm),
        driverFeeTiyin: tiyinToNumber(row.driverFeeTiyin),
        pickupDistanceKm: routeDistanceKm(here, pickup),
        createdAt: row.createdAt.toISOString(),
      };
    })
    .filter((offer) => offer.pickupDistanceKm <= radius)
    /* Eng yaqini birinchi: haydovchi eng tez yetadigan buyurtmani ko'radi. */
    .sort((left, right) => left.pickupDistanceKm - right.pickupDistanceKm);
}

/**
 * Haydovchi buyurtmani o'ziga oladi.
 *
 * ── Nima uchun `updateMany` shart bilan ───────────────────────────────
 * Ikki haydovchi bitta buyurtmani BIR VAQTDA bosishi — eng ko'p
 * uchraydigan holat. Oddiy `update` da ikkalasi ham muvaffaqiyat
 * ko'rardi va ikkinchisi birinchisining safarini tortib olardi.
 *
 * `where` ichiga `status: SEARCHING` va `driverId: null` yozilgani
 * uchun ikkinchi so'rov nol qator topadi va rost xabar oladi.
 */
export async function acceptRide(
  userId: string,
  rideId: string,
  meta: OperationMeta = {},
): Promise<RideView> {
  const driver = await requireDriver(userId);

  if (!driver.isOnline) {
    throw new ConflictError("Buyurtma olish uchun avval 'Onlayn' tugmasini yoqing.");
  }

  /*
    Haydovchida boshqa faol safar bo'lmasligi kerak: bitta mashina
    bir vaqtda ikki yo'lovchini olib keta olmaydi.
  */
  const busy = await prisma.taxiRide.findFirst({
    where: { driverId: driver.id, status: { in: ACTIVE_STATUSES } },
    select: { id: true },
  });

  if (busy) {
    throw new ConflictError('Sizda tugallanmagan safar bor.');
  }

  const updated = await prisma.taxiRide.updateMany({
    where: { id: rideId, status: TaxiRideStatus.SEARCHING, driverId: null },
    data: { driverId: driver.id, status: TaxiRideStatus.ACCEPTED, acceptedAt: new Date() },
  });

  if (updated.count === 0) {
    throw new ConflictError('Bu buyurtmani boshqa haydovchi oldi.');
  }

  const ride = await loadDriverRide(driver.id, rideId);

  await recordAudit({
    actorId: userId,
    action: AuditAction.TAXI_RIDE_ACCEPTED,
    resourceType: 'TaxiRide',
    resourceId: rideId,
    module: MODULE,
    metadata: { plateNumber: driver.plateNumber },
    ...meta,
  });

  const rider = await prisma.taxiRide.findFirst({
    where: { id: rideId, driverId: driver.id },
    select: { riderId: true, driver: { select: { user: { select: { firstName: true, lastName: true } } } } },
  });

  if (rider) {
    await notifyUser(rider.riderId, 'taxi.driver_found', {
      rideId,
      driverName: fullName(rider.driver?.user ?? null) ?? 'Haydovchi',
      carModel: driver.carModel,
      carColor: driver.carColor,
      plateNumber: driver.plateNumber,
    });
  }

  logger.info({ userId, rideId, driverId: driver.id }, 'Haydovchi buyurtmani oldi');

  return ride;
}

/**
 * Haydovchining o'z safarini o'qiydi.
 *
 * Egalik so'rovda: `driverId` mos kelmasa "topilmadi" qaytadi.
 */
async function loadDriverRide(driverId: string, rideId: string): Promise<RideView> {
  const row = await prisma.taxiRide.findFirst({
    where: { id: rideId, driverId },
    select: RIDE_SELECT,
  });

  if (!row) throw new NotFoundError('Safar topilmadi');

  return toRideView(row);
}

/**
 * Bosqichni oldinga suradi: yetib keldim → boshladim.
 *
 * ── Nima uchun BITTA funksiya ─────────────────────────────────────────
 * Ikkala amal ham bir xil ishni bajaradi: egalikni tekshirish,
 * hozirgi holatni tekshirish, keyingi holatga o'tish. Ularni
 * alohida yozish o'sha uch qadamni ikki marta takrorlash bo'lardi.
 *
 * O'tishlar jadvali esa bitta joyda ko'rinib turadi va yangi bosqich
 * qo'shish bitta qator.
 */
const DRIVER_TRANSITIONS = {
  ARRIVED: { from: TaxiRideStatus.ACCEPTED, to: TaxiRideStatus.ARRIVED, stamp: 'arrivedAt' },
  START: { from: TaxiRideStatus.ARRIVED, to: TaxiRideStatus.IN_PROGRESS, stamp: 'startedAt' },
} as const;

export type DriverStep = keyof typeof DRIVER_TRANSITIONS;

export async function advanceRide(
  userId: string,
  rideId: string,
  step: DriverStep,
): Promise<RideView> {
  const driver = await requireDriver(userId);
  const move = DRIVER_TRANSITIONS[step];

  const updated = await prisma.taxiRide.updateMany({
    where: { id: rideId, driverId: driver.id, status: move.from },
    data: { status: move.to, [move.stamp]: new Date() },
  });

  if (updated.count === 0) {
    throw new ConflictError('Safar holati mos kelmadi — sahifani yangilang.');
  }

  if (step === 'ARRIVED') {
    const ride = await prisma.taxiRide.findFirst({
      where: { id: rideId, driverId: driver.id },
      select: { riderId: true },
    });

    if (ride) {
      await notifyUser(ride.riderId, 'taxi.driver_arrived', {
        rideId,
        plateNumber: driver.plateNumber,
      });
    }
  }

  return loadDriverRide(driver.id, rideId);
}

/**
 * Safarni yakunlaydi va haydovchiga daromadni yozadi.
 *
 * Mijozdan pul BUYURTMA paytida yechilgan edi — bu yerda faqat
 * haydovchiga to'lanadi. Kalit safar ID'siga bog'langan, ya'ni
 * tugma ikki marta bosilsa ham daromad bir marta yoziladi.
 */
export async function completeRide(
  userId: string,
  rideId: string,
  meta: OperationMeta = {},
): Promise<RideView> {
  const driver = await requireDriver(userId);

  const row = await prisma.taxiRide.findFirst({
    where: { id: rideId, driverId: driver.id },
    select: { id: true, status: true, riderId: true, driverFeeTiyin: true, priceTiyin: true },
  });

  if (!row) throw new NotFoundError('Safar topilmadi');

  if (row.status !== TaxiRideStatus.IN_PROGRESS) {
    throw new ConflictError('Faqat boshlangan safarni yakunlash mumkin.');
  }

  const wallet = await getOrCreateWallet(userId);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.taxiRide.updateMany({
      where: { id: row.id, driverId: driver.id, status: TaxiRideStatus.IN_PROGRESS },
      data: { status: TaxiRideStatus.COMPLETED, completedAt: new Date() },
    });

    if (updated.count === 0) {
      throw new ConflictError('Safar allaqachon yakunlangan.');
    }

    const payout = await creditEarning(tx, {
      walletId: wallet.id,
      amountTiyin: row.driverFeeTiyin,
      description: 'Taksi safari haqi',
      sourceModule: MODULE,
      sourceId: row.id,
      idempotencyKey: `taxi-payout-${row.id}`,
    });

    await tx.taxiRide.update({
      where: { id: row.id },
      data: { payoutTransactionId: payout.id },
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.TAXI_RIDE_COMPLETED,
    resourceType: 'TaxiRide',
    resourceId: row.id,
    module: MODULE,
    metadata: { feeTiyin: row.driverFeeTiyin.toString() },
    ...meta,
  });

  await notifyUser(row.riderId, 'taxi.ride_completed', {
    rideId: row.id,
    amountTiyin: tiyinToNumber(row.priceTiyin),
  });

  logger.info({ userId, rideId: row.id }, 'Safar yakunlandi');

  return loadDriverRide(driver.id, row.id);
}

/**
 * Haydovchi safardan voz kechadi va mijozga pul qaytariladi.
 *
 * ── Nima uchun safar QAYTA taklif qilinmaydi ──────────────────────────
 * Buyurtmani `SEARCHING` ga qaytarish mumkin edi. Lekin o'shanda
 * mijoz kutgan vaqti bekorga ketganini bilmasdan yana kutardi.
 *
 * Bekor qilib, pulni qaytarish rostroq: mijoz darhol xabar oladi va
 * o'zi qayta chaqirishga qaror qiladi.
 */
export async function driverCancelRide(
  userId: string,
  rideId: string,
  input: CancelRideInput,
  meta: OperationMeta = {},
): Promise<RideView> {
  const driver = await requireDriver(userId);

  const row = await prisma.taxiRide.findFirst({
    where: { id: rideId, driverId: driver.id },
    select: { id: true, status: true, riderId: true, priceTiyin: true },
  });

  if (!row) throw new NotFoundError('Safar topilmadi');

  if (!canCancelRide(row.status)) {
    throw new ConflictError('Boshlangan safarni bekor qilib bo\'lmaydi — uni yakunlang.');
  }

  const refundTiyin = tiyinToNumber(row.priceTiyin);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.taxiRide.updateMany({
      where: {
        id: row.id,
        driverId: driver.id,
        status: { in: [TaxiRideStatus.ACCEPTED, TaxiRideStatus.ARRIVED] },
      },
      data: {
        status: TaxiRideStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: input.reason ?? 'Haydovchi bekor qildi',
      },
    });

    if (updated.count === 0) {
      throw new ConflictError('Safar holati o\'zgardi — sahifani yangilang.');
    }

    /*
      Pul MIJOZNING hamyoniga qaytadi, haydovchinikiga emas.
      `row.riderId` ishlatilishi shuning uchun muhim.
    */
    const riderWallet = await getOrCreateWallet(row.riderId);

    await refundWallet(tx, {
      walletId: riderWallet.id,
      amountTiyin: row.priceTiyin,
      description: 'Haydovchi safarni bekor qildi',
      sourceModule: MODULE,
      sourceId: row.id,
      idempotencyKey: `taxi-refund-${row.id}`,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.TAXI_RIDE_CANCELLED,
    resourceType: 'TaxiRide',
    resourceId: row.id,
    module: MODULE,
    metadata: { byDriver: 'true', refundTiyin: refundTiyin.toString() },
    ...meta,
  });

  await notifyUser(row.riderId, 'taxi.ride_cancelled', {
    rideId: row.id,
    refundTiyin,
    byDriver: true,
  });

  return loadDriverRide(driver.id, row.id);
}

/** Haydovchining o'z safarlari — kabinet tarixi uchun. */
export async function listDriverRides(
  userId: string,
  query: RideQuery,
): Promise<{ rides: RideView[]; total: number }> {
  const driver = await requireDriver(userId);
  const { skip, take } = toPrismaPagination(query);

  const where: Prisma.TaxiRideWhereInput = {
    driverId: driver.id,
    ...(query.active ? { status: { in: ACTIVE_STATUSES } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.taxiRide.findMany({
      where,
      select: RIDE_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.taxiRide.count({ where }),
  ]);

  return { rides: rows.map(toRideView), total };
}
