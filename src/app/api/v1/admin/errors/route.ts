import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { errorLogQuerySchema } from '@/modules/error-log/error-log.schemas';
import { clearResolvedErrors, listErrors } from '@/modules/error-log/error-log.service';

/**
 * GET    /api/v1/admin/errors — xatolar ro'yxati.
 * DELETE /api/v1/admin/errors — YOPILGAN xatolarni tozalash.
 *
 * ── Nima uchun `PLATFORM_AUDIT_READ` ruxsati ──────────────────────────
 * Xatolar jurnali — audit jurnali bilan bir turdagi ma'lumot: ikkalasi
 * ham ilovaning ichki ishini ko'rsatadi va ikkalasida ham manzillar,
 * ID'lar va ichki tuzilma haqida ma'lumot bor.
 *
 * Yangi ruxsat qo'shish ham mumkin edi, lekin ruxsatlar ko'paygan sari
 * ularni to'g'ri taqsimlash qiyinlashadi va xato qilish osonlashadi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_AUDIT_READ);
  const query = parseSearchParams(request, errorLogQuerySchema);

  const { errors, total, openCount } = await listErrors(query);

  return apiSuccess(
    { errors, openCount },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});

export const DELETE = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requirePermission(request, Permission.PLATFORM_AUDIT_READ);

  const removed = await clearResolvedErrors();

  return apiSuccess({ removed }, { requestId });
});
