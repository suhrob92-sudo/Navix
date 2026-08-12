import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { reactionSchema } from '@/modules/chat/chat.schemas';
import { toggleReaction } from '@/modules/chat/chat.service';

/**
 * POST /api/v1/chat/conversations/[id]/messages/[messageId]/reactions
 *
 * ── Nima uchun BITTA endpoint ─────────────────────────────────────────
 * Qo'yish, almashtirish va olib tashlash — brauzer uchun bitta
 * harakat: emoji bosildi. Qaysi biri bo'lishini server hal qiladi
 * (`toggleReaction`), shuning uchun bu yerda ham bitta yo'l bor.
 *
 * Javobda xabarning YANGI reaksiyalari qaytadi — brauzer qayta
 * so'ramaydi va ekran darhol to'g'ri holatga keladi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string; messageId: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id, messageId } = await params;
  const input = await parseJsonBody(request, reactionSchema);

  await enforcePublicRateLimit('chatReact', auth.userId, 'Juda tez bosyapsiz. Biroz kuting.');

  const reactions = await toggleReaction(parseIdParam(id), parseIdParam(messageId), auth.userId, input.emoji);

  return apiSuccess({ reactions }, { requestId });
});
