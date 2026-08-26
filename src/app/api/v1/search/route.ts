import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { getRequestContext } from '@/lib/request-context';
import { optionalAuth } from '@/modules/auth/auth.guard';
import { unifiedSearch } from '@/modules/search/search.service';

/**
 * GET /api/v1/search — yagona qidiruv.
 *
 * ── Nima uchun kirish SHART EMAS ─────────────────────────────────────
 * Odam ilovaga birinchi marta kirganda "nima bor ekan" deb qidiradi.
 * Ro'yxatdan o'tishni talab qilish uni darvozadan qaytarardi.
 *
 * Kirgan foydalanuvchi qo'shimcha ikkita bo'lim ko'radi: odamlar va
 * o'z xabarlari. Ular shaxsiy va hech qachon kirmagan odamga
 * ko'rsatilmaydi — buni `groupsForQuery` hal qiladi.
 *
 * ── Nima uchun chegara qattiqroq ─────────────────────────────────────
 * Bu so'rov OLTITA jadval bo'ylab boradi. Har harfda so'rov
 * yuboradigan skript bazani oddiy katalog so'rovidan olti barobar
 * tez yuklab qo'yardi.
 */
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  q: z.string().trim().min(1, "Qidiruv so'zini kiriting").max(120, "So'rov juda uzun"),
});

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await optionalAuth(request);

  /*
    Chegara KIM bo'yicha: kirgan odam uchun uning ID'si, aks holda
    manzil. Bitta uydan chiqqan bir necha odam bir-birini
    to'sib qo'ymasin.
  */
  await enforcePublicRateLimit(
    'publicCatalog',
    auth?.userId ?? getRequestContext(request).ipAddress ?? 'anonim',
  );

  const query = parseSearchParams(request, querySchema);

  const result = await unifiedSearch(query.q, auth?.userId ?? null);

  return apiSuccess(result, { requestId });
});
