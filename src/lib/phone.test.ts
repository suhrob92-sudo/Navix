import { describe, expect, it } from 'vitest';

import { formatUzPhone, maskUzPhone, normalizeUzPhone, uzPhoneProblem } from '@/lib/phone';

describe('normalizeUzPhone — raqamni E.164 formatga keltirish', () => {
  it("9 xonali raqamga mamlakat kodini qo'shadi", () => {
    expect(normalizeUzPhone('901234567')).toBe('+998901234567');
  });

  it("bo'shliq va chiziqchalarni tozalaydi", () => {
    expect(normalizeUzPhone('90 123 45 67')).toBe('+998901234567');
    expect(normalizeUzPhone('+998 90 123-45-67')).toBe('+998901234567');
    expect(normalizeUzPhone('(90) 123 45 67')).toBe('+998901234567');
  });

  it("to'liq xalqaro formatni qabul qiladi", () => {
    expect(normalizeUzPhone('998901234567')).toBe('+998901234567');
    expect(normalizeUzPhone('+998901234567')).toBe('+998901234567');
  });

  it('barcha amaldagi operator kodlarini qabul qiladi', () => {
    for (const code of ['20', '33', '50', '55', '77', '88', '90', '91', '93', '94', '95', '97', '98', '99']) {
      expect(normalizeUzPhone(`${code}1234567`), `${code} kodi qabul qilinmadi`).toBe(`+998${code}1234567`);
    }
  });

  it("noto'g'ri operator kodini rad etadi", () => {
    expect(normalizeUzPhone('101234567')).toBeNull();
    expect(normalizeUzPhone('001234567')).toBeNull();
  });

  it("uzunligi noto'g'ri raqamni rad etadi", () => {
    expect(normalizeUzPhone('12345')).toBeNull();
    expect(normalizeUzPhone('9012345678901')).toBeNull();
    expect(normalizeUzPhone('')).toBeNull();
  });

  it('boshqa davlat raqamini rad etadi', () => {
    expect(normalizeUzPhone('+79161234567')).toBeNull();
  });
});

describe("formatUzPhone — ekranda ko'rsatish", () => {
  it("raqamni bo'laklarga ajratadi", () => {
    expect(formatUzPhone('+998901234567')).toBe('+998 90 123 45 67');
  });

  it("noto'g'ri uzunlikda kiritilgan qiymatni o'zgartirmaydi", () => {
    expect(formatUzPhone('12345')).toBe('12345');
  });
});

describe('maskUzPhone — raqamni yashirish', () => {
  it("o'rta qismini yulduzcha bilan almashtiradi", () => {
    const masked = maskUzPhone('+998901234567');

    expect(masked).toContain('+998 90');
    expect(masked).toContain('***');
    expect(masked).toContain('67');
    // To'liq raqam ko'rinmasligi kerak.
    expect(masked).not.toContain('1234');
  });

  it("noto'g'ri qiymatda umumiy niqob qaytaradi", () => {
    expect(maskUzPhone('abc')).toBe('***');
  });
});

/**
 * Raqam nima uchun rad etilgani — sabab AJRATILADI.
 *
 * ── HAQIQIY MUAMMO ────────────────────────────────────────────────────
 * Operator kodlari qo'lda yozilgan ro'yxatda. O'zbekistonda yangi kod
 * paydo bo'lsa, o'sha raqamli odam ro'yxatdan o'ta olmaydi — va unga
 * "Telefon raqami noto'g'ri" deb aytilardi.
 *
 * Odam esa raqamini TO'G'RI kiritgan bo'ladi. U qayta-qayta tekshiradi,
 * boshqa raqam yozib ko'radi va oxiri ilovani tashlab ketadi. Sabab
 * unga hech qachon aytilmasdi.
 */
describe('raqam nima uchun rad etildi', () => {
  it("to'g'ri raqamda muammo YO'Q", () => {
    expect(uzPhoneProblem('901234567')).toBeNull();
    expect(uzPhoneProblem('+998 90 123 45 67')).toBeNull();
  });

  it('shakli buzuq raqam — `shape`', () => {
    expect(uzPhoneProblem('12345')).toBe('shape');
    expect(uzPhoneProblem('')).toBe('shape');
    expect(uzPhoneProblem('+7 999 123 45 67')).toBe('shape');
  });

  it("shakli TO'G'RI, lekin kod ro'yxatda yo'q — `operator`", () => {
    /*
      `96` va `92` — O'zbekistonda hozircha ishlatilmaydigan kodlar.
      Ertaga ular chiqsa, odam aniq javob oladi va biz ro'yxatni
      yangilashimiz kerakligini bilamiz.
    */
    expect(uzPhoneProblem('961234567')).toBe('operator');
    expect(uzPhoneProblem('+998921234567')).toBe('operator');
  });
});
