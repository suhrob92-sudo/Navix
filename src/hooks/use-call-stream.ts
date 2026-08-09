'use client';

import { useEffect, useRef } from 'react';

import { useAuth } from '@/modules/auth/auth-context';
import type { CallEvent, CallView } from '@/modules/call/call.types';

/**
 * Qo'ng'iroqlarni kutadigan jonli ulanish.
 *
 * ── Nima uchun suhbat oqimidan ALOHIDA ────────────────────────────────
 * Suhbat oqimi faqat suhbat oynasi ochiq bo'lganda ishlaydi. Qo'ng'iroq
 * esa istalgan payt — bosh sahifada, buyurtmalarda, hamma joyda kelishi
 * mumkin. Shuning uchun bu ulanish ilova qolipida, bir marta ochiladi.
 *
 * ── Nima uchun `EventSource` EMAS ─────────────────────────────────────
 * Brauzerning tayyor vositasi so'rovga sarlavha qo'sha olmaydi, token
 * esa manzilga tushmasligi kerak (u parol bilan barobar). Shuning uchun
 * oqim `fetch` bilan ochilib, qo'lda o'qiladi.
 */

/** Qayta ulanishdan oldingi kutish. */
const RECONNECT_DELAY_MS = 1_000;

export interface CallStreamHandlers {
  /** Navbatdagi yangi hodisa. */
  onEvent: (event: CallEvent) => void;
  /** Ulanish ochilganda — davom etayotgan qo'ng'iroq (bo'lsa). */
  onLive: (call: CallView | null) => void;
}

export function useCallStream(enabled: boolean, handlers: CallStreamHandlers): void {
  const { accessToken, refresh } = useAuth();

  /**
   * Barcha o'zgaruvchan qiymatlar HAVOLADA saqlanadi.
   *
   * Ular effekt bog'lanishiga kiritilsa, token yangilangan yoki
   * funksiya qayta yaratilgan har safar ulanish uzilib-ulanardi —
   * qo'ng'iroq esa aynan shu paytda kelib qolishi mumkin.
   */
  const tokenRef = useRef(accessToken);
  const refreshRef = useRef(refresh);
  const handlersRef = useRef(handlers);

  /**
   * Navbatdagi joyimiz — qayta ulanishda serverga qaytariladi.
   *
   * `null` — hali ulanmaganmiz. Bunda server navbat OXIRIDAN boshlaydi
   * va ulanishdan oldingi eski hodisalar qayta o'ynatilmaydi.
   */
  const cursorRef = useRef<number | null>(null);

  useEffect(() => {
    tokenRef.current = accessToken;
    refreshRef.current = refresh;
    handlersRef.current = handlers;
  });

  /**
   * Token TAYYOR bo'lgunicha ulanmaymiz.
   *
   * ── Nima uchun bu muhim ────────────────────────────────────────────
   * Kirish paytida "kirgan" belgisi token o'rnatilishidan bir zum oldin
   * yoqiladi. Shu oraliqda ulansak, server 401 qaytaradi va hook
   * tokenni yangilashga urinadi.
   *
   * Yangilash esa muvaffaqiyatsiz bo'lsa, ilova sessiyani TOZALAYDI —
   * ya'ni endigina kirgan odam darhol chiqarib yuborilardi. Aynan shu
   * xato sinovda topildi.
   */
  const hasToken = Boolean(accessToken);

  useEffect(() => {
    if (!enabled || !hasToken) return;

    let cancelled = false;
    let controller: AbortController | null = null;

    async function connect(): Promise<void> {
      while (!cancelled) {
        controller = new AbortController();

        try {
          const query = cursorRef.current === null ? '' : `?cursor=${cursorRef.current}`;

          const response = await fetch(`/api/v1/calls/stream${query}`, {
            headers: {
              accept: 'text/event-stream',
              ...(tokenRef.current ? { authorization: `Bearer ${tokenRef.current}` } : {}),
            },
            signal: controller.signal,
          });

          // Token eskirgan — yangilab, qaytadan urinamiz.
          if (response.status === 401) {
            const fresh = await refreshRef.current();

            if (!fresh) return;

            continue;
          }

          if (!response.ok || !response.body) {
            throw new Error(`Oqim ochilmadi: ${response.status}`);
          }

          await readStream(response.body, (event, data) => {
            if (cancelled) return;

            if (event === 'live') {
              handlersRef.current.onLive((data as { call: CallView | null }).call);
              return;
            }

            if (event === 'call') {
              handlersRef.current.onEvent(data as CallEvent);
              return;
            }

            if (event === 'reconnect') {
              cursorRef.current = (data as { cursor: number }).cursor;
            }
          });
        } catch {
          // Uzilish kutilgan holat — pastda qaytadan ulanamiz.
        }

        if (cancelled) return;

        await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
      }
    }

    void connect();

    return () => {
      cancelled = true;
      controller?.abort();
    };
  }, [enabled, hasToken]);
}

/**
 * SSE oqimini o'qiydi.
 *
 * Format oddiy: hodisalar bo'sh qator bilan ajratiladi, har biri
 * `event:` va `data:` qatorlaridan iborat. `:` bilan boshlanadigan
 * qator — izoh (ulanish tirikligini bildiruvchi "ping").
 */
async function readStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: string, data: unknown) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();

    if (done) return;

    buffer += decoder.decode(value, { stream: true });

    // Bo'lak yarmida kelishi mumkin — faqat TUGAGAN hodisalar ajratiladi.
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      let event = 'message';
      let data = '';

      for (const line of chunk.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7).trim();
        if (line.startsWith('data: ')) data += line.slice(6);
      }

      if (!data) continue;

      try {
        onEvent(event, JSON.parse(data));
      } catch {
        // Buzilgan hodisa — o'tkazib yuboramiz, oqim davom etaveradi.
      }
    }
  }
}
