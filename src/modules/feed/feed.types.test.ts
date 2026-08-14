import { describe, expect, it } from 'vitest';

import {
  commentsQuerySchema,
  createCommentSchema,
  createPostSchema,
  feedCursorSchema,
  feedQuerySchema,
  updatePostSchema,
} from '@/modules/feed/feed.schemas';
import {
  authorDisplayName,
  formatReactionCount,
  hasPostContent,
  isVideoPost,
  COMMENT_MAX_LENGTH,
  POST_MAX_LENGTH,
  type PostAuthorView,
} from '@/modules/feed/feed.types';
import { MAX_VIDEO_SECONDS } from '@/modules/upload/upload.types';

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

describe('hasPostContent', () => {
  it("matn bo'lsa yetarli", () => {
    expect(hasPostContent('Salom', null)).toBe(true);
  });

  it("rasm o'zi ham post", () => {
    // "Mana shu manzara" degan postga matn shart emas.
    expect(hasPostContent('', '/api/v1/files/posts/a/b.webp')).toBe(true);
  });

  it("ikkalasi ham yo'q bo'lsa post emas", () => {
    expect(hasPostContent('   ', null)).toBe(false);
  });
});

describe('createPostSchema — rasm bilan', () => {
  const image = '/api/v1/files/posts/a/b.webp';

  it('matnsiz, rasmli post qabul qilinadi', () => {
    const result = createPostSchema.safeParse({ imageUrl: image });

    expect(result.success).toBe(true);
  });

  it("matn ham, rasm ham bo'lmasa rad etiladi", () => {
    expect(createPostSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(createPostSchema.safeParse({}).success).toBe(false);
  });

  it('BEGONA rasm manzili rad etiladi', () => {
    /**
     * Begona sayt rasmi biriktirilsa, lentani ko'rgan har bir odamning
     * IP manzili o'sha saytga yetib borardi.
     */
    expect(createPostSchema.safeParse({ imageUrl: 'https://tracker.example.com/p.gif' }).success).toBe(false);
  });
});

describe('postni tahrirlash sxemasi', () => {
  it("to'g'ri matn qabul qilinadi", () => {
    expect(updatePostSchema.safeParse({ body: 'Tuzatilgan matn' }).success).toBe(true);
  });

  it("bo'shliqlar olib tashlanadi", () => {
    expect(updatePostSchema.parse({ body: '   salom   ' }).body).toBe('salom');
  });

  it("BO'SH matn sxemadan o'tadi", () => {
    /**
     * Bu ataylab shunday: rasm biriktirilgan postda matn bo'sh
     * bo'lishi mumkin. Rasmsiz postni bo'shatib bo'lmasligini
     * XIZMAT tekshiradi — faqat u postda rasm bor-yo'qligini
     * biladi.
     */
    expect(updatePostSchema.safeParse({ body: '' }).success).toBe(true);
  });

  it('juda uzun matn rad etiladi', () => {
    expect(updatePostSchema.safeParse({ body: 'a'.repeat(POST_MAX_LENGTH + 1) }).success).toBe(false);
  });

  it('matnsiz so\'rov rad etiladi', () => {
    expect(updatePostSchema.safeParse({}).success).toBe(false);
  });
});

describe('video postlar', () => {
  const base = { videoUrl: null as string | null, isDeleted: false };

  it('videosiz post video post EMAS', () => {
    expect(isVideoPost(base)).toBe(false);
  });

  it('videoli post video post', () => {
    expect(isVideoPost({ ...base, videoUrl: '/api/v1/files/videos/a/b.mp4' })).toBe(true);
  });

  it("o'chirilgan post video post EMAS", () => {
    /**
     * O'chirilgan postda video manzili baribir berilmaydi. Lekin bu
     * tekshiruv ikkinchi qulf: kimdir kelajakda manzilni qaytarsa
     * ham, o'chirilgan post pleyer bilan chizilmaydi.
     */
    expect(isVideoPost({ videoUrl: '/api/v1/files/videos/a/b.mp4', isDeleted: true })).toBe(false);
  });
});

describe('video post sxemasi', () => {
  const video = '/api/v1/files/videos/aaa/bbb.mp4';

  it('video bilan post qabul qilinadi', () => {
    expect(createPostSchema.safeParse({ body: '', videoUrl: video, videoSeconds: 12 }).success).toBe(true);
  });

  it('BEGONA manzil rad etiladi', () => {
    /**
     * Begona manzil qo'yilsa, videoni ko'rgan HAR BIR odamning IP
     * manzili o'sha saytga yetardi va egasi faylni istalgan payt
     * boshqasiga almashtira olardi.
     */
    expect(createPostSchema.safeParse({ body: '', videoUrl: 'https://example.com/a.mp4' }).success).toBe(false);
  });

  it("rasm va video BIRGA bo'lmaydi", () => {
    const result = createPostSchema.safeParse({
      body: '',
      videoUrl: video,
      imageUrl: '/api/v1/files/posts/aaa/bbb.jpg',
    });

    expect(result.success).toBe(false);
  });

  it('juda uzun video rad etiladi', () => {
    expect(
      createPostSchema.safeParse({ body: '', videoUrl: video, videoSeconds: MAX_VIDEO_SECONDS + 1 }).success,
    ).toBe(false);
  });

  it("mahsulotni faqat VIDEOGA biriktirish mumkin", () => {
    const withoutVideo = createPostSchema.safeParse({
      body: 'salom',
      productId: '4a2f8c1e-5b7d-4e3a-9f6c-1d8e2b5a7c93',
    });

    expect(withoutVideo.success).toBe(false);

    const withVideo = createPostSchema.safeParse({
      body: 'salom',
      videoUrl: video,
      productId: '4a2f8c1e-5b7d-4e3a-9f6c-1d8e2b5a7c93',
    });

    expect(withVideo.success).toBe(true);
  });

  it("noto'g'ri mahsulot ID rad etiladi", () => {
    expect(createPostSchema.safeParse({ body: '', videoUrl: video, productId: 'salom' }).success).toBe(false);
  });
});
