import type { ServiceColor } from '@/config/modules';

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
}

export interface HotelListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  city: string;
  address: string;
  stars: number;
  rating: number;
  ratingCount: number;
  amenities: string[];
  color: ServiceColor;
  /** Eng arzon xona narxi — TIYINDA. Xona bo'lmasa `null`. */
  fromPrice: number | null;
}

export interface HotelDetail extends HotelListItem {
  rooms: HotelRoomView[];
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
  createdAt: string;
  hotel: { id: string; slug: string; name: string; city: string; address: string; color: ServiceColor };
  room: { id: string; name: string };
}

export interface HotelsResponse {
  hotels: HotelListItem[];
  total: number;
  cities: string[];
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

/** Sana kalitini beradi: `2026-08-07`. */
export function toDateKey(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

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

/** Bugundan boshlab `days` kun keyingi sana kaliti. */
export function dateKeyFromToday(days: number, today: Date = new Date()): string {
  const base = Date.parse(`${toDateKey(today)}T00:00:00Z`);

  return toDateKey(new Date(base + days * 86_400_000));
}

/**
 * Bandlovni bekor qilish mumkinmi.
 *
 * ── Nima uchun faqat KIRISHDAN OLDIN ──────────────────────────────────
 * Mehmon kirgandan keyin "bekor qilish" ma'nosini yo'qotadi: xona
 * band bo'lgan, boshqa mehmon sotib ololmagan va mehmonxona
 * xarajat qilgan.
 */
export function canCancelBooking(booking: { status: BookingStatusName; checkIn: string }, today = new Date()): boolean {
  if (booking.status !== 'CONFIRMED') return false;

  return toDateKey(booking.checkIn) > toDateKey(today);
}

// ── Ko'rinadigan nomlar ───────────────────────────────────────────────

export const BOOKING_STATUS_LABELS: Record<BookingStatusName, string> = {
  CONFIRMED: 'Band qilindi',
  COMPLETED: 'Yashab bo\'lingan',
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
