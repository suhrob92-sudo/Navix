import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess, buildPagination } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createTicketSchema, ticketQuerySchema } from '@/modules/travel/travel.schemas';
import { createTicket, listTickets } from '@/modules/travel/travel.service';

/**
 * GET  /api/v1/travel/tickets — mening chiptalarim.
 * POST /api/v1/travel/tickets — chipta olish (pul darhol yechiladi).
 *
 * Summa so'rovda YO'Q: u jadvaldagi narx va o'rinlar sonidan serverda
 * hisoblanadi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, ticketQuerySchema);

  const { tickets, total } = await listTickets(auth.userId, query);

  return apiSuccess(
    { tickets },
    {
      requestId,
      pagination: buildPagination(query.page, query.pageSize, total),
      headers: { 'cache-control': 'no-store' },
    },
  );
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createTicketSchema);
  const context = getRequestContext(request);

  const ticket = await createTicket(auth.userId, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ ticket }, { requestId, status: 201 });
});
