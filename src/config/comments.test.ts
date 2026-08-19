import { describe, expect, it } from 'vitest';

import {
  AUTHOR_COMMENT_LABEL,
  COMMENT_SORTS,
  COMMENT_SORT_LABELS,
  DEFAULT_COMMENT_SORT,
  PINNED_COMMENT_LABEL,
} from '@/config/comments';
import { commentsQuerySchema } from '@/modules/feed/feed.schemas';

describe('saralash turlari', () => {
  it("har bir turda ekrandagi yozuv bor", () => {
    /*
      Yozuvsiz tur bo'sh tugma bo'lardi: uni ko'rish ham, nima
      qilishini bilish ham mumkin emasdi.
    */
    for (const sort of COMMENT_SORTS) {
      expect(COMMENT_SORT_LABELS[sort]).toBeTruthy();
    }
  });

  it("yozuvlar ro'yxatida ortiqchasi yo'q", () => {
    expect(Object.keys(COMMENT_SORT_LABELS).sort()).toEqual([...COMMENT_SORTS].sort());
  });

  it("odatiy tur ro'yxatda BOR", () => {
    /*
      Odatiy qiymat ro'yxatdan tushib qolsa, sahifa ochilishi
      bilan server uni rad etardi va izohlar umuman yuklanmasdi.
    */
    expect(COMMENT_SORTS).toContain(DEFAULT_COMMENT_SORT);
  });

  it('odatiy tur — YANGI', () => {
    expect(DEFAULT_COMMENT_SORT).toBe('NEW');
  });
});

describe('belgilar', () => {
  it("yozuvlar bo'sh emas", () => {
    expect(PINNED_COMMENT_LABEL.trim().length).toBeGreaterThan(0);
    expect(AUTHOR_COMMENT_LABEL.trim().length).toBeGreaterThan(0);
  });

  it("belgilar QISQA", () => {
    // Ular izoh muallifi nomi yonida turadi: uzun yozuv ismni
    // ekrandan surib yuborardi.
    expect(PINNED_COMMENT_LABEL.length).toBeLessThanOrEqual(15);
    expect(AUTHOR_COMMENT_LABEL.length).toBeLessThanOrEqual(15);
  });
});

describe('commentsQuerySchema', () => {
  const DATE_CURSOR = '2026-08-11T02:10:00.000Z_9f0e1c2d-3a4b-4c5d-8e6f-7a8b9c0d1e2f';
  const TOP_CURSOR = 'p12_9f0e1c2d-3a4b-4c5d-8e6f-7a8b9c0d1e2f';

  it("saralashsiz so'rovda odatiy qiymat qo'yiladi", () => {
    const result = commentsQuerySchema.safeParse({});

    expect(result.success && result.data.sort).toBe(DEFAULT_COMMENT_SORT);
  });

  it('har bir tur qabul qilinadi', () => {
    for (const sort of COMMENT_SORTS) {
      expect(commentsQuerySchema.safeParse({ sort }).success).toBe(true);
    }
  });

  it("noma'lum tur RAD etiladi", () => {
    expect(commentsQuerySchema.safeParse({ sort: 'ESKI' }).success).toBe(false);
  });

  it('VAQT belgisi qabul qilinadi', () => {
    expect(commentsQuerySchema.safeParse({ cursor: DATE_CURSOR }).success).toBe(true);
  });

  it('MASHHUR belgisi ham qabul qilinadi', () => {
    /*
      "Mashhur" tartib yoqtirishlar bo'yicha sahifalanadi va uning
      belgisi boshqacha shaklda. Sxema uni tanimasa, ikkinchi
      sahifa umuman yuklanmasdi.
    */
    expect(commentsQuerySchema.safeParse({ cursor: TOP_CURSOR }).success).toBe(true);
  });

  it('buzuq belgi RAD etiladi', () => {
    expect(commentsQuerySchema.safeParse({ cursor: 'salom' }).success).toBe(false);
    expect(commentsQuerySchema.safeParse({ cursor: 'p12_qisqa' }).success).toBe(false);
    expect(commentsQuerySchema.safeParse({ cursor: 'pabc_9f0e1c2d-3a4b-4c5d-8e6f-7a8b9c0d1e2f' }).success).toBe(
      false,
    );
  });

  it("ro'yxat uzunligi chegaralangan", () => {
    expect(commentsQuerySchema.safeParse({ limit: 500 }).success).toBe(false);
    expect(commentsQuerySchema.safeParse({ limit: 50 }).success).toBe(true);
  });
});
