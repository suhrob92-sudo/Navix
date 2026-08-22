import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { isProduction } from '@/lib/env';
import { openApiSpec } from '@/lib/openapi/spec';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';

/**
 * GET /api/openapi — API hujjatini JSON ko'rinishida qaytaradi.
 *
 * Bu manzilni Postman, Insomnia yoki Swagger UI'ga import qilib,
 * barcha endpointlarni ko'rish va sinash mumkin.
 *
 * ── Nima uchun PRODUCTION'da kirish talab qilinadi ────────────────────
 * Hujjat 38 KB va u BUTUN API xaritasi: qaysi manzillar bor, qanday
 * maydonlar kutiladi, qaysilari admin uchun. Ochiq qoldirilsa, u
 * hujumchiga tayyor reja bo'lib xizmat qiladi — u yerdan boshlab
 * har bir manzilni birma-bir sinab chiqish mumkin.
 *
 * Bu "yashirish orqali himoya" emas: manzillar baribir himoyalangan.
 * Lekin hujumchining ishini bepul osonlashtirib berishning ma'nosi
 * yo'q.
 *
 * ── Nima uchun ishlab chiqishda OCHIQ ─────────────────────────────────
 * Lokal ishda hujjat har kuni kerak bo'ladi va u yerda hech qanday
 * xavf yo'q. Token talab qilish esa Postman'da ishlashni
 * qiyinlashtirardi.
 */
export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  if (isProduction()) {
    await requirePermission(request, Permission.PLATFORM_ADMIN_ACCESS);
  }

  return apiSuccess(openApiSpec, {
    requestId,
    /**
     * Production'da kesh SHAXSIY.
     *
     * `public` qoldirilsa, oraliqdagi kesh (CDN) admin uchun
     * berilgan javobni saqlab, uni boshqalarga ham berib yuborishi
     * mumkin edi.
     */
    headers: { 'cache-control': isProduction() ? 'private, no-store' : 'public, max-age=300' },
  });
});
