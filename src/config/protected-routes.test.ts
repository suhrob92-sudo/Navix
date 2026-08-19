import { describe, expect, it } from 'vitest';

import {
  PROTECTED_PREFIXES,
  isPublicPreviewPath,
  protectedPathPatterns,
} from '@/config/protected-routes';

const POST_ID = '3f1a6c2e-9b4d-4f8a-8c1e-2d7b5a9e0c34';

describe('isPublicPreviewPath', () => {
  it('bitta post sahifasi OCHIQ', () => {
    /*
      Ulashilgan havola Telegram va WhatsApp serverlari orqali
      ochiladi va ularda sessiya yo'q. Yopiq bo'lsa, kartochkada
      postning nomi ham, matni ham ko'rinmasdi.
    */
    expect(isPublicPreviewPath(`/feed/${POST_ID}`)).toBe(true);
  });

  it('ulashish RASMI ham ochiq', () => {
    /*
      Faqat sahifa ochilib, rasm yopiq qolsa, kartochkada rasm
      o'rnida bo'shliq qolardi — Telegram kirish sahifasining
      HTML'ini olardi.
    */
    expect(isPublicPreviewPath(`/feed/${POST_ID}/opengraph-image-6orzjm`)).toBe(true);
    expect(isPublicPreviewPath(`/feed/${POST_ID}/twitter-image-abc`)).toBe(true);
  });

  it('katta harfli ID ham ishlaydi', () => {
    expect(isPublicPreviewPath(`/feed/${POST_ID.toUpperCase()}`)).toBe(true);
  });

  it('LENTANING O\'ZI yopiq', () => {
    /*
      ── ENG MUHIM tekshiruv ────────────────────────────────────────
      Bu yerdagi xato butun lentani begonaga ochib qo'yardi. Naqsh
      prefiks bo'lib qolsa (`/feed` bilan boshlansa yetarli), aynan
      shunday bo'lardi.
    */
    expect(isPublicPreviewPath('/feed')).toBe(false);
    expect(isPublicPreviewPath('/feed/')).toBe(false);
  });

  it("SHAXSIY bo'limlar yopiq", () => {
    for (const path of [
      '/feed/saved',
      '/feed/settings',
      '/feed/settings/notifications',
      '/feed/videos',
      '/feed/watch',
      '/feed/search',
      '/feed/stats',
      '/feed/collab',
      '/feed/creators',
      '/feed/history',
      '/feed/profile',
    ]) {
      expect(isPublicPreviewPath(path), `${path} ochiq qolib ketdi`).toBe(false);
    }
  });

  it("buzuq va aldamchi manzillar yopiq", () => {
    /*
      Naqsh boshi va oxiri bilan bog'lanmagan bo'lsa, quyidagilar
      o'tib ketardi va ular orqali boshqa sahifalarni ochish
      mumkin bo'lardi.
    */
    expect(isPublicPreviewPath(`/feed/${POST_ID}/edit`)).toBe(false);
    expect(isPublicPreviewPath(`/admin/feed/${POST_ID}`)).toBe(false);
    expect(isPublicPreviewPath(`/feed/${POST_ID}x`)).toBe(false);
    expect(isPublicPreviewPath('/feed/salom')).toBe(false);
    expect(isPublicPreviewPath('/wallet')).toBe(false);
  });
});

describe('PROTECTED_PREFIXES', () => {
  it("lenta himoyalangan ro'yxatda QOLDI", () => {
    /*
      Ochiq oldindan ko'rinish faqat BITTA sahifaga tegishli.
      `/feed` ro'yxatdan chiqarilsa, butun lenta va sozlamalar ham
      ochilib qolardi.
    */
    expect(PROTECTED_PREFIXES).toContain('/feed');
  });

  it("har bir prefiks `/` bilan boshlanadi", () => {
    for (const prefix of PROTECTED_PREFIXES) {
      expect(prefix.startsWith('/'), prefix).toBe(true);
    }
  });

  it("naqshlar prefiksning O'ZINI ham, ichini ham qamraydi", () => {
    const patterns = protectedPathPatterns();

    expect(patterns).toContain('/feed');
    expect(patterns).toContain('/feed/:path*');
    expect(patterns.length).toBe(PROTECTED_PREFIXES.length * 2);
  });
});
