import { describe, expect, it } from 'vitest';

import { MAX_ACCOUNT_REGEX_LENGTH, validateAccountRegex } from '@/modules/admin/account-regex';

/**
 * Bu testlar — xavfsizlik testlari.
 *
 * Ular "kod ishlayaptimi" degan savolga emas, "kod HUJUMDAN
 * himoyalaydimi" degan savolga javob beradi. Shuning uchun har bir
 * "rad etilishi kerak" testi aslida bitta hujum ssenariysi.
 */

describe('validateAccountRegex — haqiqiy naqshlar', () => {
  it.each([
    ['^\\d{10}$', 'Hududgaz — 10 xonali hisob'],
    ['^\\d{12}$', 'Elektr — 12 xonali hisob'],
    ['^\\d{9}$', 'Uyali aloqa — 9 xonali raqam'],
    ['^[A-Z0-9]{6,12}$', 'Harf va raqamdan iborat shartnoma'],
    ['^\\d{9}|\\d{12}$', 'Ikki xil uzunlik'],
    ['^\\w{5,20}$', "So'z belgilari"],
    ['^UZ-\\d{8}$', 'Prefiksli raqam'],
  ])('%s qabul qilinadi (%s)', (source) => {
    expect(validateAccountRegex(source)).toEqual([]);
  });
});

describe('validateAccountRegex — ReDoS himoyasi', () => {
  /**
   * Eng jiddiy xavf. `^(\d+)+$` naqshi 30 ta raqam + bitta harfda
   * milliardlab qadam bajaradi. Node bir oqimli, ya'ni bitta bunday
   * so'rov BUTUN SERVERNI to'xtatadi.
   */
  it.each(['^(\\d+)+$', '^(a+)+$', '^(\\d*)*$', '^([A-Z]+)*$', '^(\\d|\\d)+$'])(
    'halokatli qaytish naqshi rad etiladi: %s',
    (source) => {
      const errors = validateAccountRegex(source);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.join(' ')).toContain('Qavs');
    },
  );

  it('guruh ishlatilgan har qanday naqsh rad etiladi', () => {
    // Zararsiz ko'ringan guruh ham rad etiladi: "xavfsiz guruh" ni
    // ajratish qoidasi murakkab va xatoga moyil. Guruhsiz ham
    // hisob raqamlarini to'liq ifodalash mumkin.
    expect(validateAccountRegex('^(\\d{10})$')).not.toEqual([]);
  });
});

describe('validateAccountRegex — langar (anchor)', () => {
  /**
   * Langarsiz naqsh satr ICHIDAN qidiradi. `\d{10}` naqshi
   * "salom1234567890salom" ni ham qabul qiladi — ya'ni pul
   * mavjud bo'lmagan hisobga ketishi mumkin.
   */
  it('langarsiz naqsh rad etiladi', () => {
    expect(validateAccountRegex('\\d{10}')).not.toEqual([]);
    expect(validateAccountRegex('^\\d{10}')).not.toEqual([]);
    expect(validateAccountRegex('\\d{10}$')).not.toEqual([]);
  });

  it("langar haqiqatan ham kerakligini ko'rsatadi", () => {
    // Bu test qoidaning SABABINI hujjatlashtiradi.
    expect(new RegExp('\\d{10}').test('salom1234567890salom')).toBe(true);
    expect(new RegExp('^\\d{10}$').test('salom1234567890salom')).toBe(false);
  });
});

describe('validateAccountRegex — ruxsat etilmagan sintaksis', () => {
  it('nuqta (istalgan belgi) rad etiladi', () => {
    // `^.{10}$` istalgan 10 ta belgini qabul qiladi — hisob raqami
    // uchun bu juda keng.
    expect(validateAccountRegex('^.{10}$')).not.toEqual([]);
  });

  it("teskari belgilar to'plami rad etiladi", () => {
    expect(validateAccountRegex('^[^a]{10}$')).not.toEqual([]);
  });

  it("noma'lum qochirilgan belgi rad etiladi", () => {
    expect(validateAccountRegex('^\\s{10}$')).not.toEqual([]);
    expect(validateAccountRegex('^\\S{10}$')).not.toEqual([]);
  });

  it('yopilmagan qavs rad etiladi', () => {
    expect(validateAccountRegex('^[A-Z{5}$')).not.toEqual([]);
    expect(validateAccountRegex('^\\d{5$')).not.toEqual([]);
  });
});

describe('validateAccountRegex — chegaralar', () => {
  it("bo'sh naqsh rad etiladi", () => {
    expect(validateAccountRegex('')).toEqual(['Naqsh kiritilmagan']);
  });

  it('juda uzun naqsh rad etiladi', () => {
    const long = `^${'\\d'.repeat(MAX_ACCOUNT_REGEX_LENGTH)}$`;

    expect(validateAccountRegex(long)).not.toEqual([]);
  });

  it('juda katta takrorlash soni rad etiladi', () => {
    // `\d{999}` bazadagi 60 belgilik maydonga sig'maydi — bunday
    // naqsh hech qachon mos kelmaydi va xizmat ishlamay qoladi.
    expect(validateAccountRegex('^\\d{999}$')).not.toEqual([]);
  });

  it('teskari chegara rad etiladi', () => {
    expect(validateAccountRegex('^\\d{10,5}$')).not.toEqual([]);
  });

  it("takrorlagichdan oldin bo'lak bo'lmasa rad etiladi", () => {
    expect(validateAccountRegex('^{5}$')).not.toEqual([]);
    expect(validateAccountRegex('^+$')).not.toEqual([]);
  });

  it('chegarasiz takrorlagich ({1,}) qabul qilinadi', () => {
    expect(validateAccountRegex('^\\d{1,}$')).toEqual([]);
  });
});

describe('validateAccountRegex — bir xil xato takrorlanmaydi', () => {
  it('bitta xabar bir marta qaytadi', () => {
    const errors = validateAccountRegex('^\\s\\s\\s$');
    const unique = new Set(errors);

    expect(errors.length).toBe(unique.size);
  });
});
