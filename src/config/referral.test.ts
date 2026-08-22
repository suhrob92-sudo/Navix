import { describe, expect, it } from 'vitest';

import {
  REFERRAL_ALPHABET,
  REFERRAL_CODE_LENGTH,
  REFERRAL_PATH,
  cleanReferralCode,
  isReferralCode,
  referralLink,
  referralShareText,
} from '@/config/referral';

/**
 * Taklif kodi.
 *
 * ── Nima uchun bu sinovlar batafsil ───────────────────────────────────
 * Kod og'zaki aytiladi va qo'lda ko'chiriladi. Uning har bir
 * xatosi bitta yangi foydalanuvchining yo'qolishi bilan tugaydi —
 * ya'ni tizimning butun maqsadi barbod bo'ladi.
 */
describe('REFERRAL_ALPHABET', () => {
  it('CHALKASHADIGAN JUFTLIKLAR birga turmaydi', () => {
    /*
      Kod telefonda aytiladi: "kodim ACDE234". Ba'zi belgilar
      quloqda ham, ekranda ham bir-biriga o'xshaydi.

      ── Nima uchun JUFTLIK tekshiriladi, alohida belgi emas ────────
      Qoida "8 bo'lmasin" emas. Qoida — "8 va B birga bo'lmasin":
      ulardan BITTASI qolsa, chalkashlik yo'q va alifbo ham
      keraksiz kichraymaydi.

      Birinchi urinishda sinov aynan shuni noto'g'ri yozgan edi:
      u `8` ni ham taqiqlagan, holbuki `B` allaqachon olib
      tashlangan edi.
    */
    const confusingPairs = [
      ['O', '0'],
      ['I', '1'],
      ['L', '1'],
      ['I', 'L'],
      ['S', '5'],
      ['B', '8'],
      ['Z', '2'],
      ['G', '6'],
    ];

    for (const [first, second] of confusingPairs) {
      const bothPresent = REFERRAL_ALPHABET.includes(first) && REFERRAL_ALPHABET.includes(second);

      expect({ pair: `${first}/${second}`, bothPresent }).toEqual({
        pair: `${first}/${second}`,
        bothPresent: false,
      });
    }
  });

  it('faqat KATTA harf va raqam', () => {
    // Kichik harf aralashsa, odam qaysi biri ekanini so'rardi.
    expect(REFERRAL_ALPHABET).toBe(REFERRAL_ALPHABET.toUpperCase());
    expect(REFERRAL_ALPHABET).toMatch(/^[A-Z0-9]+$/);
  });

  it('belgilar takrorlanmaydi', () => {
    expect(new Set(REFERRAL_ALPHABET).size).toBe(REFERRAL_ALPHABET.length);
  });

  it('variantlar soni yetarlicha ko\'p', () => {
    /*
      Kod noyob bo'lishi kerak va to'qnashish ehtimoli nolga
      yaqin bo'lsin. Milliarddan ko'p variant buni ta'minlaydi.
    */
    expect(REFERRAL_ALPHABET.length ** REFERRAL_CODE_LENGTH).toBeGreaterThan(1_000_000_000);
  });
});

describe('isReferralCode', () => {
  const VALID = 'ACDE234';

  it("to'g'ri kodni qabul qiladi", () => {
    expect(isReferralCode(VALID)).toBe(true);
  });

  it('uzunligi mos kelmasa rad etadi', () => {
    expect(isReferralCode('ACDE23')).toBe(false);
    expect(isReferralCode('ACDE2345')).toBe(false);
  });

  it("alifboda yo'q belgini rad etadi", () => {
    /*
      Bu shunchaki qat'iylik emas: `O` va `0` chalkashligi
      sababli alifbodan olib tashlangan. Ularni qabul qilsak,
      ikki xil kod bir xil eshitilardi.
    */
    expect(isReferralCode('ACDE23O')).toBe(false);
    expect(isReferralCode('ACDE231')).toBe(false);
  });

  it('kichik harfni rad etadi', () => {
    // Tozalash `cleanReferralCode` ning ishi — bu yerda qat'iy tekshiruv.
    expect(isReferralCode('acde234')).toBe(false);
  });

  it("bo'sh satrni rad etadi", () => {
    expect(isReferralCode('')).toBe(false);
  });
});

describe('cleanReferralCode', () => {
  it("bo'sh joyni olib tashlaydi", () => {
    expect(cleanReferralCode('  ACDE234  ')).toBe('ACDE234');
  });

  it('kichik harfni kattaga aylantiradi', () => {
    expect(cleanReferralCode('acde234')).toBe('ACDE234');
  });

  it("TO'LIQ havoladan kodni ajratadi", () => {
    /*
      Odam ko'pincha butun havolani nusxalab qo'yadi. Uni rad
      etish o'rniga tozalash qulayroq: natija baribir bir xil.
    */
    expect(cleanReferralCode('https://navix.uz/i/ACDE234')).toBe('ACDE234');
  });

  it("havoladagi qo'shimcha parametrni tashlaydi", () => {
    expect(cleanReferralCode('https://navix.uz/i/ACDE234?utm=telegram')).toBe('ACDE234');
  });

  it('tozalangan natija tekshiruvdan o\'tadi', () => {
    expect(isReferralCode(cleanReferralCode(' https://navix.uz/i/acde234 '))).toBe(true);
  });
});

describe('referralLink', () => {
  it('to\'liq havola quradi', () => {
    expect(referralLink('https://navix.uz', 'ACDE234')).toBe(`https://navix.uz${REFERRAL_PATH}/ACDE234`);
  });

  it('oxiridagi ortiqcha chiziqni olib tashlaydi', () => {
    /*
      Sozlamada manzil `https://navix.uz/` deb yozilgan bo'lsa,
      natija `//i/ACDE234` bo'lib qolardi — u ishlaydi, lekin
      ulashilganda xato yozilgandek ko'rinadi.
    */
    expect(referralLink('https://navix.uz/', 'ACDE234')).toBe(`https://navix.uz${REFERRAL_PATH}/ACDE234`);
  });
});

describe('referralShareText', () => {
  it('havolani o\'z ichiga oladi', () => {
    const link = 'https://navix.uz/i/ACDE234';

    expect(referralShareText(link)).toContain(link);
  });

  it('PUL yoki mukofot VA\'DA qilmaydi', () => {
    /*
      Yolg'on va'da eng yomon yo'l: odam do'stlarini chaqiradi,
      keyin pul kelmaganda ikkalasi ham ishonchini yo'qotadi.
    */
    const text = referralShareText('https://navix.uz/i/ACDE234').toLowerCase();

    for (const promise of ['bonus', 'mukofot', 'sovg\'a', 'pul ishlang', 'daromad']) {
      expect(text).not.toContain(promise);
    }
  });
});
