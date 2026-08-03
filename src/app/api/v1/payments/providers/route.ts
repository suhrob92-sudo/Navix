import type { NextRequest } from 'next/server';

import { parseSearchParams, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { providerQuerySchema } from '@/modules/payment/payment.schemas';
import { listProviders } from '@/modules/payment/payment.service';

/**
 * GET /api/v1/payments/providers — to'lov qabul qiluvchi xizmatlar.
 *
 * Namuna: /api/v1/payments/providers?category=UTILITY
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requireAuth(request);
  const query = parseSearchParams(request, providerQuerySchema);

  const providers = await listProviders(query);

  return apiSuccess({ providers }, { requestId });
});
