/**
 * Mahsulot variantlari — yagona sozlama.
 *
 * ── Nima uchun variant kerak ──────────────────────────────────────────
 * Hozirgacha "qora 128 GB" va "oq 256 GB" ikkita ALOHIDA mahsulot
 * edi. Xaridor rangni almashtirish uchun katalogga qaytib, qaytadan
 * qidirishi kerak bo'lardi. Bir xil mahsulotning baholari ham
 * ikkiga bo'linib ketardi.
 *
 * ── Nima uchun eng ko'pi IKKITA tanlov ────────────────────────────────
 * Uchta va undan ortiq tanlov texnik jihatdan mumkin edi, lekin:
 *
 *   1. birikmalar soni KO'PAYTIRILADI: 3 tanlov × 5 qiymat = 125 ta
 *      variant. Sotuvchi ularning har biriga narx va zaxira
 *      yozishi kerak bo'lardi;
 *   2. telefon ekranida 125 qatorlik jadvalni tahrirlab bo'lmaydi;
 *   3. haqiqiy savdoda ikkita tanlov deyarli har doim yetadi:
 *      "rang + xotira", "rang + o'lcham".
 *
 * Bu — ataylab tanlangan chegara. Uchinchi tanlov kerak bo'lsa,
 * sotuvchi ikkinchi mahsulot ochadi.
 */

/** Bitta mahsulotda eng ko'p nechta tanlov. */
export const MAX_OPTIONS = 2;

/** Bitta tanlovda eng ko'p nechta qiymat. */
export const MAX_VALUES_PER_OPTION = 12;

/**
 * Bitta mahsulotda eng ko'p nechta variant.
 *
 * 12 × 12 = 144 birikma nazariy jihatdan mumkin, lekin amalda
 * sotuvchi hammasini sotmaydi. 40 ta — bu chegaraning oqilona
 * qismi.
 */
export const MAX_VARIANTS = 40;

/** Tanlov nomi va qiymati uzunligi. */
export const OPTION_NAME_MAX_LENGTH = 40;
export const OPTION_VALUE_MAX_LENGTH = 60;

/**
 * Variant nomini yasaydi: ["Qora", "256 GB"] -> "Qora · 256 GB".
 *
 * ── Nima uchun nuqta (·) ──────────────────────────────────────────────
 * Vergul ham mumkin edi, lekin qiymatning O'ZIDA vergul bo'lishi
 * mumkin ("6,6 dyuym"). Nuqta esa qiymatlarda deyarli
 * uchramaydi va u ikki tomonga bo'shliq bilan yozilganda aniq
 * ajratuvchi bo'lib ko'rinadi.
 */
export function variantLabel(values: readonly string[]): string {
  return values.join(' · ');
}

/**
 * Zaxira holati — variant tugmasi qanday ko'rinishini belgilaydi.
 *
 * ── Nima uchun tugagan variant YASHIRILMAYDI ──────────────────────────
 * Uni ro'yxatdan olib tashlash mumkin edi va sahifa toza
 * ko'rinardi.
 *
 * Lekin unda xaridor "oq rangi bormidi?" degan savolga javob
 * ololmasdi — u shunchaki yo'q deb o'ylardi va boshqa do'konga
 * ketardi.
 *
 * O'chirilgan tugma esa aniq aytadi: bor, lekin hozir tugagan.
 */
export type VariantState = 'available' | 'low' | 'out';

export function variantState(stock: number): VariantState {
  if (stock <= 0) return 'out';
  if (stock <= 3) return 'low';

  return 'available';
}

/**
 * "dan" belgisi kerakmi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Variantlarning narxi har xil bo'lsa, katalogdagi bitta narx
 * YOLG'ON bo'lardi: odam 4 290 000 so'mni ko'rib kirsa, ichkarida
 * 5 890 000 so'mni ko'rardi.
 *
 * "4 290 000 so'mdan" esa rost va u kutilmagan narxdan saqlaydi.
 */
export function needsFromPrefix(prices: readonly number[]): boolean {
  if (prices.length < 2) return false;

  return Math.min(...prices) !== Math.max(...prices);
}

/** Tanlov tanlanmagan holat uchun matn. */
export const PICK_VARIANT_TEXT = 'Avval variantni tanlang';

/** Variant tugagan holat uchun matn. */
export const VARIANT_OUT_TEXT = 'Bu variant tugagan';

/**
 * Variantsiz mahsulot ham ISHLAYDI.
 *
 * ── Nima uchun bu muhim ───────────────────────────────────────────────
 * Katalogdagi mahsulotlarning katta qismida variant yo'q: kitob,
 * dazmol, konstruktor. Ularni sun'iy "yagona variant" ga
 * o'rashning ma'nosi yo'q edi.
 *
 * Shuning uchun variant IXTIYORIY: yo'q bo'lsa, narx va zaxira
 * eskicha mahsulotning o'zidan olinadi.
 */
export const VARIANTS_ARE_OPTIONAL = true;
