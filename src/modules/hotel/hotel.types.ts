import type { ServiceColor } from '@/config/modules';
import { dateKeyFromToday, toDateKey } from '@/lib/date';
import type { CatalogImageView, CatalogThumb } from '@/modules/catalog/catalog-image.types';

/**
 * Mehmonxona moduli — brauzer tomonidagi turlar va SANA qoidalari.
 *
 * ── Nima uchun sana funksiyalari SHU YERDA ────────────────────────────
 * Kechalar sonini brauzer ham, server ham hisoblaydi: birinchisi
 * narxni ko'rsatish uchun, ikkinchisi haqiqiy summani yozish uchun.
 *
 * Ikki joyda ikki xil hisoblansa, ekranda bitta narx turib, hamyondan
 * boshqasi yechilardi. Shuning uchun hisob BITTA joyda.
 */

export type BookingStatusName = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface HotelRoomView {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  /** Bir kecha narxi — TIYINDA. */
  pricePerNight: number;
  /**
   * Tanlangan sanalarda nechta xona bo'sh.
   *
   * Sana berilmagan bo'lsa `null` — "hali hisoblanmagan" degani.
   * `0` esa "band" degani va bu ikkalasi butunlay boshqa holat.
   */
  availableRooms: number | null;
  /** Xona rasmi. */
  image: CatalogThumb | null;
}

export interface HotelListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  city: string;
  address: string;
  /** Shahar ichidagi tuman. Kiritilmagan bo'lsa `null`. */
  district: string | null;
  /**
   * Xaritadagi joyi. Kiritilmagan bo'lsa `null`.
   *
   * Koordinatasi yo'q mehmonxona XARITADA ko'rsatilmaydi, lekin
   * ro'yxatda qolaveradi: taxminiy nuqta qo'yish mehmonni boshqa
   * ko'chaga yuborardi.
   */
  point: { latitude: number; longitude: number } | null;
  stars: number;
  rating: number;
  ratingCount: number;
  amenities: string[];
  color: ServiceColor;
  /** Eng arzon xona narxi — TIYINDA. Xona bo'lmasa `null`. */
  fromPrice: number | null;
  /** Mehmonxona rasmi. */
  image: CatalogThumb | null;
}

export interface HotelDetail extends HotelListItem {
  rooms: HotelRoomView[];
  /** Batafsil sahifadagi butun galereya. */
  images: CatalogImageView[];
}

export interface BookingView {
  id: string;
  bookingNumber: string;
  status: BookingStatusName;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  pricePerNight: number;
  totalTiyin: number;
  guestName: string;
  guestPhone: string;
  cancelReason: string | null;
  /**
   * Bekor qilishda QAYTARILGAN summa — TIYINDA.
   *
   * ── Nima uchun alohida maydon ───────────────────────────────────────
   * U `totalTiyin` ga TENG BO'LMASLIGI mumkin: kirish kuniga yaqin
   * bekor qilishda ulushi ushlab qolinadi.
   *
   * Uni ekranda qayta hisoblab bo'lmaydi — hisob bekor qilingan
   * KUNGA bog'liq va ertaga boshqacha chiqardi.
   *
   * Bekor qilinmagan bandlovda `null`.
   */
  refund: number | null;
  createdAt: string;
  hotel: { id: string; slug: string; name: string; city: string; address: string; color: ServiceColor };
  room: { id: string; name: string };
}

export interface HotelsResponse {
  hotels: HotelListItem[];
  total: number;
  cities: string[];
  /**
   * Tanlangan shahardagi tumanlar.
   *
   * ── Nima uchun FAQAT tanlangan shaharniki ───────────────────────────
   * Barcha tumanlarni berish mumkin edi, lekin unda Buxoroni
   * tanlagan odamga Toshkent tumanlari ko'rsatilardi. U birortasini
   * tanlashi bilan ro'yxat bo'shab qolardi.
   *
   * Shahar tanlanmagan bo'lsa ro'yxat BO'SH — tuman filtri o'sha
   * paytda umuman ko'rsatilmaydi.
   */
  districts: string[];
}

export interface HotelResponse {
  hotel: HotelDetail;
}

export interface BookingsResponse {
  bookings: BookingView[];
  total: number;
}

export interface BookingResponse {
  booking: BookingView;
}

// ── Sana qoidalari ────────────────────────────────────────────────────

/**
 * Sana kalitlari `@/lib/date` da yashaydi — ular mehmonxonaga xos emas,
 * sayohat moduli ham xuddi shu qoidalar bilan ishlaydi. Bu yerdan qayta
 * chiqariladi, chunki mehmonxona sahifalari ularni shu nom orqali oladi.
 */
export { dateKeyFromToday, toDateKey };

/**
 * Ikki sana orasidagi KECHALAR soni.
 *
 * ── Nima uchun kunlar emas, KECHALAR ──────────────────────────────────
 * Mehmonxona kechalar uchun pul oladi. 7-avgustda kirib 9-avgustda
 * chiqsa — bu 2 kecha, garchi sanalar uchtaga tegsa ham.
 *
 * ── Nima uchun UTC ────────────────────────────────────────────────────
 * Sanalar vaqtsiz saqlanadi (`@db.Date`). Mahalliy vaqtda hisoblansa,
 * Toshkent (UTC+5) da yarim tundan keyin kun bir kunga surilib
 * ketishi mumkin edi.
 */
export function countNights(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${toDateKey(checkIn)}T00:00:00Z`);
  const end = Date.parse(`${toDateKey(checkOut)}T00:00:00Z`);

  if (Number.isNaN(start) || Number.isNaN(end)) return 0;

  const diffMs = end - start;

  return diffMs <= 0 ? 0 : Math.round(diffMs / 86_400_000);
}

/**
 * Bandlovni bekor qilish mumkinmi.
 *
 * ── Nima uchun faqat KIRISHDAN OLDIN ──────────────────────────────────
 * Mehmon kirgandan keyin "bekor qilish" ma'nosini yo'qotadi: xona
 * band bo'lgan, boshqa mehmon sotib ololmagan va mehmonxona
 * xarajat qilgan.
 */
export function canCancelBooking(
  booking: { status: BookingStatusName; checkIn: string },
  today = new Date(),
): boolean {
  if (booking.status !== 'CONFIRMED') return false;

  return toDateKey(booking.checkIn) > toDateKey(today);
}

// ── Ko'rinadigan nomlar ───────────────────────────────────────────────

export const BOOKING_STATUS_LABELS: Record<BookingStatusName, string> = {
  CONFIRMED: 'Band qilindi',
  COMPLETED: "Yashab bo'lingan",
  CANCELLED: 'Bekor qilindi',
};

export const BOOKING_STATUS_VARIANTS: Record<
  BookingStatusName,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary'
> = {
  CONFIRMED: 'success',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
};

/** Yulduzlarni matn ko'rinishida beradi: 4 → "★★★★". */
export function formatStars(stars: number): string {
  return '★'.repeat(Math.max(0, Math.min(5, Math.round(stars))));
}

/** Kechalar sonini o'zbekcha yozadi. */
export function formatNights(nights: number): string {
  return `${nights} kecha`;
}

/**
 * Bandlov TUGAGANMI (chiqish sanasi o'tganmi).
 *
 * ── Nima uchun holat yetarli emas ─────────────────────────────────────
 * Bazada bandlov `CONFIRMED` bo'lib QOLADI: uni `COMPLETED` ga
 * o'tkazadigan fon jarayoni yo'q va u ataylab qilinmagan — holat
 * o'rniga SANA gapiradi. Ro'yxatlar ham shu qoidaga tayanadi.
 *
 * Lekin bu qoidani har joyda qaytadan yozish xatoga olib keldi:
 * hisobni yopish tekshiruvi faqat holatga qaragani uchun, ikki yil
 * oldingi bandlov ham "tugallanmagan buyurtma" bo'lib hisoblanardi va
 * odam hisobini HECH QACHON yopa olmasdi.
 *
 * Shuning uchun qoida bitta joyda turadi.
 */
export function isBookingFinished(
  booking: { status: BookingStatusName; checkOut: string | Date },
  now: Date = new Date(),
): boolean {
  if (booking.status !== 'CONFIRMED') return true;

  const checkOut = toDateKey(booking.checkOut);

  // Chiqish KUNI hali tugamagan — bandlov faol hisoblanadi.
  return checkOut < toDateKey(now);
}
