/**
 * Suhbat oynasining fonlari.
 *
 * ── Nima uchun bu bor ─────────────────────────────────────────────────
 * WhatsApp va Telegram'da fon almashtirish — eng ko'p ishlatiladigan
 * sozlamalardan biri. Sababi oddiy: chat kunning katta qismida ochiq
 * turadi va u odamning "o'z joyi"ga aylanadi.
 *
 * ── Nima uchun RASM emas, CSS ─────────────────────────────────────────
 * Rasm fon har suhbat ochilganda yuklanardi. O'zbekistondagi mobil
 * internetda bu chatning ochilishini sezilarli kechiktirardi va har
 * safar trafik sarflardi.
 *
 * CSS bilan chizilgan fon esa: hajmi NOL, har qanday ekranga
 * moslashadi, qorong'i mavzuda o'zi to'g'rilanadi va hech qachon
 * "yuklanmoqda" holatida turmaydi.
 */

export type ChatWallpaperName = 'DEFAULT' | 'DOTS' | 'GRID' | 'WAVES' | 'PLAIN';

export interface ChatWallpaper {
  value: ChatWallpaperName;
  label: string;
  /**
   * Fon uchun CSS sinflari.
   *
   * Naqsh `background-image` orqali chiziladi. `currentColor` emas,
   * aniq rang ishlatiladi: naqsh matn rangiga bog'liq bo'lmasligi
   * kerak.
   */
  className: string;
}

export const CHAT_WALLPAPERS: readonly ChatWallpaper[] = [
  {
    value: 'DEFAULT',
    label: 'Odatiy',
    // Ilovaning umumiy foni — hech qanday naqsh yo'q.
    className: 'bg-background',
  },
  {
    value: 'DOTS',
    label: 'Nuqtalar',
    className: 'bg-background chat-wallpaper-dots',
  },
  {
    value: 'GRID',
    label: 'Katak',
    className: 'bg-background chat-wallpaper-grid',
  },
  {
    value: 'WAVES',
    label: 'Mayin',
    className: 'bg-background chat-wallpaper-waves',
  },
  {
    value: 'PLAIN',
    label: 'Sokin',
    // Puffaklar aniqroq ajralib tursin uchun biroz to'qroq fon.
    className: 'bg-secondary/70',
  },
] as const;

/**
 * Nom bo'yicha fonni topadi.
 *
 * Noma'lum nom uchun odatiy fon qaytadi: bazada eski yoki noto'g'ri
 * qiymat qolib ketsa ham suhbat oynasi fonsiz ochilib qolmasligi kerak.
 */
export function resolveWallpaper(name: string | null | undefined): ChatWallpaper {
  return CHAT_WALLPAPERS.find((item) => item.value === name) ?? CHAT_WALLPAPERS[0];
}

/** Nom haqiqiy fonmi — validatsiyada ishlatiladi. */
export function isChatWallpaperName(name: string): name is ChatWallpaperName {
  return CHAT_WALLPAPERS.some((item) => item.value === name);
}
