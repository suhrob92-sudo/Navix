import { describe, expect, it } from 'vitest';

import {
  CTA_HANDLE_PATTERN,
  POST_CTA_CONFIG,
  POST_CTA_KINDS,
  cleanHandle,
  ctaHref,
  isPostCtaKind,
} from '@/config/post-cta';

/**
 * Videoning chaqiruvi — yagona manba.
 *
 * Bu faylning ENG NOZIK joyi — `ctaHref`. U tashqi manzil yasaydi va
 * undagi xatolik odamni butunlay boshqa saytga olib borishi mumkin.
 */
describe('POST_CTA_CONFIG', () => {
  it('HAR BIR tur uchun ta\'rif bor', () => {
    for (const kind of POST_CTA_KINDS) {
      expect(POST_CTA_CONFIG[kind]).toBeDefined();
    }

    expect(Object.keys(POST_CTA_CONFIG)).toHaveLength(POST_CTA_KINDS.length);
  });

  it('har birida nom, fe\'l va belgi bor', () => {
    for (const kind of POST_CTA_KINDS) {
      const config = POST_CTA_CONFIG[kind];

      expect(config.label.length).toBeGreaterThan(0);
      expect(config.action.length).toBeGreaterThan(0);
      expect(config.icon).toBeDefined();
    }
  });

  it('qiymat KERAK bo\'lgan turda namuna ham bor', () => {
    /*
      Namunasiz maydon bo'sh qoladi va odam nima yozishni bilmasdi:
      "@navix_uz" mi yoki "https://t.me/navix_uz" mi?
    */
    for (const kind of POST_CTA_KINDS) {
      const config = POST_CTA_CONFIG[kind];

      if (config.needsValue) expect(config.placeholder).toBeTruthy();
    }
  });

  it('FOLLOW va MESSAGE da qiymat KERAK EMAS', () => {
    // Ular muallifning o'ziga ishora qiladi — ilova uni allaqachon biladi.
    expect(POST_CTA_CONFIG.FOLLOW.needsValue).toBe(false);
    expect(POST_CTA_CONFIG.MESSAGE.needsValue).toBe(false);
  });

  it('ilova ichidagi amallar TASHQI deb belgilanmagan', () => {
    expect(POST_CTA_CONFIG.FOLLOW.isExternal).toBe(false);
    expect(POST_CTA_CONFIG.MESSAGE.isExternal).toBe(false);
    // Telefon ham ilovadan chiqmaydi — u qo'ng'iroq dasturini ochadi.
    expect(POST_CTA_CONFIG.PHONE.isExternal).toBe(false);
  });
});

describe('ctaHref', () => {
  it('tarmoq manzillarini to\'g\'ri yasaydi', () => {
    expect(ctaHref('TELEGRAM', 'navix_uz')).toBe('https://t.me/navix_uz');
    expect(ctaHref('INSTAGRAM', 'navix.uz')).toBe('https://instagram.com/navix.uz');
    expect(ctaHref('YOUTUBE', 'navixuz')).toBe('https://youtube.com/@navixuz');
    expect(ctaHref('PHONE', '+998901234567')).toBe('tel:+998901234567');
  });

  it('ilova ICHIDAGI amallarda manzil yo\'q', () => {
    /*
      Obuna va suhbat oddiy havola emas: ular ilova ichidagi amal.
      Havola qilib qo'yilsa, obuna sahifa yangilanishini talab
      qilardi.
    */
    expect(ctaHref('FOLLOW', null)).toBeNull();
    expect(ctaHref('MESSAGE', null)).toBeNull();
  });

  it('qiymatsiz turda manzil YASALMAYDI', () => {
    // Qiymatsiz "t.me/" havolasi Telegramning bosh sahifasiga olib borardi.
    expect(ctaHref('TELEGRAM', null)).toBeNull();
    expect(ctaHref('PHONE', null)).toBeNull();
  });

  it('manzil HAR DOIM kutilgan domenda', () => {
    /*
      Eng muhim sinov. Nom bazadan keladi va u qandaydir yo'l bilan
      buzilgan bo'lsa ham, hosil bo'lgan manzil boshqa domenga
      olib bormasligi kerak.
    */
    const hosts: Record<string, string> = {
      TELEGRAM: 'https://t.me/',
      INSTAGRAM: 'https://instagram.com/',
      YOUTUBE: 'https://youtube.com/@',
    };

    for (const [kind, prefix] of Object.entries(hosts)) {
      const href = ctaHref(kind as 'TELEGRAM' | 'INSTAGRAM' | 'YOUTUBE', 'navix');

      expect(href?.startsWith(prefix)).toBe(true);
    }
  });
});

describe('cleanHandle', () => {
  it('boshidagi @ ni olib tashlaydi', () => {
    expect(cleanHandle('@navix_uz')).toBe('navix_uz');
  });

  it('TO\'LIQ manzilni nomga aylantiradi', () => {
    /*
      Odam ko'pincha manzilni nusxalab qo'yadi. Uni rad etish
      o'rniga tozalash qulayroq: natija baribir bir xil.
    */
    expect(cleanHandle('https://t.me/navix_uz')).toBe('navix_uz');
    expect(cleanHandle('https://www.instagram.com/navix.uz/')).toBe('navix.uz');
    expect(cleanHandle('http://telegram.me/navix_uz')).toBe('navix_uz');
  });

  it('so\'rov qismini kesib tashlaydi', () => {
    expect(cleanHandle('https://t.me/navix_uz?start=1')).toBe('navix_uz');
    expect(cleanHandle('navix_uz#bo\'lim')).toBe('navix_uz');
  });

  it('chetlaridagi bo\'sh joyni tozalaydi', () => {
    expect(cleanHandle('  navix_uz  ')).toBe('navix_uz');
  });
});

describe('CTA_HANDLE_PATTERN', () => {
  it('odatiy nomlarni qabul qiladi', () => {
    expect(CTA_HANDLE_PATTERN.test('navix_uz')).toBe(true);
    expect(CTA_HANDLE_PATTERN.test('navix.uz')).toBe(true);
    expect(CTA_HANDLE_PATTERN.test('Navix-UZ2026')).toBe(true);
  });

  it('XAVFLI belgilarni rad etadi', () => {
    /*
      Eng muhim qoida. Nomga `/` yoki `:` tushsa, hosil bo'lgan
      manzil butunlay boshqa sahifaga olib borishi mumkin edi:
      "t.me/" + "../evil.com" kabi.
    */
    expect(CTA_HANDLE_PATTERN.test('navix/uz')).toBe(false);
    expect(CTA_HANDLE_PATTERN.test('../evil.com')).toBe(false);
    expect(CTA_HANDLE_PATTERN.test('navix uz')).toBe(false);
    expect(CTA_HANDLE_PATTERN.test('navix?a=1')).toBe(false);
    expect(CTA_HANDLE_PATTERN.test('@navix')).toBe(false);
    expect(CTA_HANDLE_PATTERN.test('javascript:alert(1)')).toBe(false);
  });

  it('juda qisqa va juda uzun nomni rad etadi', () => {
    // Uzun nom tugmadan chiqib ketardi.
    expect(CTA_HANDLE_PATTERN.test('a')).toBe(false);
    expect(CTA_HANDLE_PATTERN.test('a'.repeat(33))).toBe(false);
    expect(CTA_HANDLE_PATTERN.test('a'.repeat(32))).toBe(true);
  });
});

describe('isPostCtaKind', () => {
  it('haqiqiy turni tan oladi', () => {
    expect(isPostCtaKind('FOLLOW')).toBe(true);
    expect(isPostCtaKind('TELEGRAM')).toBe(true);
  });

  it('begona qiymatni rad etadi', () => {
    expect(isPostCtaKind('TIKTOK')).toBe(false);
    expect(isPostCtaKind('follow')).toBe(false);
    expect(isPostCtaKind('')).toBe(false);
  });
});
