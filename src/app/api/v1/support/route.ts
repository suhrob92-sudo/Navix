import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createTicketSchema, ticketQuerySchema } from '@/modules/support/support.schemas';
import { createTicket, listMyTickets } from '@/modules/support/support.service';

/**
 * GET  /api/v1/support — mening murojaatlarim
 * POST /api/v1/support — yangi murojaat
 *
 * Ruxsat talab qilinmaydi — faqat KIRISH. Yordam so'rash har bir
 * foydalanuvchining huquqi va uni rol bilan cheklash noto'g'ri
 * bo'lardi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, ticketQuerySchema);

  const tickets = await listMyTickets(auth.userId, query);

  return apiSuccess({ tickets }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createTicketSchema);
  const context = getRequestContext(request);

  const ticket = await createTicket(auth.userId, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId,
  });

  return apiSuccess({ ticket }, { requestId, status: 201 });
});
