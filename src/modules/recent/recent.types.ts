import type { RecentTarget } from '@/config/recent';
import type { CatalogSummary } from '@/modules/catalog/catalog-summary';

/**
 * Yaqinda ko'rilganlar — brauzer va server uchun umumiy turlar.
 */

/**
 * Ro'yxatdagi bitta yozuv.
 *
 * Ko'rinish maydonlari (`CatalogSummary`) sevimlilar bilan BAHAM
 * ko'riladi: ikkalasi ham aynan bir xil kartochka chizadi.
 */
export interface RecentItem extends CatalogSummary {
  id: string;
  target: RecentTarget;
  targetId: string;
  /** Oxirgi marta qachon ko'rilgan — ISO sana. */
  viewedAt: string;
}

/** GET /api/v1/recent */
export interface RecentResponse {
  items: RecentItem[];
}
