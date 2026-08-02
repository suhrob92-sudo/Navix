/**
 * O'zbekiston telefon raqamlari bilan ishlash.
 *
 * Bazada raqam har doim E.164 xalqaro formatda saqlanadi: `+998901234567`.
 * Foydalanuvchi esa istalgan ko'rinishda kiritishi mumkin:
 *   90 123 45 67  /  +998 90 123-45-67  /  998901234567
 * Shu sababli kiritilgan qiymat avval "normallashtiriladi".
 */

/** O'zbekiston xalqaro kodi. */
const UZ_COUNTRY_CODE = '998';

/** Amaldagi mobil operator kodlari (2 xonali). */
const UZ_OPERATOR_CODES = [
  '20', // Humans
  '33', // Humans / Uzmobile
  '50', // Perfectum
  '55', // Uzmobile
  '77', // Uzmobile
  '88', // Ucell
  '90', // Beeline
  '91', // Beeline
  '93', // Ucell
  '94', // Ucell
  '95', // Uzmobile
  '97', // Mobiuz
  '98', // Mobiuz
  '99', // Uzmobile
] as const;

/** E.164 formatdagi to'liq raqam: +998 + 9 ta raqam = 13 belgi. */
export const UZ_PHONE_E164_LENGTH = 13;

/**
 * Foydalanuvchi kiritgan raqamni E.164 formatga keltiradi.
 * Keltirib bo'lmasa `null` qaytaradi.
 *
 * @example normalizeUzPhone('90 123 45 67') // '+998901234567'
 * @example normalizeUzPhone('+998901234567') // '+998901234567'
 * @example normalizeUzPhone('12345') // null
 */
export function normalizeUzPhone(input: string): string | null {
  // Raqamdan boshqa hamma narsani olib tashlaymiz.
  const digits = input.replace(/\D/g, '');

  // 9 xonali bo'lsa — mamlakat kodi tushirib qoldirilgan (901234567).
  const withCountryCode = digits.length === 9 ? `${UZ_COUNTRY_CODE}${digits}` : digits;

  if (withCountryCode.length !== 12 || !withCountryCode.startsWith(UZ_COUNTRY_CODE)) {
    return null;
  }

  const operatorCode = withCountryCode.slice(3, 5);
  if (!UZ_OPERATOR_CODES.includes(operatorCode as (typeof UZ_OPERATOR_CODES)[number])) {
    return null;
  }

  return `+${withCountryCode}`;
}

/** Raqamni ekranda chiroyli ko'rsatadi: `+998 90 123 45 67`. */
export function formatUzPhone(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.length !== 12) return e164;

  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
}

/**
 * Raqamni qisman yashiradi — log va ekranlarda to'liq raqam ko'rinmasligi uchun.
 * @example maskUzPhone('+998901234567') // '+998 90 *** ** 67'
 */
export function maskUzPhone(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.length !== 12) return '***';

  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} *** ** ${digits.slice(10)}`;
}
