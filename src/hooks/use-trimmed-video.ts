'use client';

import { useCallback, useEffect, type RefObject } from 'react';

import { readTrim } from '@/modules/feed/video-trim';

/** Kesim chegarasidagi bo'shashish (soniya). */
const EDGE_TOLERANCE = 0.25;

export interface TrimmedVideoOptions {
  /**
   * Oxiriga yetganda boshiga QAYTSINMI.
   *
   * To'liq ekranli pleyerda — ha (video takrorlanadi). Lentadagi
   * oddiy pleyerda — yo'q: u yerda odam o'qiyapti va o'zidan
   * takrorlanadigan video chalg'itardi.
   */
  loop?: boolean;
}

/**
 * Videoni KESIM ichida o'ynatadi.
 *
 * ── Nima uchun alohida hook ───────────────────────────────────────────
 * Kesim ikki joyda qo'llanadi: lentadagi oddiy pleyer va to'liq
 * ekranli "Reels" pleyeri. Har birida qo'lda yozilsa, ertaga
 * chegara mantig'i o'zgarganda bittasi eskicha qolardi — va
 * muallif kesgan qism baribir ko'rinardi.
 *
 * ── Nima uchun brauzerning o'zi buni qila olmaydi ─────────────────────
 * `<video>` elementida "shu joydan shu joygacha o'yna" degan sozlama
 * yo'q. Media Fragments (`#t=5,12`) esa faqat ba'zi brauzerlarda
 * ishlaydi va takrorlashda e'tiborga olinmaydi — ya'ni ikkinchi
 * aylanishda kesim yo'qolardi.
 *
 * ── Nima uchun ORTGA surish ham to'sib qo'yiladi ──────────────────────
 * Lentadagi pleyerda boshqaruv tugmalari bor va odam kesilgan
 * qismga qaytib bora oladi. U yerda esa muallif ko'rsatmoqchi
 * bo'lmagan kadrlar turadi.
 */
export function useTrimmedVideo(
  ref: RefObject<HTMLVideoElement | null>,
  post: { videoStartSeconds: number | null; videoEndSeconds: number | null },
  options: TrimmedVideoOptions = {},
): { rewind: () => void } {
  const { loop = false } = options;

  const start = post.videoStartSeconds;
  const end = post.videoEndSeconds;

  /**
   * Videoni BOSHIGA qaytaradi — kesim boshiga, faylning nolga emas.
   *
   * ── Nima uchun bu tashqariga chiqariladi ────────────────────────────
   * Pleyer videoni o'zi ham boshiga qaytaradi: ekrandan chiqqanda
   * odam qaytib kelganda o'rtasidan emas, boshidan ko'rishi kerak.
   *
   * U yerda `currentTime = 0` yozilsa, kesilgan qism bir lahzaga
   * ko'rinib ketardi — muallif aynan uni yashirgan edi.
   */
  const rewind = useCallback(() => {
    const element = ref.current;
    if (!element) return;

    const range = readTrim({ videoStartSeconds: start, videoEndSeconds: end });

    element.currentTime = range ? range.start : 0;
  }, [ref, start, end]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const range = readTrim({ videoStartSeconds: start, videoEndSeconds: end });

    // Kesilmagan video — hech narsa o'zgarmaydi.
    if (!range) return;

    /**
     * Boshiga qo'yish — metama'lumot yuklangandan KEYIN.
     *
     * Undan oldin `currentTime` ni o'zgartirish jimgina e'tiborsiz
     * qoldiriladi: brauzer hali videoning uzunligini bilmaydi va
     * qayerga surilishini hisoblay olmaydi.
     */
    const toStart = () => {
      element.currentTime = range.start;
    };

    const onTimeUpdate = () => {
      if (element.currentTime >= range.end) {
        if (loop) {
          toStart();

          return;
        }

        element.pause();
        toStart();

        return;
      }

      /*
        Kesilgan boshlanishga qaytib ketilgan.

        Bo'shashish kerak: brauzer `currentTime` ni aynan
        so'ralgan songa qo'ymaydi (eng yaqin kalit kadrga
        suradi) va bo'shashishsiz bu tekshiruv o'zini o'zi
        qayta-qayta ishga tushirardi.
      */
      if (element.currentTime < range.start - EDGE_TOLERANCE) toStart();
    };

    // Metama'lumot allaqachon yuklangan bo'lishi mumkin.
    if (element.readyState >= HTMLMediaElement.HAVE_METADATA) toStart();

    element.addEventListener('loadedmetadata', toStart);
    element.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      element.removeEventListener('loadedmetadata', toStart);
      element.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [ref, start, end, loop]);

  return { rewind };
}
