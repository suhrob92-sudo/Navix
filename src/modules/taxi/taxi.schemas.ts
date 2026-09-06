import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';
import { TAXI_MAX_DISTANCE_KM, UZ_BOUNDS } from '@/config/taxi';

/**
 * Taksi so'rovlari uchun validatsiya.
 *
 * ── Bosh qoida: NARX MIJOZDAN KELMAYDI ────────────────────────────────
 * So'rovda summa yo'q va bo'lmasligi ham kerak. U serverda, tarif va
 * masofa bo'yicha qayta hisoblanadi.
 *
 * Aks holda so'rovni tahrirlab, butun shaharni 100 so'mga kesib
 * o'tish mumkin bo'lardi. Bu — Marketplace va Posilkadagi bilan bir
 * xil qoida.
 */

/**
 * Koordinata O'ZBEKISTON ichida bo'lishi shart.
 *
 * ── Nima uchun -90..90 yetarli emas ───────────────────────────────────
 * Brauzerdan kelgan koordinataga ishonib bo'lmaydi. Xato yoki qasddan
 * yuborilgan (0, 0) — Atlantika okeanidagi nuqta — dunyoning yarmiga
 * teng masofa hisoblab, million so'mlik buyurtma yaratardi.
 *
 * Chegara `config/taxi.ts` da: u biznes qarori, validatsiya emas.
 */
const latitudeSchema = z.coerce
  .number({ message: "Kenglik raqam bo'lishi kerak" })
  .min(UZ_BOUNDS.minLat, "Nuqta O'zbekistondan tashqarida")
  .max(UZ_BOUNDS.maxLat, "Nuqta O'zbekistondan tashqarida");

const longitudeSchema = z.coerce
  .number({ message: "Uzunlik raqam bo'lishi kerak" })
  .min(UZ_BOUNDS.minLng, "Nuqta O'zbekistondan tashqarida")
  .max(UZ_BOUNDS.maxLng, "Nuqta O'zbekistondan tashqarida");

/**
 * Manzil matni.
 *
 * Posilkadagi 10 belgilik chegaradan YUMSHOQROQ: taksida manzil
 * xaritadan tanlanadi va "Chorsu" kabi qisqa nom ham to'g'ri
 * javob. Kuryerga esa uy raqamigacha kerak edi.
 */
const addressTextSchema = z
  .string()
  .trim()
  .min(2, 'Manzilni yozing')
  .max(255, 'Manzil juda uzun');

const tariffSchema = z.enum(['ECONOM', 'COMFORT', 'BUSINESS'], { message: 'Tarifni tanlang' });

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, 'Kalit juda qisqa')
  .max(100, 'Kalit juda uzun')
  .regex(/^[A-Za-z0-9_-]+$/, "Kalitda faqat harf, raqam, '-' va '_' ishlatiladi");

/** Narx hisoblash — GET /api/v1/taxi/quote */
export const taxiQuoteSchema = z.object({
  fromLat: latitudeSchema,
  fromLng: longitudeSchema,
  toLat: latitudeSchema,
  toLng: longitudeSchema,
});

export type TaxiQuoteInput = z.infer<typeof taxiQuoteSchema>;

/** Safar buyurtma qilish — POST /api/v1/taxi/rides */
export const createRideSchema = z.object({
  tariff: tariffSchema,
  fromLat: latitudeSchema,
  fromLng: longitudeSchema,
  fromAddress: addressTextSchema,
  toLat: latitudeSchema,
  toLng: longitudeSchema,
  toAddress: addressTextSchema,
  /**
   * Takroriy bosishdan himoya.
   *
   * Ixtiyoriy emas: taksi buyurtmasi PUL yechadi va tarmoq uzilganda
   * mijoz tugmani ikkinchi marta bosadi. Kalitsiz ikkinchi safar
   * yaratilardi va undan ikkinchi marta pul yechilardi.
   */
  idempotencyKey: idempotencyKeySchema,
});

export type CreateRideInput = z.infer<typeof createRideSchema>;

/** Safarni bekor qilish — POST /api/v1/taxi/rides/{id}/cancel */
export const cancelRideSchema = z.object({
  reason: z.string().trim().max(255, 'Sabab juda uzun').optional(),
});

export type CancelRideInput = z.infer<typeof cancelRideSchema>;

/** Safarni baholash — POST /api/v1/taxi/rides/{id}/rate */
export const rateRideSchema = z.object({
  rating: z.coerce
    .number({ message: 'Bahoni tanlang' })
    .int('Baho butun son')
    .min(1, 'Eng kami 1 yulduz')
    .max(5, "Eng ko'pi 5 yulduz"),
});

export type RateRideInput = z.infer<typeof rateRideSchema>;

/** Safarlar ro'yxati — GET /api/v1/taxi/rides */
export const rideQuerySchema = paginationQuerySchema.extend({
  /** Faqat tugallanmagan safarlar. */
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type RideQuery = z.infer<typeof rideQuerySchema>;

/**
 * Haydovchi profilini yaratish yoki yangilash —
 * PUT /api/v1/taxi/driver.
 */
export const driverProfileSchema = z.object({
  carModel: z.string().trim().min(2, 'Mashina rusumini yozing').max(60, 'Juda uzun'),
  carColor: z.string().trim().min(2, 'Rangni yozing').max(30, 'Juda uzun'),
  /**
   * Davlat raqami — bo'shliqsiz va katta harfda saqlanadi.
   *
   * "01 A 777 AA" va "01A777AA" — bitta mashina. Tozalanmasa, ular
   * ikki xil yozuv bo'lib, `@unique` cheklovi ishlamay qolardi.
   */
  plateNumber: z
    .string()
    .trim()
    .min(5, "Raqamni to'liq yozing")
    .max(20, 'Raqam juda uzun')
    .transform((value) => value.replace(/\s+/g, '').toUpperCase())
    .refine((value) => /^[A-Z0-9]+$/.test(value), 'Raqamda faqat harf va raqam bo\'ladi'),
  tariff: tariffSchema,
});

export type DriverProfileInput = z.infer<typeof driverProfileSchema>;

/** Onlayn tugmasi — PATCH /api/v1/taxi/driver */
export const driverOnlineSchema = z.object({
  isOnline: z.boolean({ message: "Holat 'true' yoki 'false' bo'lishi kerak" }),
});

export type DriverOnlineInput = z.infer<typeof driverOnlineSchema>;

/**
 * Joylashuv yuborish — POST /api/v1/taxi/driver/location.
 *
 * `accuracy` ixtiyoriy: eski telefonlar uni bermaydi. Kelganda esa
 * juda noaniq nuqta rad etiladi (`isAccurateEnough`).
 */
export const driverLocationSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  accuracy: z.coerce.number().min(0).max(100_000).nullable().optional(),
});

export type DriverLocationInput = z.infer<typeof driverLocationSchema>;

/**
 * Yaqin atrofdagi ochiq buyurtmalar — GET /api/v1/taxi/driver/offers.
 *
 * ── Nima uchun koordinata IXTIYORIY ───────────────────────────────────
 * Ilgari u majburiy edi va bu ekranni boshi berk ko'chaga olib
 * kelgandi: buyurtmalar sahifasida joylashuv so'raydigan tugma yo'q,
 * shuning uchun brauzer ruxsat so'ramasdi va sahifa abadiy
 * "joylashuv kutilmoqda" deb turardi.
 *
 * Endi koordinata berilmasa, SERVER haydovchining oxirgi ma'lum
 * nuqtasini ishlatadi — u kabinetdagi kuzatuvdan yozilgan. Ya'ni
 * bitta kuzatuv ikkala ekranga xizmat qiladi va telefon batareyasi
 * ikki marta sarflanmaydi.
 */
export const rideOffersSchema = z.object({
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  radiusKm: z.coerce.number().min(1).max(TAXI_MAX_DISTANCE_KM).optional(),
});

export type RideOffersInput = z.infer<typeof rideOffersSchema>;
