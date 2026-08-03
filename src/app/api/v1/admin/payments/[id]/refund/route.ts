import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { refundPaymentSchema } from '@/modules/admin/admin.schemas';
import { refundPayment } from '@/modules/payment/payment.service';

/**
 * POST /api/v1/admin/payments/[id]/refund — to'lovni bekor qilib,
 * pulni mijoz hamyoniga qaytaradi.
 *
 * Nima uchun POST, PATCH emas: bu resursni tahrirlash emas, balki YANGI
 * moliyaviy amal yaratish (hamyonda yangi tranzaksiya paydo bo'ladi).
 *
 * Takroriy so'rov xavfsiz: idempotentlik kaliti to'lov ID'sidan
 * hisoblanadi, shuning uchun ikkinchi urinish bazada to'xtaydi va pul
 * ikki marta qaytarilmaydi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("To'lov ID noto'g'ri") });

type Params = { id: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.PAYMENT_REFUND);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, refundPaymentSchema);
  const context = getRequestContext(request);

  const payment = await refundPayment(auth.userId, id, input.reason, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ payment }, { requestId });
});
