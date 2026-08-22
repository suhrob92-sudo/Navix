import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getCall } from '@/modules/call/call.service';

/**
 * GET /api/v1/calls/[id] — qo'ng'iroqning HOZIRGI holati.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Odatda holat jonli oqim (SSE) orqali o'zi keladi. Lekin oqim uzilib
 * qolishi mumkin: metro, lift, tarmoq almashishi.
 *
 * Guruh suhbatida bu ayniqsa og'riqli: ishtirokchilar ro'yxati
 * eskirib qoladi va brauzer kimdir kirgan yoki chiqqanini bilmaydi —
 * natijada ulanish ochilmay yoki yopilmay qoladi.
 *
 * Bu manzil o'sha holatda "hozir nima bo'lyapti?" degan savolga bir
 * so'rovda javob beradi.
 *
 * Xizmat funksiyasi (`getCall`) allaqachon yozilgan edi, lekin unga
 * yo'l ochilmagan ekan.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Qo'ng'iroq ID noto'g'ri") });

type Params = { id: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  const call = await getCall(id, auth.userId);

  return apiSuccess({ call }, { requestId });
});
