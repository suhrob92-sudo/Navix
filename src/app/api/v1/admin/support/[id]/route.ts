import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { replyTicketSchema, updateTicketStatusSchema } from '@/modules/support/support.schemas';
import { getAdminTicket, replyAsStaff, updateTicketStatus } from '@/modules/support/support.service';

/**
 * GET   /api/v1/admin/support/[id] — murojaat va yozishma
 * POST  /api/v1/admin/support/[id] — javob yozish
 * PATCH /api/v1/admin/support/[id] — yakunlash
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Murojaat ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  await requirePermission(request, Permission.PLATFORM_SUPPORT_MANAGE);
  const { id } = paramsSchema.parse(await params);

  const ticket = await getAdminTicket(id);

  return apiSuccess({ ticket }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.PLATFORM_SUPPORT_MANAGE);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, replyTicketSchema);
  const context = getRequestContext(request);

  const ticket = await replyAsStaff(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId,
  });

  return apiSuccess({ ticket }, { requestId });
});

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.PLATFORM_SUPPORT_MANAGE);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateTicketStatusSchema);
  const context = getRequestContext(request);

  const ticket = await updateTicketStatus(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId,
  });

  return apiSuccess({ ticket }, { requestId });
});
