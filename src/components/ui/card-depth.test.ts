import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Kartochka chuqurligi — soya qoidasining qo'riqchisi.
 *
 * ── Nima uchun qoida bitta joyda ──────────────────────────────────────
 * Ilovada 233 joyda `bg-card` ishlatilgan. Soyani har biriga qo'lda
 * yozish — 200 ta tahrir va ulardan bittasini unutish demak. Unutilgani
 * esa ekranda "tekis" bo'lib qolardi va buni faqat tasodifan payqash
 * mumkin.
 */
const CSS = readFileSync('src/app/globals.css', 'utf8');

/** `src` ichidagi barcha TSX fayllar. */
const TSX: string[] = readdirSync('src', { recursive: true, encoding: 'utf8' })
  .filter((name) => name.endsWith('.tsx'))
  .map((name) => `src/${name.split('\\').join('/')}`);

describe('kartochka soyasi', () => {
  it('ikkala mavzuda ham belgilangan', () => {
    /*
      Faqat yorug' mavzuda berilsa, qorong'ida kartochka butunlay
      tekis qolardi — u yerda fon to'q va soya ko'rinmaydi, shuning
      uchun qiymat BOSHQA bo'lishi kerak.
    */
    const root = CSS.slice(CSS.indexOf(':root {'), CSS.indexOf('\n}', CSS.indexOf(':root {')));
    const dark = CSS.slice(CSS.indexOf('.dark {'), CSS.indexOf('\n}', CSS.indexOf('.dark {')));

    expect(root).toContain('--card-shadow:');
    expect(dark).toContain('--card-shadow:');
  });

  it('uchala kartochka radiusini ham qamrab oladi', () => {
    /*
      Ilovada kartochkalar uchta radius bilan yoziladi. Bittasi
      qoldirib ketilsa, o'sha turdagi kartochkalar jimgina tekis
      qolardi.
    */
    for (const radius of ['rounded-xl', 'rounded-2xl', 'rounded-3xl']) {
      expect(CSS).toContain(`.bg-card.${radius}`);
    }
  });

  it("chiqish yo'li ochiq: qoida `components` qatlamida", () => {
    /*
      Qatlam tartibi aniqlikdan (specificity) ustun. Qoida
      `components` da tursa, `shadow-lg` yoki `shadow-none` yozilgan
      element uni bemalol bekor qiladi.

      Agar u qatlamsiz yozilsa, HECH NARSA uni bekor qila olmasdi va
      qalqib chiquvchi oynalar ham kartochka soyasini olib qolardi.
    */
    const components = CSS.slice(CSS.indexOf('@layer components {'));
    const rule = components.indexOf('.bg-card.rounded-xl');

    expect(rule).toBeGreaterThan(-1);
  });

  it('kartochkalarda ortiqcha `shadow-sm` qolmagan', () => {
    /*
      ── HAQIQIY MUAMMO ────────────────────────────────────────────────
      Taksi va haydovchi bo'limlarida 17 ta kartochkaga `shadow-sm`
      QO'LDA yozilgandi. Qatlam qoidasiga ko'ra u umumiy soyani bekor
      qiladi — ya'ni o'sha kartochkalar qolganlaridan TEKISROQ bo'lib
      qolardi. Bitta ekranda ikki xil chuqurlik.
    */
    const aybdorlar = TSX.filter((f) => {
      for (const line of readFileSync(f, 'utf8').split('\n')) {
        if (!line.includes('bg-card') || !line.includes('shadow-sm')) continue;
        if (/rounded-(xl|2xl|3xl)/.test(line)) return true;
      }
      return false;
    });

    expect(aybdorlar).toEqual([]);
  });
});
