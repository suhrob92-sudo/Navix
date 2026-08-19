import { describe, expect, it } from 'vitest';

import {
  PREVIEW_BODY_LENGTH,
  isPreviewId,
  previewDescription,
} from '@/modules/feed/share-preview.service';

describe('previewDescription', () => {
  it("qisqa matn o'zgarmaydi", () => {
    expect(previewDescription('Yangi burger keldi', false)).toBe('Yangi burger keldi');
  });

  it('uzun matn KESILADI va chegaradan oshmaydi', () => {
    /*
      Telegram va WhatsApp kartochkasida matn uchun cheklangan joy
      bor. Uzun matn kesilmasa, kartochkaning o'zi kesilib,
      oxirgi so'zlar butunlay yo'qolardi.
    */
    const text = previewDescription('a'.repeat(500), false);

    expect(text.length).toBe(PREVIEW_BODY_LENGTH);
    expect(text.endsWith('…')).toBe(true);
  });

  it("qator uzilishlari BITTA bo'shliqqa aylanadi", () => {
    /*
      Kartochka bir necha qatorli matnni o'zi joylashtiradi.
      Postdagi qator uzilishlari qolsa, kartochkada g'alati
      bo'shliqlar paydo bo'lardi.
    */
    expect(previewDescription('Birinchi\n\nIkkinchi', false)).toBe('Birinchi Ikkinchi');
    expect(previewDescription('Ko\'p    bo\'shliq', false)).toBe("Ko'p bo'shliq");
  });

  it("MATNSIZ postda ma'noli yozuv qoladi", () => {
    /*
      Faqat videodan yoki rasmdan iborat post bo'lishi mumkin.
      Kartochka bo'sh chiqsa, havola tashlab ketilgandek
      ko'rinardi.
    */
    expect(previewDescription('', true)).toBe('Navixda video');
    expect(previewDescription('   ', false)).toBe('Navixdagi post');
  });

  it('chegaradagi matn kesilmaydi', () => {
    const exact = 'b'.repeat(PREVIEW_BODY_LENGTH);

    expect(previewDescription(exact, false)).toBe(exact);
  });
});

describe('isPreviewId', () => {
  it("to'g'ri ID qabul qilinadi", () => {
    expect(isPreviewId('3f1a6c2e-9b4d-4f8a-8c1e-2d7b5a9e0c34')).toBe(true);
  });

  it('buzuq ID RAD etiladi', () => {
    /*
      Bu manzil ochiq va unga istalgan qiymat kelishi mumkin.
      Tekshirilmasa, har buzuq havola jurnalga xato yozardi.
    */
    expect(isPreviewId('salom')).toBe(false);
    expect(isPreviewId('../admin')).toBe(false);
    expect(isPreviewId('')).toBe(false);
    expect(isPreviewId('3f1a6c2e-9b4d-4f8a-8c1e-2d7b5a9e0c34x')).toBe(false);
  });

  it('katta harfli ID ham qabul qilinadi', () => {
    // Havola qo'lda ko'chirilganda harflar katta bo'lib qolishi mumkin.
    expect(isPreviewId('3F1A6C2E-9B4D-4F8A-8C1E-2D7B5A9E0C34')).toBe(true);
  });
});
