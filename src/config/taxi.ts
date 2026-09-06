/**
 * Taksi tarifi va chegaralari.
 *
 * ── Nima uchun narxlar SO'MDA yozilgan ────────────────────────────────
 * Bu fayl — biznes qarori, uni dasturchi emas, ilova egasi o'qiydi va
 * o'zgartiradi. Tiyinga o'girish kodda bajariladi (`delivery.ts` dagi
 * bilan bir xil qoida).
 */

import type { Point } from '@/config/delivery-eta';

/**
 * Tarif turlari — bazadagi `TaxiTariff` enum bilan bir xil.
 *
 * Bu yerda faqat NOM va NARX turadi; enum qiymatining o'zi Prisma
 * tomonidan beriladi.
 */
export const TAXI_TARIFFS = {
  ECONOM: {
    label: 'Ekonom',
    description: "Arzon va tez — kundalik yurish uchun",
    /** Mashinaga o'tirish haqi. */
    baseSom: 8_000,
    /** Har kilometr uchun. */
    perKmSom: 2_000,
    /** Kutish vaqti hisobga olinmaydi: MVP da soddalik muhimroq. */
    seats: 4,
  },
  COMFORT: {
    label: 'Komfort',
    description: 'Kengroq va yangiroq mashina',
    baseSom: 15_000,
    perKmSom: 3_000,
    seats: 4,
  },
} as const;

export type TaxiTariffName = keyof typeof TAXI_TARIFFS;

/** Ro'yxat sifatida — ekranda ko'rsatish uchun barqaror tartibda. */
export const TAXI_TARIFF_LIST = (Object.keys(TAXI_TARIFFS) as TaxiTariffName[]).map((name) => ({
  name,
  ...TAXI_TARIFFS[name],
}));

export function isTaxiTariff(value: string): value is TaxiTariffName {
  return value in TAXI_TARIFFS;
}

/**
 * Eng kam safar narxi — SO'MDA.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * 300 metrlik safar formula bo'yicha 8 600 so'm chiqadi. Haydovchi esa
 * o'sha safarga ham keladi, kutadi va yonilg'i yoqadi. Pastki chegara
 * bo'lmasa, qisqa safarlar haydovchi uchun zarar bo'lardi va ular
 * bunday buyurtmalarni qabul qilmay qo'yardi.
 */
export const TAXI_MIN_FARE_SOM = 10_000;

/**
 * Haydovchiga tegadigan ulush — FOIZDA.
 *
 * Qolgani platformaga. `DELIVERY_TARIFF.courierSharePercent` bilan bir
 * xil naqsh: ulush safar yozuviga nusxa qilinadi, ya'ni ertaga foiz
 * o'zgarsa eski safarlar o'zgarmaydi.
 */
export const TAXI_DRIVER_SHARE_PERCENT = 80;

/**
 * Eng uzoq safar — KILOMETRDA.
 *
 * Undan uzog'i shaharlararo yo'l va u boshqacha narxlanadi (Sayohat
 * moduli). Chegarasiz qoldirilsa, xatolik bilan boshqa viloyatga
 * qo'yilgan nuqta million so'mlik buyurtma yaratardi.
 */
export const TAXI_MAX_DISTANCE_KM = 60;

/**
 * Eng qisqa safar — KILOMETRDA.
 *
 * Bundan yaqin joyga taksi chaqirish mantiqsiz: mijoz yetib
 * bo'lguncha piyoda boradi. Nolga teng masofa esa xaritada bir
 * xil nuqta qo'yilganini bildiradi — bu xato.
 */
export const TAXI_MIN_DISTANCE_KM = 0.3;

/**
 * Haydovchi qidiruv radiusi — KILOMETRDA.
 *
 * Bundan uzoqdagi haydovchiga buyurtma ko'rsatilmaydi: u yetib
 * kelguncha mijoz kutib charchaydi.
 */
export const TAXI_SEARCH_RADIUS_KM = 7;

/**
 * O'zbekiston chegaralari — koordinatani tekshirish uchun.
 *
 * ── Nima uchun bu tekshiruv bor ───────────────────────────────────────
 * Brauzerdan kelgan koordinataga ishonib bo'lmaydi. Xato yoki
 * qasddan yuborilgan (0, 0) nuqtasi — Atlantika okeani — masofani
 * ming kilometr qilib ko'rsatardi.
 */
export const UZ_BOUNDS = {
  minLat: 37.1,
  maxLat: 45.7,
  minLng: 55.9,
  maxLng: 73.2,
} as const;

export function isInsideUzbekistan(point: Point): boolean {
  return (
    point.latitude >= UZ_BOUNDS.minLat &&
    point.latitude <= UZ_BOUNDS.maxLat &&
    point.longitude >= UZ_BOUNDS.minLng &&
    point.longitude <= UZ_BOUNDS.maxLng
  );
}

/**
 * Haydovchi joylashuvi necha soniyada bir yuboriladi.
 *
 * Yetkazishdagi 20 soniyadan TEZROQ: taksi mashinada harakatlanadi
 * va 20 soniyada u 300 metr yurib ketadi — xaritadagi belgi
 * sezilarli darajada orqada qolardi.
 */
export const TAXI_LOCATION_REPORT_SECONDS = 8;

/**
 * Haydovchi topilmasa, buyurtma qancha vaqtdan keyin bekor bo'ladi
 * — DAQIQADA.
 *
 * Cheksiz kutish yomon: mijoz ekranni yopib ketadi va buyurtma
 * ro'yxatda abadiy osilib qoladi.
 */
export const TAXI_SEARCH_TIMEOUT_MINUTES = 10;
