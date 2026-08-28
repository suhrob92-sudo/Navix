import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Bosh sahifa MAQTANMASIN.
 *
 * ── Nima uchun bu sinov bor ───────────────────────────────────────────
 * Marketing matni jimgina qaytib keladi: yangi bo'lim yozayotgan odam
 * "kuchliroq eshitilsin" deb bitta sifat qo'shadi, keyin yana bittasi.
 * Bir necha oydan keyin sahifa yana ilova haqida gapirib qoladi,
 * foydalanuvchi haqida emas.
 *
 * Quyidagi iboralar ATAYLAB olib tashlangan va qaytmasligi kerak.
 * Har birining sababi yozilgan — bu ro'yxatga yangi ibora qo'shmoqchi
 * bo'lgan odam avval sababini o'ylashi kerak.
 */

const CHECKED_FILES = ['src/app/page.tsx', 'src/config/site.ts'] as const;

/**
 * Izohlarni olib tashlaydi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Taqiqlangan iboralar aynan IZOHLARDA eslatiladi: kodda nima uchun
 * olib tashlangani yozib qo'yilgan. Izohni ham tekshirsak, sinov
 * o'sha tushuntirishning o'ziga urilib yiqilardi — ya'ni tushuntirish
 * yozishni taqiqlagan bo'lardi.
 *
 * Qolgan qism esa foydalanuvchi KO'RADIGAN matn: satrlar va JSX
 * ichidagi so'zlar.
 */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

const BANNED: readonly { phrase: string; why: string }[] = [
  {
    phrase: 'super ilova',
    why: "Ilovaning O'ZI haqida gapiradi. Odam esa 'menga nima beradi?' degan savolga javob izlaydi.",
  },
  {
    phrase: 'butun hayotingiz',
    why: "Bo'sh shior: hech qanday aniq imkoniyat aytilmaydi va tekshirib ham bo'lmaydi.",
  },
  {
    phrase: 'Millionlab foydalanuvchi',
    why: "Tekshirilmagan da'vo: yuklama sinovi o'tkazilmagan, ilova hali ishga tushmagan.",
  },
  {
    phrase: 'Reja qilingan modul',
    why: "Ichki hisob. Mijozga 'qolganlari ishlamaydi' degan ma'no beradi.",
  },
  {
    phrase: 'Taksi chaqiring',
    why: "Taksi moduli hali REJADA — bu bajarilmaydigan va'da edi.",
  },
] as const;

describe('bosh sahifa matni', () => {
  const sources = CHECKED_FILES.map((path) => ({ path, text: readFileSync(path, 'utf8') }));

  it('fayllar topildi', () => {
    // Yo'l o'zgarsa, sinov jimgina "hammasi joyida" deb qolmasin.
    for (const source of sources) {
      expect(source.text.length, `${source.path} bo'sh`).toBeGreaterThan(200);
    }
  });

  it.each(BANNED)('"$phrase" — qaytmagan', ({ phrase, why }) => {
    for (const source of sources) {
      expect(
        withoutComments(source.text).toLowerCase().includes(phrase.toLowerCase()),
        `${source.path}: "${phrase}" qaytib kelgan.\nNima uchun olib tashlangan: ${why}`,
      ).toBe(false);
    }
  });

  it('har bir taqiqning sababi yozilgan', () => {
    for (const entry of BANNED) {
      expect(entry.why.length, `${entry.phrase}: sabab juda qisqa`).toBeGreaterThan(40);
    }
  });
});
