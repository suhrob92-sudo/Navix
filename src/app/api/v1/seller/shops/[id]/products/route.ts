import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { createSellerProductSchema } from '@/modules/seller/seller.schemas';
import { createSellerProduct, listSellerProducts } from '@/modules/seller/seller.service';

/**
 * GET  /api/v1/seller/shops/[id]/products — do'kon mahsulotlari
 * POST /api/v1/seller/shops/[id]/products — yangi mahsulot
 *
 * `slug` va `searchName` so'rovda YO'Q: ikkalasini ham server nomdan
 * hisoblaydi, shunda manzil takrorlanmaydi va qidiruv ustuni nomga
 * har doim mos keladi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Do'kon ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.SELLER_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);

  const data = await listSellerProducts(auth.userId, id);

  return apiSuccess(data, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.SELLER_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, createSellerProductSchema);
  const context = getRequestContext(request);

  const product = await createSellerProduct(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ product }, { requestId, status: 201 });
});
