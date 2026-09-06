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

export interface DriverProfileResponse {
  driver: DriverProfileView;
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
