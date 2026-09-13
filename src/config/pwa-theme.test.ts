import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from '@/config/pwa';

/**
 * Brauzer sarlavhasining rangi ilova foniga TENGmi.
 *
 * ── Nima uchun matn solishtiruvi YETARLI EMAS ─────────────────────────
 * Avvalgi sinov "`layout.tsx` ichida shu son bormi?" deb tekshirardi.
 * Palitra ikki marta almashtirilganda ikkala joy ham BIR XIL DARAJADA
 * eskirdi — sinov esa "toza" deb chiqaverdi.
 *
 * Bu sinov boshqacha: `globals.css` dagi HAQIQIY `--background`
 * qiymatini o'qiydi, OKLCH dan sRGB ga o'giradi va solishtiradi.
 * Ya'ni u ikki faylni emas, RANGNI o'lchaydi.
 */

const CSS = readFileSync('src/app/globals.css', 'utf8');

/**
 * Blok ichidan `--background` ning OKLCH qiymatini oladi.
 *
 * `:root { ... }` va `.dark { ... }` bloklari faylda bir martadan
 * uchraydi va ikkalasida ham `--background` birinchi qiymat.
 */
function backgroundOf(selector: string): [number, number, number] {
  const start = CSS.indexOf(`${selector} {`);
  expect(start, `${selector} bloki topilmadi`).toBeGreaterThan(-1);

  const block = CSS.slice(start, CSS.indexOf('\n}', start));
  const match = block.match(/--background:\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  expect(match, `${selector} ichida --background topilmadi`).not.toBeNull();

  return [Number(match![1]), Number(match![2]), Number(match![3])];
}

/**
 * OKLCH -> sRGB hex.
 *
 * Formula OKLab ning rasmiy matritsalari (Bjorn Ottosson). Taxmin
 * emas — hisob: shuning uchun sinov "rang shunga o'xshaydi" emas,
 * "rang AYNAN shu" deya oladi.
 */
function oklchToHex(L: number, C: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  return `#${linear
    .map((v) => {
      const encoded = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
      const byte = Math.max(0, Math.min(255, Math.round(encoded * 255)));
      return byte.toString(16).padStart(2, '0');
    })
    .join('')}`;
}

describe('brauzer sarlavhasining rangi', () => {
  it("o'girgich ma'lum qiymatda to'g'ri ishlaydi", () => {
    /*
      Avval O'LCHAGICHNI tekshiramiz. U noto'g'ri bo'lsa, quyidagi
      ikki sinov ham noto'g'ri "toza" berardi — aynan shu tuzoqqa
      bir marta tushilgan.
    */
    expect(oklchToHex(1, 0, 0)).toBe('#ffffff');
    expect(oklchToHex(0, 0, 0)).toBe('#000000');
  });

  it("yorug' mavzu rangi fonga teng", () => {
    const [L, C, H] = backgroundOf(':root');

    expect(oklchToHex(L, C, H)).toBe(THEME_COLOR_LIGHT);
  });

  it("qorong'i mavzu rangi fonga teng", () => {
    const [L, C, H] = backgroundOf('.dark');

    expect(oklchToHex(L, C, H)).toBe(THEME_COLOR_DARK);
  });
});
