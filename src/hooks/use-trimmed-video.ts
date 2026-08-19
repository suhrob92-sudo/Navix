'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';

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
  /**
   * Kesim OXIRIGA yetilganda chaqiriladi (faqat `loop` o'chiq bo'lsa).
   *
   * ── Nima uchun bu kerak ─────────────────────────────────────────────
   * Kesilgan videoda brauzer `ended` hodisasini CHIQARMAYDI: fayl
   * oxiriga yetmagan, biz uni oldinroq to'xtatganmiz.
   *
   * Ya'ni "video tugadi" degan xabarni faqat shu hook bera oladi.
   * Usiz uzun kesilgan videodan keyingisiga avtomatik o'tish
   * ishlamasdi.
   */
  onEnded?: () => void;
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
  const { loop = false, onEnded } = options;

  /*
    Chaqiruv HAVOLASI o'zgarishi effektni qayta ulamasligi kerak.

    `onEnded` ota komponentda har qayta chizishda yangidan
    yasaladi. Uni effekt bog'liqligiga qo'shsak, hodisa
    tinglovchilari sekundiga bir necha marta uzilib-ulanardi.
  */
  const endedRef = useRef(onEnded);

  /*
    Havola EFFEKT ichida yangilanadi.

    Chizish paytida yozish React qoidasini buzadi: chizish sof
    bo'lishi kerak va uni yarim yo'lda to'xtatib, qaytadan
    boshlash mumkin. Bunday holatda ref eski qiymatda qolib
    ketishi mumkin edi.
  */
  useEffect(() => {
    endedRef.current = onEnded;
  }, [onEnded]);

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
        endedRef.current?.();

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
