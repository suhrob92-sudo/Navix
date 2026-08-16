import type { PostCategoryName } from '@/modules/feed/feed.types';
import type { ReasonCode } from '@/modules/feed/ranking';

/**
 * "Nima uchun buni ko'ryapman?" javobi.
 *
 * ── Nima uchun MATN emas, tuzilma ─────────────────────────────────────
 * Server kod qaytaradi, matnni esa ekran yasaydi. Shu tufayli matnni
 * o'zgartirish uchun server kodini tahrirlash shart emas va ertaga
 * ikkinchi til qo'shilganda ham hech narsa buzilmaydi.
 */
export interface PostReasonView {
  /** Eng kuchli sabab. */
  primary: ReasonCode;
  /** Qolgan sabablar — kuchi bo'yicha tartiblangan. */
  others: ReasonCode[];
  /** Sababga tegishli bo'lim (qiziqish sabablari uchun). */
  category: PostCategoryName | null;
  /** Muallif nomi (obuna va muallif yaqinligi uchun). */
  authorName: string | null;
}

export interface PostReasonResponse {
  reason: PostReasonView;
}
