import type { MetadataRoute } from 'next';

import {
  PWA_BACKGROUND_COLOR,
  PWA_NAME,
  PWA_SHORTCUTS,
  PWA_SHORT_NAME,
  PWA_START_URL,
  PWA_THEME_COLOR,
} from '@/config/pwa';
import { siteConfig } from '@/config/site';

/**
 * Ilova ma'lumotnomasi (web app manifest).
 *
 * ── Nima uchun `.ts` fayl, `.json` emas ───────────────────────────────
 * Next.js bu fayldan `/manifest.webmanifest` ni o'zi yasaydi. Farqi:
 * qiymatlar sozlamadan olinadi va TypeScript ularni tekshiradi.
 *
 * JSON bo'lganda ilova nomi ikki joyda yozilardi va biri
 * o'zgarganda ikkinchisi eskirib qolardi.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PWA_NAME,
    short_name: PWA_SHORT_NAME,
    description: siteConfig.description,
    start_url: PWA_START_URL,
    /*
      Qamrov (`scope`) — ilova ichida qaysi manzillar "o'ziniki".
      `/` bo'lgani uchun butun sayt ilova ichida ochiladi va
      brauzerga sakrab chiqmaydi.
    */
    scope: '/',
    /*
      `standalone` — manzil qatorisiz, xuddi oddiy ilovadek.

      `fullscreen` ni tanlamadik: u tizim panelini ham yashiradi va
      odam soatni, batareyani ko'rmay qoladi.
    */
    display: 'standalone',
    /*
      Yon tomonga burilish TAQIQLANMAYDI.

      Video tomosha qilish va uzun jadvallarni ko'rish uchun
      gorizontal holat qulay. Majburan tik holatga qamash odamning
      tanlovini olib qo'yardi.
    */
    orientation: 'any',
    lang: siteConfig.locale,
    dir: 'ltr',
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR,
    categories: ['shopping', 'food', 'travel', 'social', 'finance'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        /*
          "Maskable" belgi — Androidning har xil shakliga moslashadi.

          Android belgini doira, kvadrat yoki tomchi shaklida
          kesadi. Oddiy belgi kesilganda chetlari yo'qolardi;
          maskable belgida esa chetlarida bo'sh joy qoldirilgan.
        */
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: PWA_SHORTCUTS.map((item) => ({
      name: item.name,
      url: item.url,
      description: item.description,
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    })),
  };
}
