import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * XARITA USTIDAGI belgilar har ikki mavzuda ham KO'RINISHI kerak.
 *
 * ── Muammo qayerdan chiqadi ───────────────────────────────────────────
 * Xarita kafellari OpenStreetMap dan keladi va ular HAR DOIM och
 * rangda — foydalanuvchi qorong'i mavzuni yoqqan bo'lsa ham. Kafel
 * rangini biz boshqarmaymiz.
 *
 * Kafel ustidagi belgi esa mavzu bilan o'zgarsa, ular bir-biriga mos
 * kelmay qoladi:
 *
 *     <line className="stroke-foreground" />
 *
 * Och mavzuda `foreground` qora — chiziq ko'rinadi. Qorong'i mavzuda
 * u OQARADI va ostidagi oq halqa bilan qo'shilib ketadi — yo'l
 * butunlay yo'qoladi.
 *
 * Aynan shu 54-bosqichda sodir bo'ldi va uni SINOV emas, EKRAN RASMI
 * ushladi. Bu sinov o'sha holatni qotirib qo'yadi.
 *
 * ── IKKI to'g'ri yechim bor ───────────────────────────────────────────
 * 1. Belgilarga QOTIB yozilgan rang berish (taksi xaritalari shunday);
 * 2. Kafel ustiga PARDA tashlash — o'shanda fon ham mavzu bilan
 *    o'zgaradi va ustidagi belgilar unga mos qoladi
 *    (`delivery-map.tsx` shunday qilingan).
 *
 * Sinov shuni talab qiladi: fayl yo pardaga ega bo'lsin, yo mavzuga
 * bog'liq rang ishlatmasin. Ikkalasi ham yo'q bo'lsa — bu xato.
 */

const MAP_DIR = 'src/components/map';

/**
 * Mavzu bilan O'ZGARADIGAN sinflar.
 *
 * Har biri och va qorong'i rejimda boshqa rang beradi.
 */
const THEME_DEPENDENT = [
  'stroke-foreground',
  'border-foreground',
  'bg-foreground',
  'text-foreground',
  'ring-foreground',
  'stroke-background',
  'border-background',
  'bg-background',
  'text-background',
  'ring-background',
  'text-muted-foreground',
  'bg-card',
];

/**
 * "Parda bor" degan belgi.
 *
 * Kafellar ustidagi to'liq qoplaydigan qatlam qorong'i rejimda
 * quyuqlashsa, ustidagi belgilar ham mavzuga ergashishi mumkin.
 */
const SCRIM_MARKER = /absolute inset-0 bg-\S+ dark:bg-\S+/;

/**
 * Xarita RAMKASIDAN tashqaridagi boshqaruvlar.
 *
 * Yaqinlashtirish tugmalari kafel ustida emas, chetida turadi —
 * ular mavzuga ergashishi TO'G'RI.
 */
const OUTSIDE_MAP = ['bg-background/90 text-foreground border-border'];

/**
 * Izohlarni olib tashlaydi.
 *
 * Izohda muammoli sinf NOMI yozilishi mumkin — aynan shu qoidani
 * tushuntirish uchun. Uni xato deb hisoblash tushuntirishni
 * yozishni taqiqlab qo'yardi.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function mapFiles(): string[] {
  return readdirSync(MAP_DIR)
    .filter((name) => name.endsWith('.tsx'))
    .map((name) => join(MAP_DIR, name));
}

describe('xarita ustidagi belgilar', () => {
  it('kamida ikkita xarita komponenti bor', () => {
    expect(mapFiles().length).toBeGreaterThanOrEqual(2);
  });

  it("parda ham, qotirilgan rang ham yo'q xarita bo'lmaydi", () => {
    const problems: string[] = [];

    for (const file of mapFiles()) {
      const source = readFileSync(file, 'utf8');

      /* Pardali xaritada mavzuga ergashish to'g'ri — tekshirilmaydi. */
      if (SCRIM_MARKER.test(source)) continue;

      withoutComments(source)
        .split('\n')
        .forEach((line, index) => {
          if (OUTSIDE_MAP.some((allowed) => line.includes(allowed))) return;

          for (const token of THEME_DEPENDENT) {
            if (line.includes(token)) {
              problems.push(`${file}:${index + 1} — "${token}"`);
            }
          }
        });
    }

    expect(problems).toEqual([]);
  });

  /**
   * Yuqoridagi sinov ISHONCHLI ekanini isbotlaydi.
   *
   * Tekshiruv har doim bo'sh ro'yxat qaytarsa, birinchi sinov
   * ma'nosiz bo'lardi.
   */
  it('muammoli sinfni haqiqatan topa oladi', () => {
    const sample = '<line className="stroke-foreground" />';

    expect(THEME_DEPENDENT.some((token) => sample.includes(token))).toBe(true);
  });

  it('izoh ichidagi sinf nomini xato deb hisoblamaydi', () => {
    const sample = "/* `stroke-foreground` ishlatmang */\n<line stroke=\"#111827\" />";

    expect(withoutComments(sample).includes('stroke-foreground')).toBe(false);
  });
});
