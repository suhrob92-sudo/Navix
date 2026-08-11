import { describe, expect, it } from 'vitest';

import {
  commentsQuerySchema,
  createCommentSchema,
  createPostSchema,
  feedCursorSchema,
  feedQuerySchema,
} from '@/modules/feed/feed.schemas';
import {
  authorDisplayName,
  formatReactionCount,
  COMMENT_MAX_LENGTH,
  POST_MAX_LENGTH,
  type PostAuthorView,
} from '@/modules/feed/feed.types';

function author(overrides: Partial<PostAuthorView> = {}): PostAuthorView {
  return {
    userId: '6a1b2c3d-4e5f-4a7b-8c9d-0e1f2a3b4c5d',
    username: 'bobur_k',
    fullName: 'Bobur Karimov',
    avatarUrl: null,
    isVerified: false,
    ...overrides,
  };
}

describe('authorDisplayName', () => {
  it("ism bo'lsa ism ko'rsatiladi", () => {
    expect(authorDisplayName(author())).toBe('Bobur Karimov');
  });

  it("ism yo'q bo'lsa nom ko'rsatiladi", () => {
    expect(authorDisplayName(author({ fullName: null }))).toBe('@bobur_k');
  });

  it("ikkalasi ham yo'q bo'lsa bo'sh joy qolmaydi", () => {
    // Post kimniki ekani BILINMAY qolmasligi kerak.
    expect(authorDisplayName(author({ fullName: null, username: '' }))).toBe('Foydalanuvchi');
  });
});

describe('formatReactionCount', () => {
  it("nol bo'lsa hech narsa yozilmaydi", () => {
    // Tugma yonidagi "0" — "hech kim yoqtirmadi" degan ta'kid.
    expect(formatReactionCount(0)).toBe('');
    expect(formatReactionCount(-3)).toBe('');
  });

  it("kichik sonlar to'liq ko'rinadi", () => {
    expect(formatReactionCount(1)).toBe('1');
    expect(formatReactionCount(999)).toBe('999');
  });

  it('mingdan oshgani qisqartiriladi', () => {
    expect(formatReactionCount(1_000)).toBe('1K');
    expect(formatReactionCount(12_500)).toBe('12.5K');
  });
});

describe('feedCursorSchema', () => {
  it("to'g'ri belgini qabul qiladi", () => {
    const cursor = '2026-08-11T02:10:00.000Z_6a1b2c3d-4e5f-4a7b-8c9d-0e1f2a3b4c5d';

    expect(feedCursorSchema.parse(cursor)).toBe(cursor);
  });

  it('buzilgan belgi rad etiladi', () => {
    /**
     * Belgi MANZILDAN keladi — uni istalgan odam o'zgartira oladi.
     * Tekshiruvsiz u to'g'ridan-to'g'ri bazaga tushardi.
     */
    expect(feedCursorSchema.safeParse('kecha').success).toBe(false);
    expect(feedCursorSchema.safeParse('2026-08-11T02:10:00.000Z').success).toBe(false);
    expect(feedCursorSchema.safeParse("2026-08-11T02:10:00.000Z_'; drop table posts--").success).toBe(false);
  });
});

describe('feedQuerySchema', () => {
  it("sukut bo'yicha obunalar bo'limi ochiladi", () => {
    const result = feedQuerySchema.parse({});

    expect(result.tab).toBe('FOLLOWING');
    expect(result.limit).toBe(20);
  });

  it("noma'lum bo'lim rad etiladi", () => {
    expect(feedQuerySchema.safeParse({ tab: 'POPULAR' }).success).toBe(false);
  });

  it('chegara cheklangan', () => {
    // Cheksiz chegara bilan butun bazani bir so'rovda yuklab olish mumkin bo'lardi.
    expect(feedQuerySchema.safeParse({ limit: 500 }).success).toBe(false);
  });
});

describe('commentsQuerySchema', () => {
  it("sukut bo'yicha 30 ta izoh", () => {
    expect(commentsQuerySchema.parse({}).limit).toBe(30);
  });
});

describe('createPostSchema', () => {
  it("chetlaridagi bo'sh joy tozalanadi", () => {
    expect(createPostSchema.parse({ body: '  Salom  ' }).body).toBe('Salom');
  });

  it("faqat bo'sh joydan iborat post rad etiladi", () => {
    expect(createPostSchema.safeParse({ body: '     ' }).success).toBe(false);
  });

  it('juda uzun post rad etiladi', () => {
    expect(createPostSchema.safeParse({ body: 'x'.repeat(POST_MAX_LENGTH + 1) }).success).toBe(false);
  });

  it("chegaradagi uzunlik o'tadi", () => {
    expect(createPostSchema.safeParse({ body: 'x'.repeat(POST_MAX_LENGTH) }).success).toBe(true);
  });
});

describe('createCommentSchema', () => {
  it("bo'sh izoh rad etiladi", () => {
    expect(createCommentSchema.safeParse({ body: '\n\n' }).success).toBe(false);
  });

  it('juda uzun izoh rad etiladi', () => {
    expect(createCommentSchema.safeParse({ body: 'x'.repeat(COMMENT_MAX_LENGTH + 1) }).success).toBe(false);
  });
});
