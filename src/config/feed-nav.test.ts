import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CREATE_CHOICES,
  FEED_CATEGORIES,
  FEED_FEATURES,
  FEED_NAV,
  POST_CATEGORIES,
  feedQueryFor,
  isFeedMode,
  isFeedNavActive,
  isInsideFeed,
  type FeedFilterValue,
} from '@/config/feed-nav';
import { POST_CATEGORY_LABELS, POST_CATEGORY_VALUES } from '@/modules/feed/feed.types';

/**
 * Feed kategoriyalari uch joyda yozilgan:
 *   1. `prisma/schema.prisma` — `PostCategory` enum (baza);
 *   2. `feed.types.ts` — `POST_CATEGORY_VALUES` (server va sxema);
 *   3. `feed-nav.ts` — `FEED_CATEGORIES` (ekrandagi qator).
 *
 * Takrorlash ataylab: navigatsiya fayli Prisma turini import qilsa,
 * u server kodiga bog'lanib qolardi va brauzer paketiga tushmasdi.
 *
 * Shuning uchun MOSLIKNI shu sinov qo'riqlaydi — bittasi o'zgarib,
 * ikkinchisi qolib ketsa, sinov darhol yiqiladi.
 */
describe('Feed kategoriyalari', () => {
  it("qatorda o'n ikkita doira bor", () => {
    // Uchta usul (Siz uchun, Obunalar, Yaqin atrofda) + to'qqizta bo'lim.
    expect(FEED_CATEGORIES).toHaveLength(3 + POST_CATEGORY_VALUES.length);
  });

  it('har bir qiymat noyob', () => {
    const values = FEED_CATEGORIES.map((item) => item.value);

    expect(new Set(values).size).toBe(values.length);
  });

  it("birinchi uchtasi — ko'rish usullari", () => {
    expect(FEED_CATEGORIES.slice(0, 3).map((item) => item.value)).toEqual([
      'FOR_YOU',
      'FOLLOWING',
      'NEARBY',
    ]);
  });

  it("har bir doirada belgi va bo'sh holat matni bor", () => {
    for (const item of FEED_CATEGORIES) {
      expect(item.emoji.length, `${item.value} belgisiz`).toBeGreaterThan(0);
      expect(item.label.length, `${item.value} nomsiz`).toBeGreaterThan(0);
      expect(item.emptyTitle.length, `${item.value} sarlavhasiz`).toBeGreaterThan(0);
      expect(item.emptyDescription.length, `${item.value} izohsiz`).toBeGreaterThan(0);
    }
  });

  it('"Yaqin atrofda" hali tayyor emas deb belgilangan', () => {
    const nearby = FEED_CATEGORIES.find((item) => item.value === 'NEARBY');

    // Joylashuv keyingi bosqichda qo'shiladi. Doirani yashirish
    // o'rniga halol "Tez orada" yozuvi ko'rsatiladi.
    expect(nearby?.isComingSoon).toBe(true);
    expect(nearby?.emptyTitle).toBe('Tez orada');
  });

  it('faqat "Yaqin atrofda" tayyor emas', () => {
    const pending = FEED_CATEGORIES.filter((item) => item.isComingSoon).map((item) => item.value);

    expect(pending).toEqual(['NEARBY']);
  });
});

describe('POST_CATEGORIES', () => {
  it("usullarni o'z ichiga olmaydi", () => {
    for (const item of POST_CATEGORIES) {
      expect(isFeedMode(item.value), `${item.value} usul edi`).toBe(false);
    }
  });

  it('bazadagi ro\'yxat bilan aynan mos', () => {
    expect(POST_CATEGORIES.map((item) => item.value)).toEqual([...POST_CATEGORY_VALUES]);
  });

  it('nomlari server tomondagi nomlar bilan bir xil', () => {
    for (const item of POST_CATEGORIES) {
      expect(POST_CATEGORY_LABELS[item.value as (typeof POST_CATEGORY_VALUES)[number]]).toBe(
        item.label,
      );
    }
  });
});

describe('Prisma enum bilan moslik', () => {
  it('PostCategory enum va POST_CATEGORY_VALUES bir xil', () => {
    const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
    const block = /enum PostCategory \{([^}]*)\}/.exec(schema);

    expect(block, "schema.prisma ichida PostCategory enum topilmadi").not.toBeNull();

    const fromSchema = (block?.[1] ?? '')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, '').trim())
      .filter((line) => line.length > 0);

    expect(new Set(fromSchema)).toEqual(new Set(POST_CATEGORY_VALUES));
  });
});

describe('feedQueryFor', () => {
  it('"Obunalar" obunalar bo\'limini so\'raydi', () => {
    expect(feedQueryFor('FOLLOWING')).toEqual({ tab: 'FOLLOWING' });
  });

  it('"Siz uchun" hamma kontentni so\'raydi', () => {
    // Kategoriya YO'Q — filtrsiz, hammasi ko'rinadi.
    expect(feedQueryFor('FOR_YOU')).toEqual({ tab: 'LATEST' });
  });

  it('"Yaqin atrofda" hozircha oddiy lentaga tushadi', () => {
    // Joylashuv yo'q ekan, noto'g'ri filtr yuborilmaydi.
    expect(feedQueryFor('NEARBY')).toEqual({ tab: 'LATEST' });
  });

  it('bo\'lim tanlansa, u `category` bo\'lib ketadi', () => {
    expect(feedQueryFor('RESTAURANTS')).toEqual({ tab: 'LATEST', category: 'RESTAURANTS' });
    expect(feedQueryFor('JOBS')).toEqual({ tab: 'LATEST', category: 'JOBS' });
  });

  it('har bir doira uchun so\'rov hosil bo\'ladi', () => {
    for (const item of FEED_CATEGORIES) {
      const query = feedQueryFor(item.value);

      expect(query.tab.length, `${item.value} bo'sh so'rov`).toBeGreaterThan(0);
    }
  });
});

describe('isFeedMode', () => {
  it('usullarni ajratadi', () => {
    expect(isFeedMode('FOR_YOU')).toBe(true);
    expect(isFeedMode('FOLLOWING')).toBe(true);
    expect(isFeedMode('NEARBY')).toBe(true);
  });

  it("bo'limlarni usul deb hisoblamaydi", () => {
    for (const value of POST_CATEGORY_VALUES) {
      expect(isFeedMode(value as FeedFilterValue), `${value} usul deb topildi`).toBe(false);
    }
  });
});

describe('Feed menyusi', () => {
  it('har bir manzil noyob va "/feed" ichida', () => {
    const hrefs = FEED_FEATURES.map((item) => item.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);

    for (const href of hrefs) {
      expect(href.startsWith('/feed/'), `${href} noto'g'ri`).toBe(true);
    }
  });

  it('yaratish tanlovlari to\'rtta va noyob', () => {
    const ids = CREATE_CHOICES.map((item) => item.id);

    expect(ids).toEqual(['VIDEO', 'POST', 'STORY', 'LIVE']);
  });

  it('faqat jonli efir tayyor emas', () => {
    const pending = CREATE_CHOICES.filter((item) => item.isComingSoon).map((item) => item.id);

    expect(pending).toEqual(['LIVE']);
  });
});

describe('Feed moduli navigatsiyasi', () => {
  it('beshta bo\'lim bor va markazda yaratish turadi', () => {
    expect(FEED_NAV).toHaveLength(5);
    expect(FEED_NAV[2].isCreate).toBe(true);
  });

  it('faqat bitta yaratish tugmasi bor', () => {
    expect(FEED_NAV.filter((item) => item.isCreate)).toHaveLength(1);
  });

  it('yaratish tugmasi sahifa ochmaydi', () => {
    // U oyna ochadi. Havola bo'lsa, brauzer tarixiga yozilib qolardi.
    const create = FEED_NAV.find((item) => item.isCreate);

    expect(create?.href).toBeNull();
  });

  it('barcha manzillar "/feed" ichida va noyob', () => {
    const hrefs = FEED_NAV.map((item) => item.href).filter((href): href is string => href !== null);

    expect(new Set(hrefs).size).toBe(hrefs.length);

    for (const href of hrefs) {
      expect(href === '/feed' || href.startsWith('/feed/'), `${href} noto'g'ri`).toBe(true);
    }
  });

  describe('isFeedNavActive', () => {
    it('"Asosiy" faqat aynan /feed da faol', () => {
      const home = FEED_NAV[0];

      expect(isFeedNavActive('/feed', home)).toBe(true);
      // Ichki sahifa bosh sahifani yoqmaydi — aks holda ikkita
      // bo'lim birdan yonib turardi.
      expect(isFeedNavActive('/feed/videos', home)).toBe(false);
    });

    it('ichki sahifa o\'z bo\'limini yoqadi', () => {
      const videos = FEED_NAV[1];

      expect(isFeedNavActive('/feed/videos', videos)).toBe(true);
      expect(isFeedNavActive('/feed/videos/123', videos)).toBe(true);
    });

    it('o\'xshash boshlanishli manzilni chalkashtirmaydi', () => {
      const search = FEED_NAV.find((item) => item.href === '/feed/search');

      expect(search && isFeedNavActive('/feed/searchXYZ', search)).toBe(false);
    });

    it('yaratish tugmasi hech qachon faol bo\'lmaydi', () => {
      const create = FEED_NAV[2];

      expect(isFeedNavActive('/feed', create)).toBe(false);
    });
  });

  describe('isInsideFeed', () => {
    it('Feed sahifalarini taniydi', () => {
      expect(isInsideFeed('/feed')).toBe(true);
      expect(isInsideFeed('/feed/videos')).toBe(true);
      expect(isInsideFeed('/feed/tag/burger')).toBe(true);
    });

    it("Feed'dan tashqaridagi sahifalarni tanimaydi", () => {
      expect(isInsideFeed('/dashboard')).toBe(false);
      expect(isInsideFeed('/profile')).toBe(false);
      // `/feedback` — Feed emas.
      expect(isInsideFeed('/feedback')).toBe(false);
    });
  });
});
