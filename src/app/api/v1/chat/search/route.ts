import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { SEARCH_PAGE_SIZE } from '@/config/message-search';
import { messageSearchQuerySchema } from '@/modules/chat/chat-search.schemas';
import { searchMessages } from '@/modules/chat/chat-search.service';

/**
 * GET /api/v1/chat/search — xabarlarni qidirish.
 *
 * ── Nima uchun cheklov bor ────────────────────────────────────────────
 * Qidiruv ilovadagi eng og'ir so'rovlardan biri: u eng katta jadval
 * bo'ylab boradi. Har harfda so'rov yuboradigan brauzer (yoki skript)
 * bazani bir zumda yuklab qo'yishi mumkin.
 *
 * Brauzer tomonida ham kechikish bor, lekin u himoya emas —
 * himoya shu yerda.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  await enforcePublicRateLimit('messageSearch', auth.userId);

  const query = parseSearchParams(request, messageSearchQuerySchema);

  const result = await searchMessages(auth.userId, {
    query: query.q,
    conversationId: query.conversationId,
    page: query.page,
  });

  return apiSuccess(result, {
    requestId,
    pagination: buildPagination(query.page, SEARCH_PAGE_SIZE, result.total),
  });
});
