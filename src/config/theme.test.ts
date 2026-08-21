import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Mavzu ranglarining O'QILISHI.
 *
 * ── Nima uchun bu sinov bor ───────────────────────────────────────────
 * Yorug' mavzuda "muvaffaqiyat" va "ogohlantirish" ranglari juda och
 * edi. Ular MATN sifatida ham ishlatiladi ("Mavjud", "Tugagan"),
 * shuning uchun o'lchov WCAG talabini bajarmasligini ko'rsatdi:
 *
 *     yashil 3.00, sariq 2.28   (kerak: 4.5)
 *
 * Yorug' xonada telefon ekranida ular deyarli o'qilmasdi.
 *
 * ── Nima uchun QIYMAT emas, KONTRAST tekshiriladi ─────────────────────
 * "L 0.48 bo'lsin" degan sinov yozish mumkin edi. Lekin u nima uchun
 * aynan shu son ekanini tushuntirmasdi va rang toni (`chroma`, `hue`)
 * o'zgarganda buzilishni sezmasdi.
 *
 * Shuning uchun sinov haqiqiy hisobni bajaradi: rang OKLCH dan sRGB ga
 * o'giriladi va WCAG nisbati o'lchanadi.
 */

/** Bitta OKLCH rangni chiziqli sRGB ga o'giradi. */
function oklchToLinearRgb(l: number, c: number, hDegrees: number): [number, number, number] {
  const h = (hDegrees * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const lCone = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mCone = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sCone = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone,
    -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone,
    -0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone,
  ];
}

/** WCAG "nisbiy yorqinlik" — chiziqli qiymatlar ustida hisoblanadi. */
function luminance([r, g, b]: [number, number, number]): number {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const first = luminance(a);
  const second = luminance(b);

  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** `globals.css` dan `:root` blokidagi qiymatni o'qiydi. */
function readLightToken(name: string): [number, number, number] {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const root = css.slice(css.indexOf(':root {'), css.indexOf('.dark {'));
  const match = root.match(new RegExp(`--${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`));

  if (!match) throw new Error(`${name} topilmadi`);

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Oq kartochka foni — holat ranglari eng ko'p shu ustida turadi. */
const WHITE: [number, number, number] = [1, 1, 1];

/** WCAG AA: oddiy o'lchamdagi matn uchun eng kam nisbat. */
const AA_TEXT = 4.5;

describe('yorug\' mavzudagi holat ranglari', () => {
  it('"muvaffaqiyat" rangi oq fonda o\'qiladi', () => {
    const [l, c, h] = readLightToken('success');

    expect(contrast(oklchToLinearRgb(l, c, h), WHITE)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('"ogohlantirish" rangi oq fonda o\'qiladi', () => {
    const [l, c, h] = readLightToken('warning');

    expect(contrast(oklchToLinearRgb(l, c, h), WHITE)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('"xato" rangi oq fonda o\'qiladi', () => {
    // Bu rang avval ham talabni bajarardi — sinov uni SHUNDAY qoldiradi.
    const [l, c, h] = readLightToken('destructive');

    expect(contrast(oklchToLinearRgb(l, c, h), WHITE)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('ranglar o\'z ma\'nosini yo\'qotmadi (kulrangga aylanmadi)', () => {
    /*
      Kontrastni oshirishning eng oson yo'li — rangni butunlay to'q
      qilish. Lekin u holda yashil ham, sariq ham qora bo'lib
      qolardi va nishonlar bir-biridan farq qilmasdi.
    */
    for (const name of ['success', 'warning', 'destructive']) {
      const [, chroma] = readLightToken(name);

      expect(chroma).toBeGreaterThan(0.1);
    }
  });
});

describe('brauzer elementlari mavzuga moslashadi', () => {
  it('color-scheme ikkala mavzu uchun ham e\'lon qilingan', () => {
    /*
      Aytilmasa, brauzer `<select>` ro'yxatini va surish panelini
      har doim YORUG' qilib chizadi — qorong'i mavzuda ular oppoq
      yaltirab ketardi.
    */
    const css = readFileSync('src/app/globals.css', 'utf8');

    expect(css).toMatch(/:root\s*\{\s*color-scheme:\s*light/);
    expect(css).toMatch(/\.dark\s*\{\s*color-scheme:\s*dark/);
  });
});
