import { describe, expect, it } from 'vitest';

import { WAITLIST_BENEFITS, WAITLIST_RULES, WAITLIST_SOURCES } from '@/config/waitlist';
import { joinWaitlistSchema } from '@/modules/waitlist/waitlist.schemas';
import { formatPosition } from '@/modules/waitlist/waitlist.types';

describe('joinWaitlistSchema', () => {
  it('faqat telefon bilan ham qabul qiladi', () => {
    const parsed = joinWaitlistSchema.parse({ phone: '901234567' });

    expect(parsed.phone).toBe('+998901234567');
    expect(parsed.name).toBeUndefined();
  });

  it("to'liq ma'lumotni qabul qiladi", () => {
    const parsed = joinWaitlistSchema.parse({
      phone: '+998 90 123 45 67',
      name: '  Aziz  ',
      city: 'Toshkent',
      source: 'instagram',
    });

    expect(parsed.phone).toBe('+998901234567');
    expect(parsed.name).toBe('Aziz');
    expect(parsed.source).toBe('instagram');
  });

  it("noto'g'ri telefonni rad etadi", () => {
    expect(joinWaitlistSchema.safeParse({ phone: '123' }).success).toBe(false);
    expect(joinWaitlistSchema.safeParse({}).success).toBe(false);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * `source` ochiq matn bo'lsa, havolani tahrirlab bazaga xohlagan
   * yozuvni tiqish mumkin bo'lardi — hisobot esa axlatga to'lardi.
   */
  it("noma'lum manbani rad etadi", () => {
    expect(joinWaitlistSchema.safeParse({ phone: '901234567', source: 'reklama' }).success).toBe(false);
    expect(joinWaitlistSchema.safeParse({ phone: '901234567', source: '<script>' }).success).toBe(false);
  });

  it("o'rinni qabul qilmaydi", () => {
    // O'rin bazadagi ketma-ketlikdan keladi. Mijoz uni tanlay olsa,
    // hamma o'zini birinchi qilib yozib olardi.
    const parsed = joinWaitlistSchema.parse({ phone: '901234567', position: 1 });

    expect(parsed).not.toHaveProperty('position');
  });

  it('juda uzun ism va shaharni rad etadi', () => {
    expect(joinWaitlistSchema.safeParse({ phone: '901234567', name: 'a'.repeat(121) }).success).toBe(false);
    expect(joinWaitlistSchema.safeParse({ phone: '901234567', city: 'a'.repeat(81) }).success).toBe(false);
  });
});

describe('formatPosition', () => {
  it("o'rinni o'zbekcha yozadi", () => {
    expect(formatPosition(7)).toBe("7-o'rin");
  });
});

describe('navbat sozlamalari', () => {
  it('manbalar takrorlanmaydi', () => {
    expect(new Set(WAITLIST_SOURCES).size).toBe(WAITLIST_SOURCES.length);
  });

  it("sonni ko'rsatish chegarasi mantiqiy", () => {
    expect(WAITLIST_RULES.showCountFrom).toBeGreaterThan(0);
  });

  it("har bir va'dada sarlavha va tavsif bor", () => {
    for (const benefit of WAITLIST_BENEFITS) {
      expect(benefit.title.length).toBeGreaterThan(3);
      expect(benefit.description.length).toBeGreaterThan(10);
    }
  });
});
