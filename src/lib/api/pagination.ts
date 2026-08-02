import { z } from 'zod';

/**
 * Barcha ro'yxat qaytaruvchi API'lar uchun umumiy sahifalash sxemasi.
 * Masalan: /api/v1/products?page=2&pageSize=20&sort=createdAt&order=desc
 */

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().min(1).max(200).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Prisma uchun `skip` va `take` qiymatlarini hisoblaydi. */
export function toPrismaPagination(query: Pick<PaginationQuery, 'page' | 'pageSize'>): {
  skip: number;
  take: number;
} {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}
