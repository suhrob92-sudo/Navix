import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Yulduzlar YORUG' rejimda ko'rinishi kerak.
 *
 * ── HAQIQIY XATO ──────────────────────────────────────────────────────
 * Mehmonxona yulduzlari `amber-500` bilan chizilardi. Oq fonda bu
 * atigi 2.15:1 kontrast beradi — me'yor esa 4.5:1.
 *
 * Yulduzlar HARF sifatida chiziladi (★), ya'ni ular matn qoidasiga
 * bo'ysunadi, tasvir qoidasiga emas. Quyoshli kunda telefon
 * ekranida ular deyarli ko'rinmasdi.
 *
 * `amber-700` 5.02:1 beradi va oltin tusi saqlanadi. Qorong'i
 * rejimda esa fon to'q — u yerda `amber-500` allaqachon 5.6:1, ya'ni
 * o'zgartirish SHART EMAS.
 *
 * ── Nima uchun sinov kerak ────────────────────────────────────────────
 * Bu xato KO'ZGA ko'rinmaydi: dasturchi qorong'i rejimda ishlasa,
 * yulduzlar chiroyli ko'rinadi va muammo sezilmaydi. Uni faqat
 * o'lchov topadi.
 */
const FILES = ['src/components/hotel/hotel-card.tsx', 'src/components/hotel/hotel-map.tsx'];

describe('mehmonxona yulduzlarining kontrasti', () => {
  for (const file of FILES) {
    const source = readFileSync(file, 'utf8');

    it(`${file} — yorug' rejimda to'q oltin`, () => {
      /*
        Yorug' rejim uchun `amber-500` yoki undan ochiqrog'i
        yolg'iz ishlatilmasligi kerak.
      */
      expect(source).not.toMatch(/(?<!dark:)text-amber-[2-5]00/);
      expect(source).not.toMatch(/(?<!dark:)fill-amber-[2-5]00/);
    });

    it(`${file} — qorong'i rejim uchun alohida rang bor`, () => {
      expect(source).toMatch(/dark:text-amber-\d00/);
    });
  }
});
