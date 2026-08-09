import type { MetadataRoute } from 'next';

import { siteConfig } from '@/config/site';

/**
 * PWA manifesti — "Bosh ekranga qo'shish" uchun.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Navix hozircha do'konlarda emas, brauzer orqali ochiladi. Manifest
 * bo'lsa, telefon uni ilova sifatida ekranga qo'sha oladi: o'z
 * ikonkasi bilan, brauzer manzil satrisiz ochiladi.
 *
 * Instagram premyerasi uchun bu muhim: odam havolani ochib, "ekranga
 * qo'shish" tugmasini bosadi va ilova telefonida haqiqiy ilovadek
 * turadi.
 *
 * ── Nima uchun `.ts` fayl ─────────────────────────────────────────────
 * Next.js `manifest.ts` faylini `/manifest.webmanifest` manziliga
 * o'zi chiqaradi. Alohida JSON tutish shart emas va nom bilan
 * tavsif `siteConfig` dan olinadi — ikki joyda ikki xil bo'lib
 * qolmaydi.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    lang: 'uz',
    dir: 'ltr',
    /**
     * Ilova sifatida ochilganda manzil satri ko'rinmaydi.
     *
     * Kirmagan odam bosh sahifaga tushadi, kirgan odam esa
     * `proxy.ts` orqali kabinetga yo'naltiriladi.
     */
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    /**
     * Yuklanish paytidagi fon va tizim panellari rangi.
     *
     * `background_color` — ilova ochilayotganda ko'rinadigan bo'sh
     * ekran. U sayt foni bilan bir xil bo'lishi kerak, aks holda
     * ochilishda ko'zga urar sakrash bo'ladi.
     */
    background_color: '#f6f7f9',
    theme_color: '#314df5',
    categories: ['travel', 'food', 'shopping', 'finance'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      /**
       * `maskable` — Android ikonkani o'z shakliga (doira, kvadrat,
       * tomchi) kesib qo'yadi. Shuning uchun alohida nusxa: unda belgi
       * kichikroq va atrofida bo'sh joy bor, kesilganda ham butun
       * qoladi.
       */
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
