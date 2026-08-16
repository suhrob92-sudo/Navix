import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FEED_INTRO_DESTINATION, FEED_INTRO_SLIDES } from '@/config/feed-intro';
import { FEED_SETTINGS_ITEMS } from '@/config/feed-settings-nav';
import { POST_CATEGORY_VALUES } from '@/modules/feed/feed.types';
import { feedSettingsSchema } from '@/modules/feed/settings.schemas';
import {
  AUDIENCE_SCOPES,
  COMMENT_SCOPES,
  DEFAULT_FEED_SETTINGS,
  FOLLOW_SCOPES,
  NOTIFY_ITEMS,
  NOTIFY_KEYS,
  PROFILE_SCOPES,
} from '@/modules/feed/settings.types';

/**
 * Sozlamalar UCH joyda yozilgan: baza (`schema.prisma`), server turi
 * va ekran ro'yxati. Mosligini shu sinov qo'riqlaydi — bittasi
 * o'zgarib, ikkinchisi qolib ketsa, odam ekranda bir narsani
 * ko'rib, lentada boshqasini olardi.
 */
describe('Feed sozlamalari — turlar', () => {
  it('standart holat bazadagi qiymatlar bilan mos', () => {
    const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
    const model = /model FeedSettings \{([\s\S]*?)\n\}/.exec(schema);

    expect(model, 'schema.prisma ichida FeedSettings topilmadi').not.toBeNull();

    const body = model?.[1] ?? '';

    // Mantiqiy bayroqlar: bazadagi `@default` va koddagi qiymat bir xil.
    for (const key of NOTIFY_KEYS) {
      const line = new RegExp(`${key}\\s+Boolean\\s+@default\\((true|false)\\)`).exec(body);

      expect(line, `${key} bazada topilmadi`).not.toBeNull();
      expect(line?.[1] === 'true', `${key} mos emas`).toBe(DEFAULT_FEED_SETTINGS[key]);
    }

    const sensitive = /sensitiveFilter\s+Boolean\s+@default\((true|false)\)/.exec(body);

    expect(sensitive?.[1] === 'true').toBe(DEFAULT_FEED_SETTINGS.sensitiveFilter);
  });

  it('AudienceScope enum bazadagi bilan bir xil', () => {
    const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
    const block = /enum AudienceScope \{([^}]*)\}/.exec(schema);

    const fromSchema = (block?.[1] ?? '')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, '').trim())
      .filter((line) => line.length > 0);

    expect(new Set(fromSchema)).toEqual(new Set(AUDIENCE_SCOPES));
  });

  it('har bir tanlov ro\'yxatida uchala qiymat bor', () => {
    for (const choices of [PROFILE_SCOPES, COMMENT_SCOPES, FOLLOW_SCOPES]) {
      expect(choices.map((item) => item.value)).toEqual([...AUDIENCE_SCOPES]);

      for (const choice of choices) {
        expect(choice.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('bildirishnoma ro\'yxati kalitlar bilan mos', () => {
    expect(NOTIFY_ITEMS.map((item) => item.key)).toEqual([...NOTIFY_KEYS]);
  });

  it('faqat jonli efir tayyor emas', () => {
    const pending = NOTIFY_ITEMS.filter((item) => item.isComingSoon).map((item) => item.key);

    expect(pending).toEqual(['notifyLive']);
  });
});

describe('Feed tanishtiruvi', () => {
  it('tanishtiruv boshida TUGAMAGAN deb hisoblanadi', () => {
    // Yangi odamda yozuv umuman yo'q — standart holat qaytadi.
    // Agar bu qiymat `null` bo'lmasa, tanishtiruv hech kimga
    // ko'rsatilmasdi.
    expect(DEFAULT_FEED_SETTINGS.feedOnboardedAt).toBeNull();
  });

  it('bazada ham ixtiyoriy ustun', () => {
    const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
    const model = /model FeedSettings \{([\s\S]*?)\n\}/.exec(schema);

    expect(/feedOnboardedAt\s+DateTime\?/.test(model?.[1] ?? '')).toBe(true);
  });

  it('uchta tanishtiruv qadami bor', () => {
    // Uzun tanishtiruvni hech kim o'qimaydi.
    expect(FEED_INTRO_SLIDES).toHaveLength(3);

    for (const slide of FEED_INTRO_SLIDES) {
      expect(slide.title.length).toBeGreaterThan(0);
      expect(slide.description.length).toBeGreaterThan(0);
    }
  });

  it('tanishtiruvdan keyin VIDEO sahifasiga otiladi', () => {
    expect(FEED_INTRO_DESTINATION).toBe('/feed/watch');
  });
});

describe('Feed sozlamalari — ro\'yxat', () => {
  it('har bir qator noyob', () => {
    const ids = FEED_SETTINGS_ITEMS.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("manzilsiz qatorlar faqat amal bajaradiganlar", () => {
    const actions = FEED_SETTINGS_ITEMS.filter((item) => item.href === null).map((item) => item.id);

    // Kesh tozalash va tiklash — sahifa emas, amal.
    expect(actions).toEqual(['CACHE', 'RESET']);
  });

  it('barcha manzillar "/" bilan boshlanadi', () => {
    for (const item of FEED_SETTINGS_ITEMS) {
      if (item.href === null) continue;

      expect(item.href.startsWith('/'), `${item.href} noto'g'ri`).toBe(true);
    }
  });
});

describe('feedSettingsSchema', () => {
  it("bo'sh so'rovni qabul qiladi", () => {
    // Bitta tugma bosilganda faqat o'sha maydon keladi.
    expect(feedSettingsSchema.parse({})).toEqual({});
  });

  it('takrorlangan bo\'limlarni tozalaydi', () => {
    const result = feedSettingsSchema.parse({ interests: ['JOBS', 'JOBS', 'TRAVEL'] });

    expect(result.interests).toEqual(['JOBS', 'TRAVEL']);
  });

  it("noma'lum bo'limni rad etadi", () => {
    expect(() => feedSettingsSchema.parse({ interests: ['MUSIQA'] })).toThrow();
  });

  it("noma'lum ruxsat qiymatini rad etadi", () => {
    expect(() => feedSettingsSchema.parse({ commentScope: 'FRIENDS' })).toThrow();
  });

  it('barcha haqiqiy bo\'limlarni qabul qiladi', () => {
    const result = feedSettingsSchema.parse({ notInterested: [...POST_CATEGORY_VALUES] });

    expect(result.notInterested).toHaveLength(POST_CATEGORY_VALUES.length);
  });
});
