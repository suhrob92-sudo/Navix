/**
 * Pul bilan ishlash.
 *
 * ── Nima uchun tiyin ──────────────────────────────────────────────────
 * Pul HECH QACHON kasrli son (`float`) sifatida saqlanmaydi. Sababi:
 * kompyuterda `0.1 + 0.2 === 0.30000000000000004`. Bir necha million
 * amaldan keyin balans "sirg'alib" ketadi va hisob buziladi.
 *
 * Shuning uchun eng kichik birlik — TIYIN — butun son sifatida saqlanadi:
 *
 *     1 so'm = 100 tiyin
 *     125 000 so'm = 12 500 000 tiyin
 *
 * Bazada `BigInt`, chunki katta summalar (kompaniya hisoblari) `Int`
 * chegarasidan (2.1 mlrd) oshib ketishi mumkin.
 *
 * ── JSON cheklovi ─────────────────────────────────────────────────────
 * `JSON.stringify` `BigInt` bilan ishlamaydi, shuning uchun API javobida
 * oddiy `number` ga o'giriladi. Bu xavfsiz: `Number.MAX_SAFE_INTEGER`
 * ≈ 9 · 10¹⁵ tiyin, ya'ni ~90 trillion so'm — real summalardan ancha katta.
 */

/** Bitta so'mdagi tiyinlar soni. */
export const TIYIN_IN_SOM = 100n;

/** Hamyondagi eng kichik to'ldirish summasi (so'mda). */
export const MIN_TOP_UP_SOM = 1_000;

/** Bir martada to'ldirish mumkin bo'lgan eng katta summa (so'mda). */
export const MAX_TOP_UP_SOM = 10_000_000;

/** Bir martada o'tkazish mumkin bo'lgan eng katta summa (so'mda). */
export const MAX_TRANSFER_SOM = 10_000_000;

/**
 * So'mni tiyinga o'giradi.
 *
 * Kirish butun son bo'lishi shart — biz tiyinlik kiritishni qabul qilmaymiz
 * (interfeysda ham faqat so'm so'raladi). Shuning uchun kasr bo'lsa xatolik.
 */
export function somToTiyin(som: number): bigint {
  if (!Number.isInteger(som)) {
    throw new TypeError("Summa butun so'mda bo'lishi kerak");
  }

  return BigInt(som) * TIYIN_IN_SOM;
}

/** Tiyinni so'mga o'giradi (kasr qismi tashlab yuboriladi). */
export function tiyinToSom(tiyin: bigint): number {
  return Number(tiyin / TIYIN_IN_SOM);
}

/**
 * `BigInt` ni API javobi uchun oddiy songa o'giradi.
 *
 * Xavfsizlik chegarasidan oshsa — bu ma'lumot buzilgani belgisi, jimgina
 * noto'g'ri son qaytarish o'rniga xatolik beramiz.
 */
export function tiyinToNumber(tiyin: bigint): number {
  const value = Number(tiyin);

  if (!Number.isSafeInteger(value)) {
    throw new RangeError('Summa xavfsiz son chegarasidan oshib ketdi');
  }

  return value;
}

/**
 * Uzilmas probel (U+00A0).
 *
 * Oddiy probel ishlatilsa "120 000 so'm" satr oxirida ikkiga bo'linib
 * ketishi mumkin: "120" bir qatorda, "000 so'm" keyingisida.
 */
const NBSP = ' ';

/**
 * Raqamni uch xonadan guruhlaydi: 120000 -> "120 000".
 *
 * ── Nima uchun `Intl.NumberFormat` EMAS ───────────────────────────────
 * `uz-UZ` uchun ajratgich muhitga qarab farq qiladi: Node probel beradi
 * ("120 000"), brauzerdagi Chromium esa vergul ("120,000"). Natijada
 * server chizgan sahifa bilan brauzer chizgani mos kelmaydi va React
 * "hydration mismatch" xatosini beradi.
 *
 * Qo'lda formatlash hamma joyda BIR XIL natija beradi.
 */
function groupDigits(value: number): string {
  const isNegative = value < 0;
  const digits = Math.abs(Math.trunc(value)).toString();

  let grouped = '';

  for (let index = 0; index < digits.length; index += 1) {
    // Oxiridan sanaganda har uchtadan keyin ajratgich qo'yamiz.
    const remaining = digits.length - index;
    grouped += digits[index];
    if (remaining > 1 && remaining % 3 === 1) grouped += NBSP;
  }

  return isNegative ? `-${grouped}` : grouped;
}

/**
 * Tiyindagi summani o'qish uchun qulay ko'rinishga keltiradi.
 *
 * @example formatTiyin(12_500_000n) // "125 000 so'm"
 */
export function formatTiyin(tiyin: bigint | number): string {
  const som = typeof tiyin === 'bigint' ? tiyinToSom(tiyin) : Math.trunc(tiyin / 100);

  return `${groupDigits(som)}${NBSP}so'm`;
}

/**
 * Kiritilayotgan summani faqat raqamlardan iborat qilib tozalaydi.
 *
 * Foydalanuvchi "50 000" yoki "50.000" deb yozishi mumkin — ikkalasi ham
 * 50000 bo'lishi kerak.
 */
export function parseAmountInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return null;

  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}

/** Kiritish maydonida ko'rsatish uchun: 50000 -> "50 000" */
export function formatAmountInput(value: number): string {
  return groupDigits(value);
}
