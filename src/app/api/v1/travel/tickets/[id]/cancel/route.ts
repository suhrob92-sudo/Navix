import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { requireAuth } from '@/modules/auth/auth.guard';
import { cancelTicketSchema } from '@/modules/travel/travel.schemas';
import { cancelTicket } from '@/modules/travel/travel.service';

/**
 * POST /api/v1/travel/tickets/[id]/cancel — bekor qilish va pulni qaytarish.
 *
 * Faqat JO'NASHDAN oldin mumkin. Qaytariladigan summa jo'nashgacha
 * qolgan vaqtga bog'liq — hisob serverda.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Chipta ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, cancelTicketSchema);
  const context = getRequestContext(request);

  const ticket = await cancelTicket(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ ticket }, { requestId });
});
