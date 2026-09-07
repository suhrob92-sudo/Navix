import type { TaxiTariffName } from '@/config/taxi';

/**
 * Taksi moduli — brauzer tomonidagi turlar.
 *
 * ── Nima uchun Prisma turlari to'g'ridan-to'g'ri ishlatilmaydi ────────
 * Prisma turlarida `BigInt` va `Decimal` bor — ular JSON ga
 * o'girilmaydi. Ustiga, bazadagi ustunlarning hammasi ekranga
 * chiqmaydi: `payoutTransactionId` mijozga umuman kerak emas va uni
 * yubormaslik — ma'lumot sizib chiqishining oldini olish.
 */

export type TaxiRideStatusName =
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

/** Xaritadagi bitta nuqta va uning nomi. */
export interface RidePlace {
  latitude: number;
  longitude: number;
  address: string;
}

/**
 * Haydovchi haqida mijoz KO'RADIGAN ma'lumot.
 *
 * ── Nima uchun telefon faqat shu yerda ────────────────────────────────
 * Telefon raqami — nozik ma'lumot. U safar boshlanganidan keyin
 * beriladi: mijoz haydovchiga "men ko'k darvoza oldidaman" deb
 * qo'ng'iroq qilishi kerak.
 *
 * Buyurtma hali qidiruvda bo'lganda bu obyektning o'zi `null`
 * bo'ladi — ya'ni hech qanday haydovchi ma'lumoti yuborilmaydi.
 */
export interface RideDriverView {
  name: string | null;
  phone: string;
  carModel: string;
  carColor: string;
  plateNumber: string;
  /** O'rtacha baho — hali baholanmagan bo'lsa `null`. */
  rating: number | null;
  /** Nechta safar baholangan — reyting ishonchliligini ko'rsatadi. */
  ratingCount: number;
}

export interface RideView {
  id: string;
  status: TaxiRideStatusName;
  tariff: TaxiTariffName;

  from: RidePlace;
  to: RidePlace;

  distanceKm: number;
  /** Mijoz to'laydigan summa — TIYINDA. */
  priceTiyin: number;

  driver: RideDriverView | null;

  /**
   * Yo'lovchi — HAYDOVCHI uchun.
   *
   * Haydovchi manzilda mijozni topa olmasa qo'ng'iroq qiladi. Mijoz
   * o'z safarini ochganda bu yerda o'z raqamini ko'radi — bu
   * zararsiz va alohida shart yozishga arzimaydi.
   *
   * Buyurtmani hali OLMAGAN haydovchi bu ma'lumotni ko'rmaydi:
   * ochiq buyurtmalar ro'yxati boshqa maydonlarni qaytaradi.
   */
  rider: { name: string | null; phone: string };

  /**
   * Haydovchining oxirgi joylashuvi — xarita uchun.
   *
   * `null` bo'lishi mumkin: haydovchi kuzatuvni yoqmagan bo'lsa.
   * Bunday holatda ekran xarita o'rniga holat matnini ko'rsatadi.
   */
  driverLocation: { latitude: number; longitude: number; reportedAt: string } | null;

  rating: number | null;
  cancelReason: string | null;

  createdAt: string;
  acceptedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

/** Haydovchi ko'radigan ochiq buyurtma. */
export interface RideOfferView {
  id: string;
  tariff: TaxiTariffName;
  from: RidePlace;
  to: RidePlace;
  distanceKm: number;
  /** Haydovchiga tegadigan summa — TIYINDA. */
  driverFeeTiyin: number;
  /** Haydovchidan olish nuqtasigacha — KILOMETRDA. */
  pickupDistanceKm: number;
  createdAt: string;
}

export interface DriverProfileView {
  id: string;
  carModel: string;
  carColor: string;
  plateNumber: string;
  tariff: TaxiTariffName;
  isOnline: boolean;
  rating: number | null;
  ratingCount: number;
  /** Jami yakunlangan safarlar. */
  completedRides: number;
}

export interface TaxiQuoteOption {
  tariff: TaxiTariffName;
  label: string;
  description: string;
  seats: number;
  priceTiyin: number;
  /** Taxminiy safar vaqti — DAQIQADA. */
  minutes: number;
}

export interface TaxiQuote {
  distanceKm: number;
  options: TaxiQuoteOption[];
}

export interface TaxiQuoteResponse {
  quote: TaxiQuote;
}

export interface RideResponse {
  ride: RideView;
}

export interface RidesResponse {
  rides: RideView[];
  total: number;
}

export interface RideOffersResponse {
  offers: RideOfferView[];
}

/**
 * `driver` NULL bo'lishi mumkin: haydovchi hali profilini
 * to'ldirmagan. Bu xato emas — kabinetning birinchi qadami.
 */
export interface DriverProfileResponse {
  driver: DriverProfileView | null;
}

/**
 * ULASHILGAN safar — havola orqali ochiladigan ko'rinish.
 *
 * ── Nima uchun `RideView` dan ALOHIDA ─────────────────────────────────
 * Havolani olgan odam KIRMAGAN bo'lishi mumkin — u shunchaki
 * "yaxshi yetib bordingmi?" deb kuzatayotgan qarindosh yoki do'st.
 *
 * `RideView` da esa yo'lovchining telefon raqami, narx va safar
 * ID'si bor. Ularni havolaga qo'yish — nozik ma'lumotni butun
 * internetga ochish demak.
 *
 * Shuning uchun bu tur ATAYLAB kambag'al: unda faqat kuzatish
 * uchun zarur narsa bor.
 *
 * QO'SHILMAGAN va qo'shilmasligi kerak:
 *  · yo'lovchining ismi va telefoni — u kuzatuvchiga allaqachon ma'lum;
 *  · haydovchining telefoni — begona odamga bermaymiz;
 *  · narx — bu shaxsiy moliyaviy ma'lumot;
 *  · safar ID'si — u ilova ichida ishlatiladi.
 */
export interface SharedRideView {
  status: TaxiRideStatusName;

  from: RidePlace;
  to: RidePlace;

  /** Haydovchi — mashinani tanish uchun. Telefon YO'Q. */
  driver: {
    name: string | null;
    carModel: string;
    carColor: string;
    plateNumber: string;
  } | null;

  /**
   * Haydovchining joylashuvi — FAQAT safar davom etayotganda.
   *
   * Safar tugagach `null` bo'ladi: yakunlangan safarni kuzatishning
   * ma'nosi yo'q va haydovchining keyingi harakati begona odamga
   * tegishli emas.
   */
  driverLocation: { latitude: number; longitude: number; reportedAt: string } | null;

  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface SharedRideResponse {
  ride: SharedRideView;
}

export interface RideShareResponse {
  /** To'liq havola — ulashishga tayyor. */
  url: string;
}

/**
 * Safar hali davom etyaptimi.
 *
 * Bitta joyda aniqlanadi: ekran ham, xizmat ham shu funksiyaga
 * tayanadi. Ikkita ro'yxat bo'lsa, ular ertaga bir-biridan
 * ajralib qolardi.
 */
export function isRideActive(status: TaxiRideStatusName): boolean {
  return status === 'SEARCHING' || status === 'ACCEPTED' || status === 'ARRIVED' || status === 'IN_PROGRESS';
}

/**
 * Mijoz safarni bekor qila oladimi.
 *
 * ── Nima uchun yo'lda bekor qilib bo'lmaydi ───────────────────────────
 * Yo'lovchi allaqachon mashinada va harakatda. "Bekor qilish" bu
 * yerda "meni shu yerda tushiring" degani — bu boshqa amal va u
 * haydovchining tugmasi (safarni yakunlash) orqali bajariladi.
 *
 * Aks holda mijoz manzilga yetib borib, bekor tugmasini bosib,
 * bepul yurib ketardi.
 */
export function canCancelRide(status: TaxiRideStatusName): boolean {
  return status === 'SEARCHING' || status === 'ACCEPTED' || status === 'ARRIVED';
}

/** Safarni baholash mumkinmi — faqat yakunlangan va hali baholanmagan. */
export function canRateRide(ride: Pick<RideView, 'status' | 'rating'>): boolean {
  return ride.status === 'COMPLETED' && ride.rating === null;
}

/** Holatning odam o'qiydigan nomi. */
export const RIDE_STATUS_LABEL: Readonly<Record<TaxiRideStatusName, string>> = {
  SEARCHING: 'Haydovchi qidirilmoqda',
  ACCEPTED: 'Haydovchi yo\'lda',
  ARRIVED: 'Haydovchi yetib keldi',
  IN_PROGRESS: 'Safar davom etmoqda',
  COMPLETED: 'Yakunlandi',
  CANCELLED: 'Bekor qilindi',
};
