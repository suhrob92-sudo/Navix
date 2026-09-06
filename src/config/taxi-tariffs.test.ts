import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { TAXI_TARIFFS, TAXI_TARIFF_LIST, type TaxiTariffName } from '@/config/taxi';
import { calculateTaxiFare } from '@/modules/taxi/taxi.pricing';

/**
 * Tariflar BIR JOYDAN boshqariladi.
 *
 * ── Nima uchun bu sinov bor ───────────────────────────────────────────
 * Uchinchi tarif (Biznes) qo'shilganda TypeScript BIRORTA xato
 * bermadi, lekin uchta joy jimgina buzildi:
 *
 *  1. `ride-content.tsx` da ikki tarmoqli shart turardi
 *     ("Ekonom yoki Komfort") — Biznes safar "Komfort" deb
 *     ko'rsatilardi;
 *  2. `assistant.taxi-flow.ts` da haydovchilar soni `{ ECONOM: 0,
 *     COMFORT: 0 }` deb qo'lda yozilgandi — Biznes soni `undefined`
 *     bo'lib qolardi;
 *  3. o'sha faylda Biznes "mavjud emas" deb javob berardi.
 *
 * Uchalasi ham `as` yoki ternary tufayli tur tekshiruvidan o'tib
 * ketgandi. Bu sinov ularning qaytmasligini kafolatlaydi.
 */

/** Prisma sxemasidagi enum qiymatlari — bazadagi HAQIQAT. */
function prismaTariffs(): string[] {
  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  const block = schema.match(/enum TaxiTariff \{([\s\S]*?)\n\}/);

  if (!block) throw new Error('prisma/schema.prisma da TaxiTariff enum topilmadi');

  return block[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[A-Z_]+$/.test(line));
}

describe('taksi tariflari', () => {
  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Bazada tarif bor, sozlamada yo'q bo'lsa — `TAXI_TARIFFS[tariff]`
   * `undefined` qaytaradi va ekran "undefined so'm" ko'rsatadi.
   * Teskarisi bo'lsa — foydalanuvchi tanlagan tarif bazaga
   * yozilmaydi.
   */
  it('sozlama va baza enum bir xil', () => {
    expect([...prismaTariffs()].sort()).toEqual(Object.keys(TAXI_TARIFFS).sort());
  });

  it('har bir tarifda nom, izoh va narx bor', () => {
    for (const name of Object.keys(TAXI_TARIFFS) as TaxiTariffName[]) {
      const rate = TAXI_TARIFFS[name];

      expect(rate.label.length, name).toBeGreaterThan(0);
      expect(rate.description.length, name).toBeGreaterThan(0);
      expect(rate.baseSom, name).toBeGreaterThan(0);
      expect(rate.perKmSom, name).toBeGreaterThan(0);
      expect(rate.seats, name).toBeGreaterThan(0);
    }
  });

  it("ro'yxat sozlama bilan bir xil tartibda", () => {
    expect(TAXI_TARIFF_LIST.map((item) => item.name)).toEqual(Object.keys(TAXI_TARIFFS));
  });

  /**
   * Narxlar bir-biridan FARQ qilishi kerak.
   *
   * Ikki tarif bir xil narxda bo'lsa, tanlovning ma'nosi yo'qoladi va
   * "eng arzon" buyrug'i tasodifiy javob berardi.
   */
  it('tariflar narxi bir-biridan farq qiladi', () => {
    const prices = (Object.keys(TAXI_TARIFFS) as TaxiTariffName[]).map(
      (name) => calculateTaxiFare(name, 10).priceTiyin,
    );

    expect(new Set(prices).size).toBe(prices.length);
  });

  /**
   * Qo'lda yozilgan tarif ro'yxatlari QAYTMASIN.
   *
   * Ekranda va mantiqda tarif nomlari `TAXI_TARIFFS` dan olinishi
   * kerak. Ikki tarmoqli shart yangi tarif qo'shilganda jimgina
   * noto'g'ri javob beradi.
   */
  it("ekranlarda ikki tarmoqli tarif sharti yo'q", () => {
    const files = [
      'src/app/(cabinet)/taxi/[id]/ride-content.tsx',
      'src/modules/assistant/assistant.taxi-flow.ts',
    ];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');

      /* `tariff === 'X' ? ... : ...` naqshi — aynan shu xato edi. */
      expect(/tariff === '[A-Z_]+'\s*\?/.test(source), file).toBe(false);
    }
  });
});
