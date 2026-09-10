import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getSharedParcel } from '@/modules/parcel/parcel.service';

/**
 * GET /api/v1/parcels/track/[token] — havola orqali kuzatish.
 *
 * ── Nima uchun bu yerda `requireAuth` YO'Q ────────────────────────────
 * Posilkani kutayotgan odam ilovada bo'lmasligi mumkin. Kirishni
 * talab qilsak, havolaning butun ma'nosi yo'qolardi.
 *
 * Himoya — KALITNING O'ZIDA: u 32 baytlik tasodifiy qiymat va uni
 * saralab topib bo'lmaydi. Qaytariladigan ma'lumot esa ataylab
 * kambag'al: telefon ham, narx ham, ichki ID ham yo'q.
 */
export const dynamic = 'force-dynamic';

/*
  Kalit uzunligi TEKSHIRILADI.

  Aks holda har bir tasodifiy satr baza so'roviga aylanardi va
  kimdir uni yuklab tashlashi mumkin edi.
*/
const paramsSchema = z.object({
  token: z.string().min(20, "Havola noto'g'ri").max(64, "Havola noto'g'ri"),
});

type Params = { token: string };

export const GET = withApiHandler<Params>(async (_request: NextRequest, { requestId, params }) => {
  const { token } = paramsSchema.parse(await params);

  const parcel = await getSharedParcel(token);

  return apiSuccess({ parcel }, { requestId, headers: { 'cache-control': 'no-store' } });
});
