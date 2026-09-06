import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Buyruqlarni TANIYDIGAN so'zlar faqat LOTIN harfida bo'lsin.
 *
 * ── Nima uchun bu sinov bor ───────────────────────────────────────────
 * Kirill "к" (U+043A) va lotin "k" (U+006B) ekranda BIR XIL
 * ko'rinadi, lekin kompyuter uchun ular butunlay boshqa harf.
 *
 * `intent.ts` da aynan shu sodir bo'lgan edi:
 *
 *     words: ['elektr', 'svet', 'svetga', 'yorugliк', 'toк']
 *                                              ↑ kirill  ↑ kirill
 *
 * Natijada "tokka 50 ming to'la" degan odam hech qachon elektr
 * provayderiga tushmasdi. Kod to'g'ri ko'rinardi, sinovlar yashil
 * edi — chunki sinovni yozgan odam ham o'sha faylni nusxalagan.
 *
 * Xato 55-bosqichda tasodifan topildi. Bu sinov uni qaytmasligini
 * kafolatlaydi.
 *
 * ── Nima uchun butun fayl tekshiriladi ────────────────────────────────
 * Faqat so'z ro'yxatlarini ajratib olish mumkin edi, lekin
 * IZOHLARDA ham kirill harfi bo'lmasligi kerak: loyiha o'zbek
 * tilining LOTIN yozuvida yuritiladi va aralashuv keyingi
 * nusxalashda yana kodga o'tib ketardi.
 */

/** Kirill alifbosi diapazoni. */
const CYRILLIC = /[Ѐ-ӿ]/g;

/**
 * Tekshiriladigan fayllar.
 *
 * Bular foydalanuvchi matnini SO'ZMA-SO'Z solishtiradigan joylar —
 * bitta noto'g'ri harf butun qoidani o'chirib qo'yadi.
 */
const FILES = [
  'src/modules/assistant/intent.ts',
  'src/modules/assistant/assistant.modules.ts',
  'src/modules/assistant/assistant.taxi-flow.ts',
  'src/config/modules.ts',
  'src/config/search-groups.ts',
];

describe('buyruq so\'zlari lotin harfida', () => {
  it.each(FILES)('%s da kirill harfi yo\'q', (file) => {
    const source = readFileSync(file, 'utf8');
    const found = source.match(CYRILLIC);

    /*
      Xato xabari TOPILGAN harflarni ko'rsatadi: aks holda ularni
      qidirib topish juda qiyin — ular lotin harfidan farq qilmaydi.
    */
    expect(found === null ? [] : [...new Set(found)]).toEqual([]);
  });

  /**
   * Sinov ISHONCHLI ekanini isbotlaydi.
   *
   * Tekshiruv har doim bo'sh natija bersa, yuqoridagilar ma'nosiz
   * bo'lardi.
   */
  it('kirill harfini haqiqatan topa oladi', () => {
    expect('toк'.match(CYRILLIC)).not.toBeNull();
    expect('tok'.match(CYRILLIC)).toBeNull();
  });
});
