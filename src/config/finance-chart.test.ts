import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { FINANCE_CATEGORIES, MAX_CHART_SLICES, OTHER_CATEGORY, rampColor } from '@/config/finance';

/**
 * Moliya diagrammasi — buzilishi JIM bo'ladigan qoidalar.
 *
 * ── Nima uchun bu sinov bor ───────────────────────────────────────────
 * Diagramma bilan bog'liq uchta xato TypeScript'dan o'tib ketadi:
 *
 *  1. Diagramma `aria-hidden` — ya'ni ekran o'qiydigan dastur undan
 *     HECH NARSA o'qimaydi. Agar ekranda uning yonidagi matnli
 *     ro'yxat o'chirilsa, ko'r odam uchun sahifa BO'SH bo'lib
 *     qoladi va buni hech qanday tur tekshiruvi sezmaydi;
 *
 *  2. `globals.css` dagi `--finance-N` o'zgaruvchilari `rampColor`
 *     qaytaradigan nomlarga mos bo'lmasa, ustunlar RANGSIZ chiziladi
 *     (brauzer noma'lum o'zgaruvchini jimgina tashlab ketadi);
 *
 *  3. Qorong'i rejim uchun shkala yozilmasa, to'q fonda to'q
 *     ko'k ustun ko'rinmay qoladi.
 */

const CHART = readFileSync('src/components/finance/spending-chart.tsx', 'utf8');
const SCREEN = readFileSync('src/app/(cabinet)/finance/finance-content.tsx', 'utf8');
const CSS = readFileSync('src/app/globals.css', 'utf8');

describe('moliya diagrammasi', () => {
  it("diagramma ekran o'qiydigan dasturdan yashiriladi", () => {
    expect(CHART).toContain('aria-hidden');
  });

  it("diagramma yonida MATNLI ro'yxat ham bo'ladi", () => {
    /*
      Ikkalasi ham bo'lishi SHART: diagramma ko'z uchun, ro'yxat
      esa ekran o'qiydigan dastur uchun yagona manba.
    */
    expect(SCREEN).toContain('<SpendingChart');
    expect(SCREEN).toContain('<CategoryList');
  });

  it("shkalaning har bir qadami CSS da e'lon qilingan", () => {
    /* `rampColor` qaytaradigan hamma nomni yig'amiz. */
    const names = new Set<string>();

    for (let index = 0; index <= 20; index += 1) {
      names.add(rampColor(index, 20));
    }

    expect(names.size).toBeGreaterThan(1);

    for (const name of names) {
      const variable = name.replace('var(', '').replace(')', '');

      expect(CSS, `${variable} globals.css da yo'q`).toContain(`${variable}:`);
    }
  });

  it("qorong'i rejim uchun shkala alohida yozilgan", () => {
    const dark = CSS.slice(CSS.indexOf('--finance-1'));

    expect(dark).toContain('.dark');
  });

  it("eng katta summa eng to'q qadamni oladi", () => {
    expect(rampColor(100, 100)).toBe('var(--finance-5)');
    expect(rampColor(1, 100)).toBe('var(--finance-1)');
  });

  it("nol bo'lganda bo'linish xatosi bo'lmaydi", () => {
    expect(rampColor(0, 0)).toBe('var(--finance-1)');
  });

  it('toifa kodlari takrorlanmaydi', () => {
    const codes = FINANCE_CATEGORIES.map((item) => item.code);

    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).not.toContain(OTHER_CATEGORY.code);
  });

  it("diagrammada ko'rsatiladigan ustunlar soni cheklangan", () => {
    /*
      Telefon ekraniga sig'adigan chegara. O'zgartirilsa, bu sinov
      buni ataylab qilinganini so'raydi.
    */
    expect(MAX_CHART_SLICES).toBeLessThanOrEqual(6);
  });
});
