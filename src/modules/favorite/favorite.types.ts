import type { FavoriteTarget } from '@/config/favorite';
import type { CatalogThumb } from '@/modules/catalog/catalog-image.types';

/**
 * Sevimlilar — brauzer va server uchun umumiy turlar.
 */

/**
 * Sevimlilar ro'yxatidagi bitta yozuv.
 *
 * ── Nima uchun UMUMIY shakl ───────────────────────────────────────────
 * Mahsulot, taom, mehmonxona va vakansiya bir-biridan juda farq
 * qiladi: birida zaxira bor, birida maosh, birida yulduzlar.
 *
 * Lekin RO'YXATDA ularning hammasi bir xil ko'rinadi: rasm, nom,
 * bitta qator izoh va narx. Shuning uchun ular umumiy shaklga
 * keltiriladi va sahifa beshta boshqa-boshqa kartochka chizishga
 * majbur bo'lmaydi.
 */
export interface FavoriteItem {
  id: string;
  target: FavoriteTarget;
  targetId: string;
  name: string;
  /** Ilova ichidagi manzil — bosilganda o'sha sahifaga olib boradi. */
  href: string;
  /** Bitta qator izoh: do'kon nomi, shahar yoki kompaniya. */
  subtitle: string | null;
  /**
   * Narx — TIYINDA. `null` bo'lishi mumkin:
   * restoranning narxi yo'q, vakansiyada esa maosh kelishilgan
   * bo'lishi mumkin.
   */
  priceTiyin: number | null;
  /** Narx oldidagi belgi: "dan" yoki bo'sh. */
  pricePrefix: string | null;
  image: CatalogThumb | null;
  /** Hali sotuvda/faolmi. Yo'q bo'lsa kartochka xiralashadi. */
  isAvailable: boolean;
  addedAt: string;
}

/** GET /api/v1/favorites */
export interface FavoritesResponse {
  /** Turlar bo'yicha guruhlangan. Bo'sh guruh ham qaytadi. */
  groups: { target: FavoriteTarget; items: FavoriteItem[] }[];
  total: number;
}

/** GET /api/v1/favorites/ids */
export interface FavoriteIdsResponse {
  /** Har bir tur uchun saqlangan ID'lar. */
  ids: Record<FavoriteTarget, string[]>;
}

/** POST va DELETE javobi. */
export interface FavoriteToggleResponse {
  isFavorite: boolean;
  /** Shu turdagi jami saqlanganlar soni — hisoblagich uchun. */
  count: number;
}

/** Bo'sh ID to'plami — yuklanmagan holat uchun. */
export function emptyFavoriteIds(): Record<FavoriteTarget, string[]> {
  return { PRODUCT: [], MENU_ITEM: [], RESTAURANT: [], HOTEL: [], VACANCY: [] };
}
