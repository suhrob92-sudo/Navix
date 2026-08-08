import { DELIVERY_TARIFF } from '@/config/delivery';

/**
 * Posilka narxini hisoblaydi.
 *
 * ── Nima uchun ALOHIDA va SOF funksiya ────────────────────────────────
 * Bu — modulning eng nozik joyi: bu yerdagi xato har bir jo'natmada
 * takrorlanadi va uni faqat mijoz shikoyat qilganda bilib qolamiz.
 *
 * Bazaga ham, tarmoqqa ham tegmaydi — shuning uchun har bir chegara
 * holatini test bilan qamrab olish mumkin.
 *
 * ── Nima uchun natijada IKKITA summa bor ──────────────────────────────
 * `price` — mijoz to'laydigan pul, `courierFee` — kuryerga tegadigan
 * qismi. Ikkalasi jo'natma yozuviga NUSXA qilinadi: ertaga tarif
 * o'zgarsa ham, kelishilgan summa o'zgarmasligi kerak.
 */

export interface ParcelPriceInput {
  fromRegion: string;
  toRegion: string;
  weightGrams: number;
}

export interface ParcelPrice {
  /** Mijoz to'laydigan summa — TIYINDA. */
  priceTiyin: number;
  /** Kuryerga tegadigan qism — TIYINDA. */
  courierFeeTiyin: number;
  /** Hisob-kitobning tushuntirishi — ekranda ko'rsatiladi. */
  breakdown: {
    baseSom: number;
    extraWeightSom: number;
    /** Nechta qo'shimcha kilogramm hisoblandi. */
    extraKilograms: number;
    isCrossRegion: boolean;
  };
}

/**
 * Og'irlik chegaradan chiqmaganini tekshiradi.
 *
 * Narx funksiyasi ichida emas, ALOHIDA: narx hisoblash "hisoblab
 * bering" degan so'rovga javob beradi va u yerda xato tashlash
 * ekranda narxni jonli ko'rsatishga xalaqit berardi.
 */
export function isWeightAllowed(weightGrams: number): boolean {
  return (
    Number.isInteger(weightGrams) &&
    weightGrams >= DELIVERY_TARIFF.minWeightGrams &&
    weightGrams <= DELIVERY_TARIFF.maxWeightGrams
  );
}

export function calculateParcelPrice(input: ParcelPriceInput): ParcelPrice {
  const isCrossRegion = input.fromRegion !== input.toRegion;

  const baseSom = isCrossRegion ? DELIVERY_TARIFF.crossRegionSom : DELIVERY_TARIFF.sameRegionSom;

  /**
   * Qo'shimcha og'irlik BOSHLANGAN kilogramm bo'yicha sanaladi.
   *
   * 1200 gramm — bu 1 kg dan og'ir, ya'ni bitta qo'shimcha kilogramm.
   * Aks holda 1999 gramm bepul ketardi va tarozidagi har gramm
   * bahsga aylanardi.
   */
  const extraGrams = Math.max(0, input.weightGrams - DELIVERY_TARIFF.includedWeightGrams);
  const extraKilograms = Math.ceil(extraGrams / 1_000);
  const extraWeightSom = extraKilograms * DELIVERY_TARIFF.extraKilogramSom;

  const totalSom = baseSom + extraWeightSom;
  const priceTiyin = totalSom * 100;

  /**
   * Kuryer ulushi PASTGA yaxlitlanadi.
   *
   * Yuqoriga yaxlitlansa, platforma o'z ulushidan bir tiyin kam olib,
   * hisobda kichik farq to'planib borardi. Pastga yaxlitlash esa
   * platforma foydasiga — va u hech qachon manfiy bo'lmaydi.
   */
  const courierFeeTiyin = Math.floor((priceTiyin * DELIVERY_TARIFF.courierSharePercent) / 100);

  return {
    priceTiyin,
    courierFeeTiyin,
    breakdown: { baseSom, extraWeightSom, extraKilograms, isCrossRegion },
  };
}
