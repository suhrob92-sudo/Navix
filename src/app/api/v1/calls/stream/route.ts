import type { NextRequest } from 'next/server';

import { callQueueTail, readCallEvents } from '@/lib/call-signal';
import { AppError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { markOnline } from '@/lib/presence';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getLiveCall } from '@/modules/call/call.service';

/**
 * GET /api/v1/calls/stream — qo'ng'iroqlarni kutish (SSE).
 *
 * ── Nima uchun ALOHIDA oqim ───────────────────────────────────────────
 * Suhbat oqimi faqat o'sha suhbat oynasi ochiq bo'lganda ishlaydi.
 * Qo'ng'iroq esa istalgan payt kelishi mumkin: odam boshqa bo'limda
 * yurgan bo'lishi mumkin.
 *
 * Shu sababli bu oqim ilovaning QOLIPIDA ochiladi va ilova ochiq
 * bo'lgan vaqtning hammasida ishlaydi.
 *
 * ── Nima uchun tez tekshiriladi ───────────────────────────────────────
 * Suhbat oqimida 1.5 soniya sezilmaydi. Qo'ng'iroqda esa ulanish
 * ma'lumotlari almashadi va har kechikish "ulanmoqda..." vaqtini
 * cho'zadi. Shuning uchun bu yerda oraliq qisqaroq.
 */
export const dynamic = 'force-dynamic';

/** Ulanish shuncha ishlaydi, keyin brauzer qaytadan ulanadi. */
const STREAM_LIFETIME_MS = 50_000;

/** Navbatni shuncha oraliqda tekshiramiz. */
const POLL_INTERVAL_MS = 700;

/** "Onlayn" belgisi shuncha oraliqda yangilanadi. */
const PRESENCE_REFRESH_MS = 20_000;

/**
 * Manzildagi kursorni o'qiydi.
 *
 * Kursor BERILMAGAN bo'lsa `null` qaytadi — bu "birinchi ulanish"
 * degani va navbat oxiridan boshlanadi. Noto'g'ri qiymat ham shunday
 * ishlanadi: eski hodisalarni qayta o'ynatgandan ko'ra ularni butunlay
 * o'tkazib yuborgan xavfsizroq.
 */
function parseCursor(request: NextRequest): number | null {
  const value = new URL(request.url).searchParams.get('cursor');

  if (value === null) return null;

  const raw = Number(value);

  return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
}

function toErrorResponse(error: unknown): Response {
  const status = error instanceof AppError ? error.status : 500;
  const message = error instanceof AppError ? error.message : 'Kutilmagan xatolik';

  return Response.json({ success: false, error: { message } }, { status });
}

export async function GET(request: NextRequest): Promise<Response> {
  let auth: Awaited<ReturnType<typeof requireAuth>>;

  try {
    auth = await requireAuth(request);
  } catch (error) {
    return toErrorResponse(error);
  }

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  /**
   * Navbatdagi joyimiz.
   *
   * Har bir ulanish o'z kursorini yuritadi — shuning uchun bir necha
   * oyna ochiq bo'lsa ham har biri BARCHA hodisalarni oladi.
   *
   * Qayta ulanishda brauzer oxirgi joyni qaytarib beradi: aks holda
   * navbat boshidan o'qilib, ko'rilgan qo'ng'iroq qayta chalinardi.
   */
  const requestedCursor = parseCursor(request);

  let cursor = 0;
  let lastPresenceAt = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: string, data: unknown): void {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        /**
         * Birinchi ulanishda navbat OXIRIDAN boshlanadi.
         *
         * Aks holda ilova ochilishi bilan allaqachon tugagan
         * qo'ng'iroqning "chalinmoqda" xabari kelib qolardi.
         */
        cursor = requestedCursor ?? (await callQueueTail(auth.userId));

        /**
         * Birinchi navbatda DAVOM ETAYOTGAN qo'ng'iroq yuboriladi.
         *
         * Sahifa yangilangan yoki ilova qayta ochilgan bo'lsa,
         * qo'ng'iroq ekraniga qaytish kerak — aks holda suhbat
         * ketayotgan bo'lsa ham ekranda hech narsa ko'rinmasdi.
         */
        send('live', { call: await getLiveCall(auth.userId) });

        while (Date.now() - startedAt < STREAM_LIFETIME_MS) {
          if (Date.now() - lastPresenceAt > PRESENCE_REFRESH_MS) {
            await markOnline(auth.userId);
            lastPresenceAt = Date.now();
          }

          const batch = await readCallEvents(auth.userId, cursor);
          cursor = batch.cursor;

          if (batch.events.length > 0) {
            for (const event of batch.events) {
              send('call', event);
            }
          } else {
            // Ulanish tirikligini bildiradi (proksilar uzib yubormasligi uchun).
            controller.enqueue(encoder.encode(': ping\n\n'));
          }

          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }

        /**
         * Qaytadan ulanishda kursor brauzerga qaytariladi.
         *
         * Usiz yangi ulanish navbatni boshidan o'qib, ALLAQACHON
         * ko'rilgan qo'ng'iroqni qaytadan chaldirardi.
         */
        send('reconnect', { cursor });
        controller.close();
      } catch (error) {
        // Brauzer sahifani yopganda oqim uziladi va bu XATO emas.
        logger.debug({ err: error, userId: auth.userId }, "Qo'ng'iroq oqimi uzildi");

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
      'x-accel-buffering': 'no',
    },
  });
}
