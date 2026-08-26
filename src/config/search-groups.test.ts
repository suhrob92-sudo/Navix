import { describe, expect, it } from 'vitest';

import {
  MIN_QUERY_LENGTH,
  RESULTS_PER_GROUP,
  SEARCH_GROUPS,
  groupSearchPath,
  groupsForQuery,
  isPeopleQuery,
  rankByMatch,
} from '@/config/search-groups';

/**
 * Yagona qidiruv — testlar.
 *
 * Bu yerdagi xato ikki xil bo'lishi mumkin: natija topilmaydi
 * (odam ilovani tashlab ketadi) yoki BEGONA narsa ko'rinadi
 * (xabarlar shaxsiy — bu jiddiyroq).
 */

describe("bo'limlar ro'yxati", () => {
  it('takrorlanmaydi', () => {
    expect(new Set(SEARCH_GROUPS.map((group) => group.key)).size).toBe(SEARCH_GROUPS.length);
  });

  it('har birida nom va ikonka bor', () => {
    for (const group of SEARCH_GROUPS) {
      expect(group.label.length).toBeGreaterThan(0);
      expect(group.icon.length).toBeGreaterThan(0);
    }
  });

  it('XABARLAR faqat kirgan odam uchun', () => {
    // Xabarlar shaxsiy — bu eng muhim shart.
    expect(SEARCH_GROUPS.find((group) => group.key === 'MESSAGE')?.requiresAuth).toBe(true);
  });

  it('katalog bo\'limlari HAMMAGA ochiq', () => {
    /**
     * Odam avval nima borligini ko'rib, keyin ro'yxatdan o'tishga
     * qaror qiladi. Katalogni yopish uni darvozadan qaytarardi.
     */
    for (const key of ['PRODUCT', 'MENU_ITEM', 'HOTEL', 'VACANCY'] as const) {
      expect(SEARCH_GROUPS.find((group) => group.key === key)?.requiresAuth).toBe(false);
    }
  });
});

describe("qaysi bo'limlar so'raladi", () => {
  it('juda qisqa so\'rovda HECH BIRI', () => {
    /**
     * Bitta harf butun katalogni qaytaradi: natija foydasiz,
     * so'rov esa og'ir.
     */
    expect(groupsForQuery('a', true)).toEqual([]);
    expect(groupsForQuery('', true)).toEqual([]);
    expect(groupsForQuery('   ', true)).toEqual([]);
  });

  it('chegaraning O\'ZI ishlaydi', () => {
    expect(groupsForQuery('a'.repeat(MIN_QUERY_LENGTH), true).length).toBeGreaterThan(0);
  });

  it('kirmagan odamga XABARLAR so\'ralmaydi', () => {
    const groups = groupsForQuery('plov', false);

    expect(groups).not.toContain('MESSAGE');
    expect(groups).not.toContain('USER');
  });

  it('kirgan odamga hammasi', () => {
    expect(groupsForQuery('plov', true)).toHaveLength(SEARCH_GROUPS.length);
  });

  it('"@" bilan boshlansa — FAQAT odamlar', () => {
    /**
     * "@aziz" deb yozgan odam taksi yoki pizza izlamayotgani
     * ravshan.
     */
    expect(groupsForQuery('@aziz', true)).toEqual(['USER']);
  });

  it('"@" bilan boshlangan, lekin kirmagan — bo\'sh', () => {
    expect(groupsForQuery('@aziz', false)).toEqual([]);
  });

  it('bo\'shliqlar hisobga olinmaydi', () => {
    expect(isPeopleQuery('  @aziz')).toBe(true);
    expect(isPeopleQuery('aziz@mail')).toBe(false);
  });
});

describe('tartiblash', () => {
  const items = [
    { name: 'nonushta toplami' },
    { name: 'issiq non' },
    { name: 'non' },
    { name: 'nonvoyxona' },
  ];

  it('SO\'Z BOSHIDAN moslik tepada', () => {
    /**
     * Odam "non" deb yozganda "Non" ni kutadi, "Nonushta
     * to'plami" ni emas.
     */
    const ranked = rankByMatch(items, 'non', (item) => item.name);

    expect(ranked[0].name).toBe('nonushta toplami');
  });

  it('so\'z ichidagi moslik PASTDA', () => {
    const ranked = rankByMatch(items, 'non', (item) => item.name);

    // "issiq non" — probeldan keyin boshlanadi, ya'ni ikkinchi daraja.
    expect(ranked.map((item) => item.name)).toEqual([
      'nonushta toplami',
      'non',
      'nonvoyxona',
      'issiq non',
    ]);
  });

  it('teng ballda dastlabki tartib SAQLANADI', () => {
    // Aks holda sahifa har yangilanganda ro'yxat o'zgarardi.
    const same = [{ name: 'aaa' }, { name: 'aab' }, { name: 'aac' }];

    expect(rankByMatch(same, 'aa', (item) => item.name)).toEqual(same);
  });

  it('bo\'sh ro\'yxatda bo\'sh javob', () => {
    expect(rankByMatch([], 'non', (item: { name: string }) => item.name)).toEqual([]);
  });
});

describe("bo'lim sahifasi", () => {
  it('har bo\'lim uchun manzil bor', () => {
    for (const group of SEARCH_GROUPS) {
      expect(groupSearchPath(group.key, 'plov').length).toBeGreaterThan(1);
    }
  });

  it('so\'rov manzilga XAVFSIZ yoziladi', () => {
    /**
     * So'rovda probel, "&" yoki "?" bo'lishi mumkin. Kodlanmasa,
     * manzil buzilib, boshqa filtrga aylanardi.
     */
    const path = groupSearchPath('PRODUCT', 'non & suv');

    expect(path).toContain('non%20%26%20suv');
    expect(path.split('?')[1].split('&')).toHaveLength(1);
  });

  it("bo'limlar TURLI sahifalarga boradi", () => {
    const paths = SEARCH_GROUPS.map((group) => groupSearchPath(group.key, 'x'));

    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('sozlama', () => {
  it("har bo'limdan oz natija", () => {
    // Oltita bo'lim x 5 = 30 qator; ko'proq bo'lsa pastgacha yetib bo'lmaydi.
    expect(RESULTS_PER_GROUP).toBeLessThanOrEqual(6);
  });
});
