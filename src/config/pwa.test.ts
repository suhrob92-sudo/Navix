import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  ASSET_CACHE,
  CACHEABLE_DESTINATIONS,
  CACHE_VERSION,
  MAX_CACHED_IMAGES,
  OFFLINE_PATH,
  PWA_BACKGROUND_COLOR,
  PWA_SHORTCUTS,
  PWA_SHORT_NAME,
  PWA_START_URL,
  PWA_THEME_COLOR,
  SHELL_CACHE,
} from '@/config/pwa';

/**
 * Ilovani telefonga o'rnatish sozlamalari.
 *
 * ── Nima uchun bu sinovlar bor ────────────────────────────────────────
 * Xizmat ishchisi (`public/sw.js`) — oddiy JavaScript fayli. U
 * TypeScript sozlamasidan `import` qila olmaydi, chunki brauzer uni
 * to'g'ridan-to'g'ri, qurishdan o'tkazmasdan yuklaydi.
 *
 * Ya'ni sonlar IKKI joyda yozilgan. Ular ajralib qolsa oqibati
 * jimgina bo'ladi: kesh nomi mos kelmay, eski kesh tozalanmasdan
 * qolib ketardi va foydalanuvchi eski kodni ko'rib turaverardi.
 *
 * Shuning uchun sinov ikkala faylni O'QIYDI va taqqoslaydi.
 */

const serviceWorker = readFileSync('public/sw.js', 'utf8');

describe('xizmat ishchisi sozlama bilan mos', () => {
  it('kesh versiyasi bir xil', () => {
    expect(serviceWorker).toContain(`const CACHE_VERSION = '${CACHE_VERSION}'`);
  });

  it('kesh nomlari bir xil qoidada quriladi', () => {
    /*
      Nomlar shablon orqali quriladi, shuning uchun natijani
      tekshiramiz: `navix-shell-v1` va `navix-assets-v1`.
    */
    expect(SHELL_CACHE).toBe(`navix-shell-${CACHE_VERSION}`);
    expect(ASSET_CACHE).toBe(`navix-assets-${CACHE_VERSION}`);
    expect(serviceWorker).toContain('navix-shell-${CACHE_VERSION}');
    expect(serviceWorker).toContain('navix-assets-${CACHE_VERSION}');
  });

  it('oflayn sahifa manzili bir xil', () => {
    expect(serviceWorker).toContain(`const OFFLINE_PATH = '${OFFLINE_PATH}'`);
  });

  it('rasm chegarasi bir xil', () => {
    expect(serviceWorker).toContain(`const MAX_CACHED_IMAGES = ${MAX_CACHED_IMAGES}`);
  });

  it('keshlanadigan turlar bir xil', () => {
    for (const destination of CACHEABLE_DESTINATIONS) {
      expect(serviceWorker).toContain(`'${destination}'`);
    }
  });
});

describe('kesh xavfsizligi', () => {
  it('API javoblari KESHLANMAYDI', () => {
    /*
      Bu ilovaning eng muhim kesh qoidasi: API javoblarida narx,
      balans va shaxsiy xabarlar bor. Ularning eskisi foydali
      emas, ZARARLI.

      Qoida tasodifan olib tashlansa, sinov darhol yiqiladi.
    */
    expect(serviceWorker).toContain("url.pathname.startsWith('/api/')");
  });

  it('faqat O\'QISH so\'rovlari keshlanadi', () => {
    // `POST`/`DELETE` ma'lumotni o'zgartiradi — ularni keshlab bo'lmaydi.
    expect(serviceWorker).toContain("request.method !== 'GET'");
  });

  it('begona domen keshlanmaydi', () => {
    /*
      Rasm saqlash xizmati (Vercel Blob) boshqa domenda. Uni
      keshlash bizning nazoratimizdan tashqaridagi javoblarni
      saqlash degani bo'lardi.
    */
    expect(serviceWorker).toContain('url.origin !== self.location.origin');
  });

  it('HTML sahifalar keshga YOZILMAYDI', () => {
    /*
      Sahifa ichida foydalanuvchi ma'lumoti bo'ladi. Umumiy keshda
      saqlansa, bitta telefonni ikki kishi ishlatganda birinchisining
      ma'lumoti ikkinchisiga ko'rinardi.

      Shuning uchun `navigate` so'rovida faqat OFLAYN sahifa
      qaytariladi, javobning o'zi keshga yozilmaydi.
    */
    const navigateBlock = serviceWorker.slice(
      serviceWorker.indexOf("request.mode === 'navigate'"),
      serviceWorker.indexOf('const isAsset'),
    );

    expect(navigateBlock).not.toContain('cache.put');
  });

  it('faqat MUVAFFAQIYATLI javob keshlanadi', () => {
    // 404 yoki 500 keshlansa, vaqtinchalik xato abadiy bo'lib qolardi.
    expect(serviceWorker).toContain('if (response.ok)');
  });
});

describe('ma\'lumotnoma (manifest)', () => {
  it('ochilish sahifasi tanishtiruv EMAS', () => {
    /*
      `/` — yangi mehmon uchun tanishtiruv sahifasi. Ilovani
      o'rnatgan odam esa har safar uni o'qishni xohlamaydi.
    */
    expect(PWA_START_URL).not.toBe('/');
    expect(PWA_START_URL.startsWith('/')).toBe(true);
  });

  it('qisqa nom belgi ostiga sig\'adi', () => {
    // 12 belgidan ko'pi "..." bilan kesiladi.
    expect(PWA_SHORT_NAME.length).toBeLessThanOrEqual(12);
  });

  it('ranglar bir xil qoidada yozilgan', () => {
    expect(PWA_THEME_COLOR).toMatch(/^#[0-9a-f]{6}$/);
    expect(PWA_BACKGROUND_COLOR).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('interfeys rangi qorong\'i mavzu foniga teng', () => {
    /*
      Ular ajralib qolsa, ilova ochilganda rang bir zumga
      sakrab o'zgarardi.
    */
    const css = readFileSync('src/app/layout.tsx', 'utf8');

    expect(css).toContain(PWA_THEME_COLOR);
  });

  it('tezkor yo\'llar to\'rttadan oshmaydi', () => {
    /*
      Android odatda faqat to'rttasini ko'rsatadi. Uzun ro'yxat
      hech qayerda to'liq ko'rinmaydi.
    */
    expect(PWA_SHORTCUTS.length).toBeLessThanOrEqual(4);
  });

  it('har bir tezkor yo\'lda nom, manzil va izoh bor', () => {
    for (const shortcut of PWA_SHORTCUTS) {
      expect(shortcut.name.trim().length).toBeGreaterThan(0);
      expect(shortcut.url.startsWith('/')).toBe(true);
      expect(shortcut.description.trim().length).toBeGreaterThan(0);
    }
  });
});
