import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { getRequestContext } from '@/lib/request-context';
import { getSharedRide } from '@/modules/taxi/taxi.service';

/**
 * GET /api/v1/taxi/share/[token] — ulashilgan safarni ko'rsatadi.
 *
 * ── Nima uchun AUTENTIFIKATSIYA yo'q ──────────────────────────────────
 * Havolani olgan odam ilovaga kirmagan bo'lishi mumkin — u shunchaki
 * kuzatayotgan qarindosh. Kirishni talab qilsak, ulashishning butun
 * ma'nosi yo'qolardi.
 *
 * Himoya — KALITNING O'ZIDA: u taxmin qilib bo'lmaydigan uzunlikda va
 * qaytariladigan ma'lumot ataylab kambag'al: telefon ham, narx ham,
 * safar ID'si ham yo'q.
 */
export const dynamic = 'force-dynamic';

/*
  Kalit `base64url` — harf, raqam, `-` va `_`.

  Uzunlik CHEGARALANGAN: juda uzun matn bilan bazani bekorga
  qidirtirishning oldi olinadi.
*/
const paramsSchema = z.object({
  token: z
    .string()
    .min(16, "Havola noto'g'ri")
    .max(64, "Havola noto'g'ri")
    .regex(/^[A-Za-z0-9_-]+$/, "Havola noto'g'ri"),
});

type Params = { token: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  /*
    ── Nima uchun chegara kerak ──────────────────────────────────────
    Manzil kirish talab qilmaydi — havolani olgan HAR KIM ochadi.
    Kalit uzun va tasodifiy (24 bayt), shuning uchun uni saralab
    topish amalda imkonsiz. Lekin "amalda imkonsiz" degani "urinib
    ko'rib bo'lmaydi" degani emas: chegarasiz robot soatiga
    millionlab urinish yuborib, serverni band qilib turishi mumkin.

    Daqiqasiga 60 — havolani ochib qo'ygan odam uchun bemalol
    (sahifa holatni yangilab turadi), robot uchun esa darhol to'siq.
  */
  const { ipAddress } = getRequestContext(request);

  await enforcePublicRateLimit('rideShareView', ipAddress ?? 'unknown', "Juda ko'p so'rov. Biroz kuting.");

  const { token } = paramsSchema.parse(await params);

  const ride = await getSharedRide(token);

  return apiSuccess({ ride }, { requestId, headers: { 'cache-control': 'no-store' } });
});
