import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { editMessageSchema } from '@/modules/chat/chat.schemas';
import { deleteMessage, editMessage } from '@/modules/chat/chat.service';

/**
 * PATCH  /api/v1/chat/conversations/[id]/messages/[messageId] — tahrirlash.
 * DELETE /api/v1/chat/conversations/[id]/messages/[messageId] — o'chirish.
 *
 * ── Nima uchun suhbat ID ham manzilda ─────────────────────────────────
 * Xabar ID o'zi ham yagona, ya'ni suhbatsiz ham topilardi. Lekin
 * u holda a'zolik tekshiruvi xabar TOPILGANDAN keyin bo'lardi va
 * kod tartibiga bog'liq bo'lib qolardi.
 *
 * Suhbat manzilda tursa, tekshiruv birinchi qadam bo'ladi: begona
 * suhbatga umuman kirib bo'lmaydi va xabarning mavjudligi ham
 * bilinmaydi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string; messageId: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id, messageId } = await params;
  const input = await parseJsonBody(request, editMessageSchema);

  const message = await editMessage(parseIdParam(id), parseIdParam(messageId), auth.userId, input.body);

  return apiSuccess({ message }, { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id, messageId } = await params;

  await deleteMessage(parseIdParam(id), parseIdParam(messageId), auth.userId);

  return apiSuccess({ isDeleted: true }, { requestId });
});
