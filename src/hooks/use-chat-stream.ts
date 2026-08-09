'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/modules/auth/auth-context';
import type { ThreadView } from '@/modules/chat/chat.types';

/**
 * Suhbatni JONLI kuzatadi.
 *
 * ── Nima uchun `EventSource` EMAS ─────────────────────────────────────
 * Brauzerning o'z `EventSource` klassi so'rovga sarlavha qo'sha
 * olmaydi. Bizning autentifikatsiya esa `Authorization` sarlavhasiga
 * tayanadi.
 *
 * Tokenni manzilga qo'shish mumkin edi, lekin unda u server
 * jurnallariga, brauzer tarixiga va proksilarga tushib qolardi —
 * token esa parol bilan barobar.
 *
 * Shuning uchun oqim `fetch` bilan ochiladi va javob qo'lda o'qiladi.
 * Natija bir xil, token esa sarlavhada qoladi.
 *
 * ── Nima uchun qayta ulanish qo'lda ───────────────────────────────────
 * `EventSource` uzilganda o'zi ulanardi. `fetch` da buni o'zimiz
 * qilamiz — buning foydasi ham bor: token eskirgan bo'lsa, qayta
 * ulanishdan oldin uni yangilay olamiz.
 */

/** Qayta ulanishdan oldingi kutish — tarmoq tiklanishiga vaqt beradi. */
const RECONNECT_DELAY_MS = 1_500;

export interface ChatStreamState {
  thread: ThreadView | null;
  /** Jonli ulanish hozir ishlayaptimi. */
  isLive: boolean;
}

export function useChatStream(conversationId: string): ChatStreamState {
  const { accessToken, refresh } = useAuth();

  const [thread, setThread] = useState<ThreadView | null>(null);
  const [isLive, setIsLive] = useState(false);

  /**
   * Token o'zgarganda oqim qayta ochilmasligi kerak.
   *
   * Uni holat sifatida bog'lasak, har token yangilanishida ulanish
   * uzilib-ulanardi. Shuning uchun eng oxirgi qiymat havolada
   * saqlanadi.
   */
  const tokenRef = useRef(accessToken);
  const refreshRef = useRef(refresh);

  /**
   * Havolalar RENDER paytida emas, effekt ichida yangilanadi.
   *
   * React chizish jarayonini "sof" deb hisoblaydi: u yerda hech
   * narsani o'zgartirmaslik kerak. Havola boshlang'ich qiymati bilan
   * yaratilgani uchun birinchi ulanishda ham to'g'ri token turadi.
   */
  useEffect(() => {
    tokenRef.current = accessToken;
    refreshRef.current = refresh;
  }, [accessToken, refresh]);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    async function connect(): Promise<void> {
      while (!cancelled) {
        controller = new AbortController();

        try {
          const response = await fetch(`/api/v1/chat/conversations/${conversationId}/stream`, {
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

          if (!cancelled) setIsLive(true);

          await readStream(response.body, (event, data) => {
            if (cancelled) return;

            if (event === 'thread') setThread(data as ThreadView);
          });
        } catch {
          // Uzilish kutilgan holat — pastda qaytadan ulanamiz.
        }

        if (cancelled) return;

        setIsLive(false);

        await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
      }
    }

    void connect();

    return () => {
      cancelled = true;
      controller?.abort();
    };
  }, [conversationId]);

  return { thread, isLive };
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

    /**
     * Bo'lak yarmida kelishi mumkin, shuning uchun faqat TUGAGAN
     * hodisalar ajratiladi, qolgani buferda kutadi.
     */
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
