import type { NextRequest } from 'next/server';

import { parseJsonBody, parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { collabQuerySchema, createCollabOfferSchema } from '@/modules/collab/collab.schemas';
import { listCollabOffers, sendCollabOffer } from '@/modules/collab/collab.service';
import type { CollabOffersResponse } from '@/modules/collab/collab.types';

/**
 * GET  /api/v1/collab/offers — takliflarim (kelgan yoki yuborilgan).
 * POST /api/v1/collab/offers — ijodkorga taklif yuborish.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const query = parseSearchParams(request, collabQuerySchema);

  const result = await listCollabOffers(auth.userId, query);

  return apiSuccess<CollabOffersResponse>(result, {
    requestId,
    headers: { 'cache-control': 'no-store' },
  });
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createCollabOfferSchema);

  await enforcePublicRateLimit(
    'collabOffer',
    auth.userId,
    "Bugunga taklif chegarasi tugadi. Ertaga davom eting.",
  );

  const offer = await sendCollabOffer(auth.userId, input);

  return apiSuccess({ offer }, { requestId, status: 201 });
});
