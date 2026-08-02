import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { updateAddressSchema } from '@/modules/address/address.schemas';
import { deleteAddress, getAddress, updateAddress } from '@/modules/address/address.service';

/**
 * GET    /api/v1/addresses/[id] — bitta manzil
 * PATCH  /api/v1/addresses/[id] — manzilni tahrirlash
 * DELETE /api/v1/addresses/[id] — manzilni o'chirish
 *
 * Barcha amallar faqat MANZIL EGASI uchun ishlaydi. Boshqa foydalanuvchining
 * manzili so'ralsa "topilmadi" qaytadi — mavjudligi ham oshkor qilinmaydi.
 */
export const dynamic = 'force-dynamic';

/** URL'dagi ID haqiqiy UUID ekanini tekshiramiz. */
const paramsSchema = z.object({ id: z.string().uuid("Manzil ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const address = await getAddress(auth.userId, id);

  return apiSuccess(address, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateAddressSchema);

  const address = await updateAddress(auth.userId, id, input);

  return apiSuccess(address, { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await deleteAddress(auth.userId, id);

  return apiSuccess({ deleted: true }, { requestId });
});
