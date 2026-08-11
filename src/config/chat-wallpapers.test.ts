import { describe, expect, it } from 'vitest';

import { CHAT_WALLPAPERS, isChatWallpaperName, resolveWallpaper } from '@/config/chat-wallpapers';

describe('CHAT_WALLPAPERS', () => {
  it('nomlar takrorlanmaydi', () => {
    const values = CHAT_WALLPAPERS.map((item) => item.value);

    expect(new Set(values).size).toBe(values.length);
  });

  /**
   * Bazadagi ustun `VarChar(20)`.
   *
   * Uzunroq nom qo'shilsa, sozlama saqlanmasdan xato bilan tugardi —
   * va buni faqat foydalanuvchi topardi.
   */
  it("nom 20 belgidan oshmaydi", () => {
    for (const wallpaper of CHAT_WALLPAPERS) {
      expect(wallpaper.value.length).toBeLessThanOrEqual(20);
    }
  });

  it('har bir fonda nom va CSS sinfi bor', () => {
    for (const wallpaper of CHAT_WALLPAPERS) {
      expect(wallpaper.label.length).toBeGreaterThan(0);
      expect(wallpaper.className.length).toBeGreaterThan(0);
    }
  });
});

describe('resolveWallpaper', () => {
  it('nom bo’yicha topadi', () => {
    expect(resolveWallpaper('DOTS').value).toBe('DOTS');
  });

  /**
   * Bazada eski yoki buzilgan qiymat qolib ketishi mumkin. Shunda
   * suhbat oynasi fonsiz (sinfsiz) ochilib qolmasligi kerak.
   */
  it("noma'lum qiymat uchun odatiy fon", () => {
    expect(resolveWallpaper('KOSMOS').value).toBe('DEFAULT');
    expect(resolveWallpaper(null).value).toBe('DEFAULT');
    expect(resolveWallpaper(undefined).value).toBe('DEFAULT');
  });
});

describe('isChatWallpaperName', () => {
  it('haqiqiy nomni tasdiqlaydi', () => {
    expect(isChatWallpaperName('GRID')).toBe(true);
  });

  it("begona nomni rad etadi", () => {
    expect(isChatWallpaperName('grid')).toBe(false);
    expect(isChatWallpaperName('')).toBe(false);
  });
});
