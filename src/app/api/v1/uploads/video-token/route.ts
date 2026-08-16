import { NextResponse, type NextRequest } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { isBlobConfigured } from '@/lib/storage';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { ALLOWED_VIDEO_TYPES, MAX_VIDEO_BYTES } from '@/modules/upload/upload.types';

/**
 * Video yuklash uchun QISQA MUDDATLI ruxsat.
 *
 * ── Nima uchun video server orqali o'tmaydi ───────────────────────────
 * Vercel'da serversiz funksiyaga kelgan so'rov tanasi 4.5 MB bilan
 * cheklangan. Yigirma megabaytlik video oddiy yuklash manzili orqali
 * yuborilsa, u ishlab chiqishda ishlaydi-yu, production'da
 * "413 Payload Too Large" bilan yiqiladi — va buni faqat
 * foydalanuvchilar topadi.
 *
 * Shuning uchun fayl BRAUZERDAN TO'G'RIDAN-TO'G'RI omborga boradi.
 * Server esa faqat ruxsat beradi va shu ruxsatda cheklovlarni
 * yozadi: qanday tur va qanday hajmgacha. Bu tekshiruvlar ombor
 * tomonida bajariladi, ya'ni brauzer ularni chetlab o'ta olmaydi.
 *
 * ── Nima uchun GET ham bor ────────────────────────────────────────────
 * Ishlab chiqishda ombor kaliti bo'lmasligi mumkin. Unda brauzer
 * oddiy yuklash manziliga murojaat qiladi (u yerda 4.5 MB cheklovi
 * yo'q — u Vercel platformasining cheklovi, mahalliy serverning
 * emas). Brauzer qaysi yo'l ishlashini OLDINDAN bilishi kerak.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requireAuth(request);

  return apiSuccess(
    { mode: isBlobConfigured() ? 'CLIENT' : 'SERVER' },
    { requestId, headers: { 'cache-control': 'no-store' } },
  );
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);

  await enforcePublicRateLimit('upload', auth.userId, "Juda ko'p fayl yuklayapsiz. Biroz kuting.");

  const body = (await request.json()) as HandleUploadBody;

  const result = await handleUpload({
    body,
    request,
    token: serverEnv().BLOB_READ_WRITE_TOKEN,
    onBeforeGenerateToken: async () => ({
      /**
       * Cheklovlar OMBOR tomonida qo'llanadi.
       *
       * Brauzerdagi tekshiruv qulaylik uchun: u xatoni darhol
       * ko'rsatadi. Lekin uni chetlab o'tish oson, shuning uchun
       * haqiqiy chegara shu yerda yoziladi.
       */
      allowedContentTypes: [...ALLOWED_VIDEO_TYPES],
      maximumSizeInBytes: MAX_VIDEO_BYTES,
      /**
       * Nomga tasodifiy qo'shimcha QO'SHILADI.
       *
       * Kalitni bu yerda biz emas, brauzer taklif qiladi. Ikki odam
       * bir xil nom yuborsa, biri ikkinchisining videosini
       * o'chirib yuborardi.
       */
      addRandomSuffix: true,
      tokenPayload: auth.userId,
    }),
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      logger.info({ userId: tokenPayload, url: blob.url }, 'Video yuklandi');
    },
  });

  /**
   * Javob O'RALMAYDI — ayni holicha qaytadi.
   *
   * ── HAQIQIY XATO: video production'da umuman yuklanmasdi ────────────
   * Loyihadagi barcha manzillar javobni `{ success, data, meta }`
   * ko'rinishida qaytaradi va brauzer tomonda `data` ochib olinadi.
   *
   * Lekin bu manzilga so'rovni BIZNING kodimiz emas, `@vercel/blob`
   * kutubxonasi yuboradi. U javobdan to'g'ridan-to'g'ri `clientToken`
   * ni o'qiydi (`const { clientToken } = await res.json()`).
   *
   * O'ralgan javobda esa yuqori darajada `clientToken` YO'Q — u
   * `data` ichida qolib ketardi. Natijada kutubxona `undefined`
   * token bilan omborga murojaat qilib, tushunarsiz xato bilan
   * yiqilardi.
   *
   * Ishlab chiqishda bu sezilmasdi: u yerda ombor kaliti yo'q va
   * video butunlay boshqa yo'ldan (server orqali) ketadi.
   */
  return NextResponse.json(result);
});
