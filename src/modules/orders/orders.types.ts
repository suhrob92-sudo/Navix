import type { ServiceColor } from '@/config/modules';

/**
 * YAGONA buyurtmalar tarixi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Super-ilovaning butun ma'nosi — hamma narsa bir joyda. Buyurtmalar
 * esa beshta bo'limga tarqoq edi: ovqat, Marketplace, mehmonxona,
 * chiptalar va posilkalar. "Kecha nima buyurtma qilgan edim?" degan
 * oddiy savolga javob topish uchun beshta sahifani aylanib chiqish
 * kerak bo'lardi.
 *
 * ── Nima uchun UMUMIY tur ─────────────────────────────────────────────
 * Har bir modulning o'z holatlari, o'z summalari va o'z maydonlari
 * bor. Ularni bitta ro'yxatda ko'rsatish uchun umumiy "eng kichik
 * ko'rinish" kerak: nima, qachon, qancha, qanday holatda.
 *
 * Batafsil ma'lumot esa modulning O'Z sahifasida qoladi — u yerda
 * taomlar ro'yxati, xona nomi yoki reys vaqti bor. Hammasini bu yerga
 * yig'ish ro'yxatni o'qib bo'lmas holga keltirardi.
 */

export type OrderKind = 'FOOD' | 'MARKET' | 'HOTEL' | 'TRAVEL' | 'PARCEL';

/** Nishon rangi — `Badge` komponenti bilan bir xil. */
export type OrderBadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'secondary';

export interface UnifiedOrder {
  /** Modul ichidagi ID — havola yasash uchun. */
  id: string;
  kind: OrderKind;
  /** Foydalanuvchi ko'radigan raqam: NVX-F-20260812-A1B2. */
  number: string;
  /** Asosiy satr: restoran, do'kon, mehmonxona nomi yoki yo'nalish. */
  title: string;
  /** Qo'shimcha satr: nechta narsa, qaysi shahar, necha kecha. */
  subtitle: string;
  /** Umumiy summa — TIYINDA. */
  totalTiyin: number;
  statusLabel: string;
  statusVariant: OrderBadgeVariant;
  /**
   * Buyurtma YAKUNLANGANMI.
   *
   * "Faol" va "tarix" filtrlari shu maydonga tayanadi. Har modulda
   * yakunlanish boshqacha nomlanadi (yetkazildi / yashab bo'lingan /
   * safar bo'ldi), shuning uchun qaror manbada qabul qilinadi.
   */
  isFinished: boolean;
  createdAt: string;
  /** Batafsil sahifa manzili. */
  href: string;
}

export interface OrdersResponse {
  orders: UnifiedOrder[];
  total: number;
  /** Har bir tur bo'yicha soni — filtr tugmalarida ko'rsatiladi. */
  counts: Record<OrderKind, number>;
}

// ── Ko'rinadigan matnlar ──────────────────────────────────────────────

export interface OrderKindMeta {
  label: string;
  color: ServiceColor;
}

/**
 * Tur nomi va rangi.
 *
 * Rang modulning o'z rangi bilan bir xil: odam ro'yxatda matnni
 * o'qimasdan, rang bo'yicha "bu ovqat, bu chipta" deb ajratadi.
 */
export const ORDER_KIND_META: Record<OrderKind, OrderKindMeta> = {
  FOOD: { label: 'Ovqat', color: 'rose' },
  MARKET: { label: 'Marketplace', color: 'blue' },
  HOTEL: { label: 'Mehmonxona', color: 'violet' },
  TRAVEL: { label: 'Chipta', color: 'sky' },
  PARCEL: { label: 'Posilka', color: 'pink' },
};

/** Ro'yxat filtrlari. */
export const ORDER_FILTERS = [
  { value: 'ALL', label: 'Barchasi' },
  { value: 'ACTIVE', label: 'Faol' },
  { value: 'FINISHED', label: 'Yakunlangan' },
] as const;

export type OrderFilter = (typeof ORDER_FILTERS)[number]['value'];

/** Bo'sh ro'yxatda ko'rsatiladigan matn. */
export function emptyOrdersText(filter: OrderFilter, kind: OrderKind | 'ALL'): string {
  if (kind !== 'ALL') return `${ORDER_KIND_META[kind].label} bo'yicha buyurtma yo'q.`;
  if (filter === 'ACTIVE') return "Hozircha faol buyurtma yo'q.";
  if (filter === 'FINISHED') return "Yakunlangan buyurtma yo'q.";

  return "Hali buyurtma bermagansiz.";
}
