import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Bosish maydonini kengaytiradigan sinflar — 44px qoidasi.
 *
 * ── HAQIQIY XATO ──────────────────────────────────────────────────────
 * `content` faqat `.tap-target::after` da turardi. Ya'ni
 * `tap-target-y` ni YOLG'IZ yozgan element uchun ko'rinmas qatlam
 * umuman yaratilmasdi va bosish maydoni kichikligicha qolardi.
 *
 * Xato JIM edi: sinf yozilgan, ekranda hammasi joyida ko'rinadi,
 * lekin barmoq uchun hech narsa o'zgarmagan. Loyihada uchta joy shu
 * tuzoqqa tushgan edi va ularni faqat brauzer o'lchovi topdi.
 *
 * Bu sinov qoidaning qaytmasligini kafolatlaydi.
 */
const CSS = readFileSync('src/app/globals.css', 'utf8');

/** `@layer utilities` ichidagi bosish maydoni qismini ajratamiz. */
const BLOCK = CSS.slice(CSS.indexOf('.tap-target,'), CSS.indexOf('Pastki menyu bilan'));

describe('bosish maydoni sinflari', () => {
  it('ikkala sinf ham `content` qatlamini yaratadi', () => {
    /*
      `content` bitta e'londa ikkala tanlagich uchun berilishi
      kerak — aks holda biri jimgina ishlamay qoladi.
    */
    expect(BLOCK).toMatch(/\.tap-target::after,\s*\n\s*\.tap-target-y::after\s*\{[\s\S]*?content:\s*''/);
  });

  it('ikkala sinf ham `position: relative` oladi', () => {
    expect(BLOCK).toMatch(/\.tap-target,\s*\n\s*\.tap-target-y\s*\{[\s\S]*?position:\s*relative/);
  });

  it("o'lcham 44px dan kam emas", () => {
    expect(BLOCK).toContain('min-width: 44px');
    expect(BLOCK).toContain('min-height: 44px');
  });

  it('`tap-target-y` faqat kenglikni bekor qiladi', () => {
    /*
      Balandlik qolishi SHART: bu sinfning butun maqsadi —
      yonma-yon turgan tugmalarda faqat balandlikni kengaytirish.
    */
    const override = BLOCK.slice(BLOCK.lastIndexOf('.tap-target-y::after'));

    expect(override).toContain('min-width: 0');
    expect(override).not.toContain('min-height');
  });
});
