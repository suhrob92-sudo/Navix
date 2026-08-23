import type { FavoriteTarget } from '@/config/favorite';
import type { CatalogSummary } from '@/modules/catalog/catalog-summary';

/**
 * Sevimlilar — brauzer va server uchun umumiy turlar.
 */

/**
 * Sevimlilar ro'yxatidagi bitta yozuv.
 *
 * Ko'rinish maydonlari (`CatalogSummary`) "yaqinda ko'rilganlar"
 * bilan BAHAM ko'riladi: ikkalasi ham aynan bir xil kartochka
 * chizadi.
 */
export interface FavoriteItem extends CatalogSummary {
  id: string;
  target: FavoriteTarget;
  targetId: string;
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
