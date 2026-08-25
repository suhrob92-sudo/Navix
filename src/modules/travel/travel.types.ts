import type { ServiceColor } from '@/config/modules';
import { TRANSPORT_META, TRIP_RULES, type TransportName } from '@/config/travel';
import { isoWeekday, tashkentDateTime } from '@/lib/date';

/**
 * Sayohat moduli — brauzer tomonidagi turlar va CHIPTA qoidalari.
 *
 * ── Nima uchun qoidalar SHU YERDA ─────────────────────────────────────
 * Qaytariladigan summani brauzer ham, server ham hisoblaydi: birinchisi
 * "bekor qilsam nima bo'ladi?" degan savolga javob berish uchun,
 * ikkinchisi haqiqiy pulni qaytarish uchun.
 *
 * Ikki joyda ikki xil hisoblansa, ekranda bitta summa turib, hamyonga
 * boshqasi tushardi. Shuning uchun hisob BITTA joyda.
 */

export type { TransportName };

export type TicketStatusName = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

/**
 * Bitta reys — jadval va sana birikmasi.
 *
 * ── Nima uchun `id` yo'q ──────────────────────────────────────────────
 * Reys bazada alohida qator sifatida saqlanmaydi (sabab
 * `src/config/travel.ts` da). Uni bir qiymatli aniqlaydigan narsa —
 * jadval `scheduleId` va jo'nash sanasi. Manzillarda ham shu ikkisi
 * ishlatiladi: `/travel/<scheduleId>?date=2026-08-10`.
 */
export interface TripView {
  scheduleId: string;
  code: string;
  carrier: string;
  transport: TransportName;
  fromCity: string;
  toCity: string;
  /** Jo'nash sanasi: `2026-08-10`. */
  departDate: string;
  /** Jo'nash va yetib borish payti — ISO ko'rinishida. */
  departAt: string;
  arriveAt: string;
  durationMinutes: number;
  /** Bir o'rin narxi — TIYINDA. */
  priceTiyin: number;
  totalSeats: number;
  availableSeats: number;
  /**
   * Shu kunga band qilingan o'rin raqamlari.
   *
   * Xaritada ular tanlab bo'lmaydigan qilib ko'rsatiladi.
   */
  takenSeats: string[];
  /**
   * Sotilgan o'rinlarning umumiy SONI.
   *
   * `takenSeats.length` dan KATTA bo'lishi mumkin: eski chiptalarda
   * o'rin raqami saqlanmagan. Farqi ekranda ochiq aytiladi.
   */
  soldSeats: number;
}

export interface TicketView {
  id: string;
  ticketNumber: string;
  status: TicketStatusName;
  departDate: string;
  departAt: string;
  arriveAt: string;
  seats: number;
  /**
   * Tanlangan o'rin raqamlari: ["12A", "12B"].
   *
   * ── Nima uchun BO'SH bo'lishi mumkin ────────────────────────────────
   * O'rin tanlash 51-bosqichda qo'shildi. Undan oldingi chiptalarda
   * faqat SONI yozilgan va qaysi o'rin ekani hech qayerda
   * saqlanmagan.
   *
   * Bo'sh ro'yxat "o'rin yo'q" degani emas — "qaysi biri ekani
   * ma'lum emas" degani. Ekranda ham shunday aytiladi.
   */
  seatNumbers: string[];
  /** Summalar — TIYINDA. */
  pricePerSeat: number;
  totalTiyin: number;
  /** Bekor qilinganda qaytarilgan summa. Bekor qilinmagan bo'lsa `null`. */
  refundTiyin: number | null;
  passengerName: string;
  passengerPhone: string;
  cancelReason: string | null;
  createdAt: string;
  trip: {
    scheduleId: string;
    code: string;
    carrier: string;
    transport: TransportName;
    fromCity: string;
    toCity: string;
  };
}

export interface TripsResponse {
  trips: TripView[];
  total: number;
  cities: string[];
}

export interface TripResponse {
  trip: TripView;
}

export interface TicketsResponse {
  tickets: TicketView[];
  total: number;
}

export interface TicketResponse {
  ticket: TicketView;
}

// ── Reys vaqti ────────────────────────────────────────────────────────

/**
 * Jadvaldagi reys shu sanada qatnaydimi.
 *
 * Aviareyslar odatda har kuni uchmaydi, shuning uchun jadvalda hafta
 * kunlari ro'yxati saqlanadi.
 */
export function runsOnDate(weekdays: readonly number[], dateKey: string): boolean {
  return weekdays.includes(isoWeekday(dateKey));
}

/** Jo'nash payti — Toshkent vaqtidagi sana va soatdan. */
export function departureAt(dateKey: string, departTime: string): Date {
  return tashkentDateTime(dateKey, departTime);
}

/** Yetib borish payti — jo'nash vaqti ustiga yo'l davomiyligi. */
export function arrivalAt(departAt: Date, durationMinutes: number): Date {
  return new Date(departAt.getTime() + durationMinutes * 60_000);
}

// ── Chipta qoidalari ──────────────────────────────────────────────────

/**
 * Chiptani bekor qilish mumkinmi.
 *
 * Faqat JO'NASHDAN OLDIN: reys ketgandan keyin "bekor qilish" ma'nosini
 * yo'qotadi — o'rin band bo'lgan va boshqa yo'lovchi uni sotib
 * ololmagan.
 */
export function canCancelTicket(
  ticket: { status: TicketStatusName; departAt: string | Date },
  now: Date = new Date(),
): boolean {
  if (ticket.status !== 'CONFIRMED') return false;

  const depart = typeof ticket.departAt === 'string' ? new Date(ticket.departAt) : ticket.departAt;

  return depart.getTime() > now.getTime();
}

/**
 * Bekor qilishda qancha pul qaytadi.
 *
 * ── Nima uchun ikki bosqichli ─────────────────────────────────────────
 * Jo'nashga bir kundan ko'p vaqt bo'lsa, tashuvchi o'rinni boshqa
 * yo'lovchiga sotib ulguradi — zarar yo'q, pul to'liq qaytadi.
 * Kech bekor qilinsa o'rin bo'sh ketadi, shuning uchun jarima
 * ushlanadi.
 *
 * ── Nima uchun `BigInt` ───────────────────────────────────────────────
 * Pul har doim tiyinda va butun sonda. Foiz hisoblashda bo'linma
 * PASTGA yaxlitlanadi (`BigInt` bo'linishi shunday ishlaydi): tiyinning
 * yarmi paydo bo'lib qolmaydi va qaytariladigan summa hech qachon
 * to'langanidan oshmaydi.
 *
 * @param departAt Jo'nash payti — reys ketganidan keyin `0` qaytadi.
 */
export function calculateRefundTiyin(totalTiyin: bigint, departAt: string | Date, now: Date = new Date()): bigint {
  const depart = typeof departAt === 'string' ? new Date(departAt) : departAt;
  const remainingMs = depart.getTime() - now.getTime();

  if (remainingMs <= 0) return 0n;

  if (remainingMs >= TRIP_RULES.fullRefundHours * 3_600_000) return totalTiyin;

  return (totalTiyin * BigInt(TRIP_RULES.lateRefundPercent)) / 100n;
}

// ── Ko'rinadigan nomlar ───────────────────────────────────────────────

export const TICKET_STATUS_LABELS: Record<TicketStatusName, string> = {
  CONFIRMED: 'Chipta olindi',
  COMPLETED: "Safar bo'ldi",
  CANCELLED: 'Bekor qilindi',
};

export const TICKET_STATUS_VARIANTS: Record<
  TicketStatusName,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary'
> = {
  CONFIRMED: 'success',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
};

/** Transport turining o'zbekcha nomi. */
export function transportLabel(transport: TransportName): string {
  return TRANSPORT_META[transport].label;
}

/** Transport turiga mos rang. */
export function transportColor(transport: TransportName): ServiceColor {
  return TRANSPORT_META[transport].color;
}

/**
 * Yo'l davomiyligini odam tilida yozadi: 130 → "2 soat 10 daqiqa".
 *
 * Soat nol bo'lsa faqat daqiqa, daqiqa nol bo'lsa faqat soat
 * ko'rsatiladi — "3 soat 0 daqiqa" g'aliz eshitiladi.
 */
export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;

  if (hours === 0) return `${rest} daqiqa`;
  if (rest === 0) return `${hours} soat`;

  return `${hours} soat ${rest} daqiqa`;
}

/** O'rinlar sonini yozadi: 2 → "2 o'rin". */
export function formatSeats(seats: number): string {
  return `${seats} o'rin`;
}

/**
 * Bekor qilish shartini foydalanuvchiga tushuntiradi.
 *
 * Matn chipta olishdan OLDIN ko'rsatiladi, shuning uchun u shart
 * qo'yilgan sonlardan avtomatik yasaladi — qoida o'zgarsa matn ham
 * o'zgaradi va ular bir-biriga zid bo'lib qolmaydi.
 */
export function refundPolicyText(): string {
  return (
    `Jo'nashgacha ${TRIP_RULES.fullRefundHours} soatdan ko'p vaqt bo'lsa, pul to'liq qaytariladi. ` +
    `Kechroq bekor qilinsa — ${TRIP_RULES.lateRefundPercent}%.`
  );
}

/**
 * Sana kalitlari — sahifalar shu nom orqali oladi.
 *
 * "Bugungi reys allaqachon ketganmi?" degan savolga sana kaliti bilan
 * javob berilmaydi: u faqat KUNNI biladi, soatni emas. Tekshiruv
 * haqiqiy jo'nash payti bo'yicha qilinadi (`departureAt`).
 */
export { dateKeyFromToday, toDateKey } from '@/lib/date';

/**
 * Chipta TUGAGANMI (reys jo'nab ketganmi).
 *
 * `isBookingFinished` bilan bir xil sabab: bazada chipta `CONFIRMED`
 * bo'lib qoladi va "safar bo'ldimi" degan savolga faqat SANA javob
 * beradi. Qoida bitta joyda saqlanadi.
 */
export function isTicketFinished(
  ticket: { status: TicketStatusName; departAt: string | Date },
  now: Date = new Date(),
): boolean {
  if (ticket.status !== 'CONFIRMED') return true;

  const depart = typeof ticket.departAt === 'string' ? new Date(ticket.departAt) : ticket.departAt;

  return depart.getTime() <= now.getTime();
}
