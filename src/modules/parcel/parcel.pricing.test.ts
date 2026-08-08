import { describe, expect, it } from 'vitest';

import { DELIVERY_TARIFF } from '@/config/delivery';
import { calculateParcelPrice, isWeightAllowed } from '@/modules/parcel/parcel.pricing';

const TOSHKENT = 'Toshkent shahri';
const SAMARQAND = 'Samarqand';

describe('calculateParcelPrice — posilka narxi', () => {
  it('bir hudud ichida asosiy tarif', () => {
    const price = calculateParcelPrice({ fromRegion: TOSHKENT, toRegion: TOSHKENT, weightGrams: 500 });

    expect(price.breakdown.isCrossRegion).toBe(false);
    expect(price.breakdown.baseSom).toBe(DELIVERY_TARIFF.sameRegionSom);
    expect(price.priceTiyin).toBe(DELIVERY_TARIFF.sameRegionSom * 100);
  });

  it('hududlararo qimmatroq', () => {
    const inside = calculateParcelPrice({ fromRegion: TOSHKENT, toRegion: TOSHKENT, weightGrams: 500 });
    const across = calculateParcelPrice({ fromRegion: TOSHKENT, toRegion: SAMARQAND, weightGrams: 500 });

    expect(across.breakdown.isCrossRegion).toBe(true);
    expect(across.priceTiyin).toBeGreaterThan(inside.priceTiyin);
  });

  /**
   * ENG MUHIM TEKSHIRUV — 1.
   *
   * Kiritilgan og'irlik chegaraga TENG bo'lsa, qo'shimcha to'lov
   * bo'lmasligi kerak. Bu klassik "bir birlik farq" (off-by-one)
   * xatosi joyi.
   */
  it('kiritilgan og\'irlikkacha qo\'shimcha yo\'q', () => {
    const price = calculateParcelPrice({
      fromRegion: TOSHKENT,
      toRegion: TOSHKENT,
      weightGrams: DELIVERY_TARIFF.includedWeightGrams,
    });

    expect(price.breakdown.extraKilograms).toBe(0);
    expect(price.breakdown.extraWeightSom).toBe(0);
  });

  /**
   * ENG MUHIM TEKSHIRUV — 2.
   *
   * Bir gramm oshsa ham BUTUN kilogramm hisoblanadi. Aks holda
   * 1999 gramm bepul ketardi va tarozidagi har gramm bahsga
   * aylanardi.
   */
  it('bir gramm oshsa ham butun kilogramm hisoblanadi', () => {
    const price = calculateParcelPrice({
      fromRegion: TOSHKENT,
      toRegion: TOSHKENT,
      weightGrams: DELIVERY_TARIFF.includedWeightGrams + 1,
    });

    expect(price.breakdown.extraKilograms).toBe(1);
    expect(price.breakdown.extraWeightSom).toBe(DELIVERY_TARIFF.extraKilogramSom);
  });

  it('ikki kilogramm oshsa ikkita qo\'shimcha', () => {
    const price = calculateParcelPrice({ fromRegion: TOSHKENT, toRegion: TOSHKENT, weightGrams: 3_000 });

    expect(price.breakdown.extraKilograms).toBe(2);
  });

  it("og'irlik ortsa narx ham ortadi", () => {
    const light = calculateParcelPrice({ fromRegion: TOSHKENT, toRegion: TOSHKENT, weightGrams: 500 });
    const heavy = calculateParcelPrice({ fromRegion: TOSHKENT, toRegion: TOSHKENT, weightGrams: 10_000 });

    expect(heavy.priceTiyin).toBeGreaterThan(light.priceTiyin);
  });

  it('narx tiyinda va butun son', () => {
    const price = calculateParcelPrice({ fromRegion: TOSHKENT, toRegion: SAMARQAND, weightGrams: 2_500 });

    expect(Number.isInteger(price.priceTiyin)).toBe(true);
    expect(price.priceTiyin % 100).toBe(0);
  });

  /**
   * ENG MUHIM TEKSHIRUV — 3.
   *
   * Kuryerning ulushi hech qachon mijoz to'lagan puldan OSHMASLIGI
   * kerak — aks holda har jo'natmada platforma zarar ko'rardi.
   */
  it("kuryer ulushi to'langan puldan oshmaydi", () => {
    for (const weight of [100, 999, 1_000, 1_001, 5_000, 20_000]) {
      const price = calculateParcelPrice({ fromRegion: TOSHKENT, toRegion: SAMARQAND, weightGrams: weight });

      expect(price.courierFeeTiyin).toBeLessThan(price.priceTiyin);
      expect(price.courierFeeTiyin).toBeGreaterThan(0);
    }
  });

  it('kuryer ulushi butun tiyin', () => {
    // Yaxlitlanmagan kasr tiyin bazada BigInt bo'lib saqlanmasdi.
    const price = calculateParcelPrice({ fromRegion: TOSHKENT, toRegion: SAMARQAND, weightGrams: 1_700 });

    expect(Number.isInteger(price.courierFeeTiyin)).toBe(true);
  });

  it("bir xil so'rov har doim bir xil natija beradi", () => {
    const first = calculateParcelPrice({ fromRegion: TOSHKENT, toRegion: SAMARQAND, weightGrams: 4_200 });
    const second = calculateParcelPrice({ fromRegion: TOSHKENT, toRegion: SAMARQAND, weightGrams: 4_200 });

    expect(first).toEqual(second);
  });

  it("yo'nalish teskari bo'lsa ham narx bir xil", () => {
    // Toshkent → Samarqand va Samarqand → Toshkent bir xil masofa.
    const there = calculateParcelPrice({ fromRegion: TOSHKENT, toRegion: SAMARQAND, weightGrams: 2_000 });
    const back = calculateParcelPrice({ fromRegion: SAMARQAND, toRegion: TOSHKENT, weightGrams: 2_000 });

    expect(there.priceTiyin).toBe(back.priceTiyin);
  });
});

describe("isWeightAllowed — og'irlik chegarasi", () => {
  it('oddiy og\'irliklarni qabul qiladi', () => {
    expect(isWeightAllowed(500)).toBe(true);
    expect(isWeightAllowed(5_000)).toBe(true);
  });

  it('chegaralarning o\'zi ruxsat etilgan', () => {
    expect(isWeightAllowed(DELIVERY_TARIFF.minWeightGrams)).toBe(true);
    expect(isWeightAllowed(DELIVERY_TARIFF.maxWeightGrams)).toBe(true);
  });

  /**
   * Chegaradan og'irini rad etamiz: kuryer motosiklda 50 kg olib
   * ketishga urinardi.
   */
  it('juda og\'irni rad etadi', () => {
    expect(isWeightAllowed(DELIVERY_TARIFF.maxWeightGrams + 1)).toBe(false);
    expect(isWeightAllowed(100_000)).toBe(false);
  });

  it('juda yengilni rad etadi', () => {
    expect(isWeightAllowed(DELIVERY_TARIFF.minWeightGrams - 1)).toBe(false);
    expect(isWeightAllowed(0)).toBe(false);
    expect(isWeightAllowed(-500)).toBe(false);
  });

  it('kasr grammni rad etadi', () => {
    // Gramm — butun son. Kasr kelsa, kimdir kilogrammni gramm deb
    // yuborayotgan bo'ladi.
    expect(isWeightAllowed(1_500.5)).toBe(false);
  });
});
