import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getParcel } from '@/modules/parcel/parcel.service';

/**
 * GET /api/v1/parcels/[id] — bitta jo'natma va uning holati.
 *
 * Egalik serverda tekshiriladi: begona jo'natmani ko'rish qabul
 * qiluvchining telefon raqamini oshkor qilardi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Jo'natma ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const parcel = await getParcel(auth.userId, id);

  return apiSuccess({ parcel }, { requestId, headers: { 'cache-control': 'no-store' } });
});
