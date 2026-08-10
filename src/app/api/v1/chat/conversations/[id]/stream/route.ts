import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { AppError } from '@/lib/api/errors';
import { requireAuth } from '@/modules/auth/auth.guard';
import { logger } from '@/lib/logger';
import { markOnline, markViewing } from '@/lib/presence';
import { getThread, markDelivered } from '@/modules/chat/chat.service';

/**
 * GET /api/v1/chat/conversations/[id]/stream — jonli ulanish (SSE).
 *
 * ── Nima uchun SSE, WebSocket emas ────────────────────────────────────
 * WebSocket ikki tomonlama ulanish talab qiladi va u doimiy ishlaydigan
 * serverni so'raydi. Navix esa Vercel'da, "serversiz" muhitda ishlaydi:
 * u yerda uzoq yashaydigan WebSocket yo'q.
 *
 * SSE (Server-Sent Events) esa oddiy HTTP javobi — u shunchaki
 * yopilmaydi va server unga vaqti-vaqti bilan yozib turadi. Bizga
 * aynan shu yetarli: xabarlar SERVERDAN keladi, brauzer esa oddiy
 * so'rovlar bilan javob yozadi.
 *
 * ── Nima uchun ulanish 50 soniyadan keyin yopiladi ────────────────────
 * Serversiz muhitda so'rovning umri cheklangan. Uni o'zimiz belgilab,
 * ulanishni tartibli yopamiz — brauzer esa darhol qaytadan ulanadi.
 * Aks holda ulanish kutilmaganda uzilib, "xabarlar kelmay qoldi"
 * degan holat paydo bo'lardi.
 *
 * ── Nima uchun ichkarida SO'ROV ─────────────────────────────────────
 * Xabar yuborilganda uni boshqa serverdagi ulanishga darhol yetkazish
 * uchun xabarlar navbati (pub/sub) kerak bo'lardi. Bu yerda esa oqim
 * har 1.5 soniyada bazadan tekshiradi.
 *
 * Bu "haqiqiy" real-time emas, lekin farqi sezilmaydi: odam uchun
 * 1.5 soniya darhol demakdir. Foydasi katta — qo'shimcha
 * infratuzilma umuman kerak emas.
 */
export const dynamic = 'force-dynamic';

/** Ulanish shuncha ishlaydi, keyin brauzer qaytadan ulanadi. */
const STREAM_LIFETIME_MS = 50_000;

/** Bazani shuncha oraliqda tekshiramiz. */
const POLL_INTERVAL_MS = 1_500;

/** "Onlayn" belgisi shuncha oraliqda yangilanadi. */
const PRESENCE_REFRESH_MS = 20_000;

const paramsSchema = z.object({ id: z.uuid("Suhbat ID noto'g'ri") });

type Params = { id: string };

interface RouteContext {
  params: Promise<Params>;
}

/**
 * Xatoni to'g'ri javobga aylantiradi.
 *
 * ── Nima uchun qo'lda ─────────────────────────────────────────────────
 * Boshqa endpointlar `withApiHandler` ichida ishlaydi va u xatolarni
 * o'zi ushlaydi. Bu yerda esa javob oqim (`ReadableStream`) bo'lgani
 * uchun o'sha o'ram ishlatilmaydi.
 *
 * Usiz "bunday suhbat yo'q" xatosi 500 bo'lib chiqardi — brauzer esa
 * uni server buzildi deb tushunib, cheksiz qayta ulanaverardi.
 */
function toErrorResponse(error: unknown): Response {
  const status = error instanceof AppError ? error.status : 500;
  const message = error instanceof AppError ? error.message : 'Kutilmagan xatolik';

  return Response.json({ success: false, error: { message } }, { status });
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  let auth: Awaited<ReturnType<typeof requireAuth>>;
  let id: string;

  try {
    auth = await requireAuth(request);
    id = paramsSchema.parse(await context.params).id;

    /**
     * A'zolik SHU YERDA tekshiriladi.
     *
     * `getThread` a'zo bo'lmasa xato tashlaydi — oqim ochilishidan
     * oldin. Aks holda begona odam ulanib, suhbatni kuzatib turardi.
     */
    await getThread(id, auth.userId);
  } catch (error) {
    return toErrorResponse(error);
  }

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  let lastPresenceAt = 0;
  let lastPayload = '';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      /** Bitta hodisani SSE ko'rinishida yozadi. */
      function send(event: string, data: unknown): void {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        while (Date.now() - startedAt < STREAM_LIFETIME_MS) {
          if (Date.now() - lastPresenceAt > PRESENCE_REFRESH_MS) {
            /**
             * Ikki belgi birga yangilanadi: "onlaynman" va "shu
             * suhbatni ochib turibman".
             *
             * Ikkinchisi push uchun kerak — ochiq suhbatga xabar
             * kelganda telefonni bezovta qilishning ma'nosi yo'q.
             */
            await Promise.all([markOnline(auth.userId), markViewing(auth.userId, id)]);
            lastPresenceAt = Date.now();
          }

          const thread = await getThread(id, auth.userId);

          /**
           * Menga kelgan xabarlar AYNAN SHU PAYT qurilmaga yetdi.
           *
           * Shu sababli "yetkazildi" belgisi shu yerda qo'yiladi —
           * yuboruvchi buni o'z oynasida ko'radi.
           */
          await markDelivered(id, auth.userId);

          const payload = JSON.stringify(thread);

          /**
           * O'zgarish bo'lmasa hech narsa yuborilmaydi.
           *
           * Har 1.5 soniyada bir xil ma'lumotni uzatish mobil
           * internetda trafikni bekorga sarflardi.
           */
          if (payload !== lastPayload) {
            lastPayload = payload;
            send('thread', thread);
          } else {
            // Ulanish tirikligini bildiradi (proksilar uzib yubormasligi uchun).
            controller.enqueue(encoder.encode(': ping\n\n'));
          }

          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }

        // Brauzerga "qaytadan ulan" deb aytamiz va tartibli yopamiz.
        send('reconnect', { reason: 'lifetime' });
        controller.close();
      } catch (error) {
        /**
         * Brauzer sahifani yopganda oqim uziladi va bu XATO emas.
         * Log'ga faqat kutilmagan holatlar tushishi kerak.
         */
        logger.debug({ err: error, conversationId: id }, 'Jonli ulanish uzildi');

        try {
          controller.close();
        } catch {
          // Allaqachon yopilgan.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
      /**
       * Nginx va shunga o'xshash proksilar javobni buferlab qo'yadi —
       * unda hodisalar bir joyda to'planib, birdan kelardi.
       */
      'x-accel-buffering': 'no',
    },
  });
}
