import { describe, expect, it } from 'vitest';

import { RESERVED_USERNAMES, buildDefaultUsername, isReservedUsername } from '@/config/profile';
import { userSearchQuerySchema, usernameParamSchema, usernameSchema } from '@/modules/profile/social.schemas';
import {
  formatCount,
  formatUsername,
  formatWebsite,
  normalizeUserQuery,
  userMatchRank,
} from '@/modules/profile/social.types';

describe('usernameSchema', () => {
  it("to'g'ri nomlarni qabul qiladi", () => {
    for (const name of ['aziz', 'aziz_karimov', 'a1b2c3', 'user_0323876988ca']) {
      expect(usernameSchema.safeParse(name).success, name).toBe(true);
    }
  });

  it('katta harfni kichkinaga aylantiradi', () => {
    // Odam `/u/Aziz` deb yozsa ham bir xil profil ochilishi kerak.
    expect(usernameSchema.parse('AZIZ')).toBe('aziz');
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Nom manzilda ketadi. Nuqta, chiziqcha yoki bo'sh joy o'tib ketsa,
   * manzil noaniq bo'lib qolardi.
   */
  it('begona belgilarni rad etadi', () => {
    for (const name of ['aziz.karimov', 'aziz-karimov', 'aziz karimov', 'aziz/karimov', 'aziz@uz']) {
      expect(usernameSchema.safeParse(name).success, name).toBe(false);
    }
  });

  it('raqam bilan boshlanishini rad etadi', () => {
    expect(usernameSchema.safeParse('1aziz').success).toBe(false);
    expect(usernameSchema.safeParse('_aziz').success).toBe(false);
  });

  it('juda qisqa va juda uzunni rad etadi', () => {
    expect(usernameSchema.safeParse('az').success).toBe(false);
    expect(usernameSchema.safeParse(`a${'b'.repeat(30)}`).success).toBe(false);
  });

  /**
   * Band nomlar: ular yo ilova manzillari bilan to'qnashadi, yo
   * rasmiy vakil bo'lib ko'rinish uchun ishlatilishi mumkin.
   */
  it('band nomlarni rad etadi', () => {
    for (const name of ['navix', 'admin', 'support', 'official']) {
      expect(usernameSchema.safeParse(name).success, name).toBe(false);
    }
  });

  it("band nomlar ro'yxatida takror yo'q", () => {
    expect(new Set(RESERVED_USERNAMES).size).toBe(RESERVED_USERNAMES.length);
  });

  it("band nomni katta harf bilan yozib ham aylanib o'tib bo'lmaydi", () => {
    expect(usernameSchema.safeParse('Navix').success).toBe(false);
    expect(isReservedUsername('ADMIN')).toBe(true);
  });
});

describe('usernameParamSchema', () => {
  /**
   * Manzildagi nom band nomlarni RAD ETMAYDI.
   *
   * Aks holda ilova o'zi bergan nomlar bilan profil ochib bo'lmasdi.
   * Bandlik faqat NOM TANLASHDA tekshiriladi.
   */
  it('band nomni ham qabul qiladi', () => {
    expect(usernameParamSchema.safeParse('navix').success).toBe(true);
  });
});

describe('buildDefaultUsername', () => {
  it('ismdan nom yasaydi', () => {
    expect(buildDefaultUsername('Aziz')).toMatch(/^aziz_[a-z0-9]{8}$/);
  });

  it("apostrof va bo'sh joyni tashlaydi", () => {
    expect(buildDefaultUsername('Zulfiya  ')).toMatch(/^zulfiya_[a-z0-9]{8}$/);
  });

  it("lotin bo'lmagan ismda zaxira nom beradi", () => {
    // Kirill yoki bo'sh ism — nom baribir yaroqli bo'lishi kerak.
    expect(buildDefaultUsername('Азиз')).toMatch(/^user_[a-z0-9]{8}$/);
    expect(buildDefaultUsername(null)).toMatch(/^user_[a-z0-9]{8}$/);
  });

  it("yasagan nomi validatsiyadan o'tadi", () => {
    for (const name of ['Aziz', 'Bobur', null, '', '123']) {
      const generated = buildDefaultUsername(name);

      expect(usernameSchema.safeParse(generated).success, generated).toBe(true);
    }
  });

  it('ketma-ket chaqiruvlar bir xil nom bermaydi', () => {
    const names = new Set(Array.from({ length: 50 }, () => buildDefaultUsername('Aziz')));

    expect(names.size).toBe(50);
  });
});

describe('formatCount', () => {
  it("mingdan kichik sonni o'zgartirmaydi", () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
  });

  it('mingni K bilan yozadi', () => {
    expect(formatCount(1_000)).toBe('1K');
    expect(formatCount(12_500)).toBe('12.5K');
    expect(formatCount(13_000)).toBe('13K');
  });

  it('millionni M bilan yozadi', () => {
    expect(formatCount(1_000_000)).toBe('1M');
    expect(formatCount(2_400_000)).toBe('2.4M');
  });

  /**
   * Son PASTGA yaxlitlanadi: 12 999 ta obunachini "13K" deb ko'rsatish
   * bo'rttirish bo'lardi.
   */
  it('sonni pastga yaxlitlaydi', () => {
    expect(formatCount(12_999)).toBe('12.9K');
  });
});

describe('formatWebsite', () => {
  it('protokolni olib tashlaydi', () => {
    expect(formatWebsite('https://navix.uz')).toBe('navix.uz');
    expect(formatWebsite('http://navix.uz/blog')).toBe('navix.uz/blog');
  });

  it('oxiridagi chiziqni olib tashlaydi', () => {
    expect(formatWebsite('https://navix.uz/')).toBe('navix.uz');
  });
});

describe('formatUsername', () => {
  it("@ qo'shadi", () => {
    expect(formatUsername('aziz')).toBe('@aziz');
  });
});

describe('normalizeUserQuery', () => {
  it('@ ni olib tashlaydi', () => {
    expect(normalizeUserQuery('@aziz')).toBe('aziz');
  });

  it('bir nechta @ ni ham olib tashlaydi', () => {
    // Telefon klaviaturasida tasodifan ikki marta bosilishi mumkin.
    expect(normalizeUserQuery('@@aziz')).toBe('aziz');
  });

  it("bo'sh joy va katta harfni tozalaydi", () => {
    expect(normalizeUserQuery('  Aziz Karimov  ')).toBe('aziz karimov');
  });

  it('ichkaridagi @ ga tegmaydi', () => {
    // Faqat BOSHIDAGI @ olib tashlanadi.
    expect(normalizeUserQuery('a@b')).toBe('a@b');
  });

  it("faqat @ dan iborat so'rov bo'sh qoladi", () => {
    expect(normalizeUserQuery('@')).toBe('');
  });
});

describe('userMatchRank', () => {
  it('aynan mos kelgan nom birinchi', () => {
    expect(userMatchRank('aziz', 'Aziz Karimov', 'aziz')).toBe(0);
  });

  it('nom boshida turgani ikkinchi', () => {
    expect(userMatchRank('azizbek', null, 'aziz')).toBe(1);
  });

  it('ism boshida turgani uchinchi', () => {
    expect(userMatchRank('karimov_a', 'Aziz Karimov', 'aziz')).toBe(2);
  });

  it('nom ichida bo‘lgani to‘rtinchi', () => {
    expect(userMatchRank('bek_aziz', null, 'aziz')).toBe(3);
  });

  it('mos kelmagani eng oxirida', () => {
    expect(userMatchRank('sardor', 'Sardor Toshev', 'aziz')).toBe(4);
  });

  it('katta harf ahamiyatsiz', () => {
    // So'rov allaqachon kichik harfga o'girilgan, nom esa bazadan
    // kelgani uchun katta harfli bo'lishi mumkin.
    expect(userMatchRank('AZIZ', null, 'aziz')).toBe(0);
  });

  it("ism yo'q bo'lsa ham yiqilmaydi", () => {
    expect(userMatchRank('sardor', null, 'aziz')).toBe(4);
  });
});

describe('userSearchQuerySchema', () => {
  it("bo'sh so'rov rad etiladi", () => {
    // Bo'sh so'rov butun jadvalni qaytarardi.
    expect(userSearchQuerySchema.safeParse({ q: '   ' }).success).toBe(false);
  });

  it('chegara berilmasa 20 ta', () => {
    expect(userSearchQuerySchema.parse({ q: 'aziz' }).limit).toBe(20);
  });

  it('juda katta chegara rad etiladi', () => {
    expect(userSearchQuerySchema.safeParse({ q: 'aziz', limit: 500 }).success).toBe(false);
  });

  it("juda uzun so'rov rad etiladi", () => {
    expect(userSearchQuerySchema.safeParse({ q: 'a'.repeat(61) }).success).toBe(false);
  });

  it("bo'sh joylar kesiladi", () => {
    expect(userSearchQuerySchema.parse({ q: '  aziz  ' }).q).toBe('aziz');
  });
});
