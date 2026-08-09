import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { conversationQuerySchema, openConversationSchema } from '@/modules/chat/chat.schemas';
import { listConversations, openConversation } from '@/modules/chat/chat.service';

/**
 * GET  /api/v1/chat/conversations — mening suhbatlarim.
 * POST /api/v1/chat/conversations — suhbatni ochish (yoki mavjudini olish).
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, conversationQuerySchema);

  const { conversations, total, totalUnread } = await listConversations(auth.userId, query);

  return apiSuccess(
    { conversations, totalUnread },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, openConversationSchema);

  /**
   * Cheklov: har bir yangi suhbat begona odamning ro'yxatida paydo
   * bo'ladi. Cheklovsiz skript yuzlab odamga suhbat ochib, ularning
   * xabarlar sahifasini axlat bilan to'ldirardi.
   */
  await enforcePublicRateLimit('chatOpen', auth.userId, "Juda ko'p suhbat ochyapsiz. Biroz kuting.");

  const result = await openConversation(auth.userId, input);

  return apiSuccess(result, { requestId, status: result.isNew ? 201 : 200 });
});
