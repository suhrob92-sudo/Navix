'use client';

import { useCallback, useEffect, useState } from 'react';

import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import type { PushStatusResponse } from '@/modules/notification/push.types';

/**
 * Push bildirishnomalarga obuna bo'lish.
 *
 * ── Uch bosqich ───────────────────────────────────────────────────────
 * 1. Xizmat ishchisini ro'yxatdan o'tkazish (`/sw.js`);
 * 2. Foydalanuvchidan ruxsat so'rash;
 * 3. Brauzer bergan obunani serverga yuborish.
 *
 * Har bosqich alohida rad etilishi mumkin, shuning uchun holat aniq
 * nomlar bilan qaytariladi — foydalanuvchiga nima bo'lganini aytish
 * uchun.
 */

export type PushState =
  /** Brauzer push'ni umuman qo'llab-quvvatlamaydi. */
  | 'unsupported'
  /** Server tomonda sozlanmagan (VAPID kalitlari yo'q). */
  | 'unconfigured'
  /** Ruxsat berilgan va obuna bor. */
  | 'on'
  /** Hali so'ralmagan yoki obuna yo'q. */
  | 'off'
  /** Foydalanuvchi ruxsatni RAD ETGAN — buni kod tuzata olmaydi. */
  | 'blocked'
  /** Tekshirilmoqda. */
  | 'loading';

export interface PushControl {
  state: PushState;
  error: string | null;
  /** Obuna bo'ladi. */
  enable: () => Promise<void>;
  /** Obunani bekor qiladi. */
  disable: () => Promise<void>;
  isBusy: boolean;
}

/**
 * Qurilma nomini brauzerdan taxmin qiladi.
 *
 * Aniq nom olishning iloji yo'q va kerak ham emas — bu faqat
 * ro'yxatda "qaysi qurilma" degan savolga javob berish uchun.
 */
function detectDeviceLabel(): string {
  const agent = navigator.userAgent;

  if (/android/i.test(agent)) return 'Android telefon';
  if (/iphone|ipad|ipod/i.test(agent)) return 'iPhone yoki iPad';
  if (/macintosh/i.test(agent)) return 'Mac';
  if (/windows/i.test(agent)) return 'Windows kompyuter';

  return 'Qurilma';
}

/**
 * Ochiq kalitni brauzer talab qiladigan ko'rinishga o'tkazadi.
 *
 * Server kalitni matn (base64url) sifatida beradi, brauzer esa
 * baytlar massivini so'raydi. Bu shunchaki formatni o'zgartirish.
 */
function toKeyBytes(base64Url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);

  /**
   * Natija ATAYLAB `ArrayBuffer`.
   *
   * `Uint8Array` ham to'g'ri baytlarni beradi, lekin brauzer turlari
   * uni "bo'lishilgan xotira" bo'lishi mumkin deb hisoblaydi va
   * qabul qilmaydi.
   */
  const bytes = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return bytes.buffer;
}

export function usePush(): PushControl {
  const request = useApiClient();

  const [state, setState] = useState<PushState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  /**
   * Hozirgi holatni ANIQLAYDI, lekin o'zi yozmaydi.
   *
   * ── Nima uchun shunday ─────────────────────────────────────────────
   * Holatni shu yerda yozsa, effekt ichida darhol `setState` chaqirilgan
   * bo'lardi — React buni ortiqcha qayta chizish deb hisoblaydi.
   *
   * Natijani qaytarish esa chaqiruvchiga uni qachon yozishni hal qilish
   * imkonini beradi va komponent yopilgan bo'lsa umuman yozmaydi.
   */
  const resolveState = useCallback(async (): Promise<PushState> => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return 'unsupported';
    }

    try {
      /**
       * Avval BRAUZERDAGI obunani olamiz.
       *
       * Uning manzili serverga yuboriladi va server "shu qurilma
       * obunami" deb aniq javob beradi. Ikkalasi ajralib qolgan
       * bo'lsa — masalan server yaroqsiz obunani o'chirgan bo'lsa —
       * holat "o'chiq" deb ko'rsatiladi va odam uni qayta yoqa oladi.
       */
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();

      const query = existing ? `?endpoint=${encodeURIComponent(existing.endpoint)}` : '';

      const status = await request<PushStatusResponse>(`/api/v1/notifications/push${query}`);

      if (!status.isAvailable || !status.publicKey) return 'unconfigured';

      setPublicKey(status.publicKey);

      if (Notification.permission === 'denied') return 'blocked';

      return existing && status.isSubscribed ? 'on' : 'off';
    } catch (caught) {
      setError(toUserMessage(caught));
      return 'off';
    }
  }, [request]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const next = await resolveState();

      // Komponent yopilgan bo'lsa holatni yozishning ma'nosi yo'q.
      if (!cancelled) setState(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [resolveState]);

  const enable = useCallback(async (): Promise<void> => {
    setIsBusy(true);
    setError(null);

    try {
      if (!publicKey) throw new Error('Push sozlanmagan');

      const registration = await navigator.serviceWorker.register('/sw.js');

      /**
       * Ishchi TAYYOR bo'lishini kutamiz.
       *
       * Ro'yxatdan o'tkazish darhol tugamaydi. Kutmasdan obuna
       * so'ralsa, brauzer "ishchi hali faol emas" deb xato berardi.
       */
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();

      if (permission === 'denied') {
        setState('blocked');
        return;
      }

      if (permission !== 'granted') {
        setState('off');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        /**
         * `true` — MAJBURIY.
         *
         * Bu "har push uchun albatta bildirishnoma ko'rsataman" degan
         * va'da. Brauzerlar boshqa qiymatga umuman ruxsat bermaydi:
         * aks holda push yashirin kuzatuv vositasiga aylanardi.
         */
        userVisibleOnly: true,
        applicationServerKey: toKeyBytes(publicKey),
      });

      const raw = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

      await request('/api/v1/notifications/push', {
        method: 'POST',
        body: {
          endpoint: raw.endpoint,
          keys: { p256dh: raw.keys?.p256dh, auth: raw.keys?.auth },
          deviceLabel: detectDeviceLabel(),
        },
      });

      setState('on');
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsBusy(false);
    }
  }, [publicKey, request]);

  const disable = useCallback(async (): Promise<void> => {
    setIsBusy(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await request('/api/v1/notifications/push', {
          method: 'DELETE',
          body: { endpoint: subscription.endpoint },
        });

        /**
         * Brauzerdagi obuna ham bekor qilinadi.
         *
         * Faqat bazadan o'chirilsa, brauzer obunani saqlab qolardi va
         * qayta yoqishda eski, allaqachon yaroqsiz manzil ishlatilardi.
         */
        await subscription.unsubscribe();
      }

      setState('off');
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsBusy(false);
    }
  }, [request]);

  return { state, error, enable, disable, isBusy };
}
