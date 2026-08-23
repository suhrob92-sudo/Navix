import { describe, expect, it } from 'vitest';

import { REVIEW_BODY_MAX_LENGTH, REVIEW_PAGE_SIZE } from '@/config/review';
import { reviewListQuerySchema, upsertReviewSchema } from '@/modules/review/review.schemas';

/**
 * Baho va sharh — validatsiya testlari.
 */

describe("baho qo'yish", () => {
  it("to'g'ri baho qabul qilinadi", () => {
    expect(upsertReviewSchema.safeParse({ rating: 5 }).success).toBe(true);
    expect(upsertReviewSchema.safeParse({ rating: 1, body: 'Yaxshi' }).success).toBe(true);
  });

  it('CHEGARADAN tashqari baho RAD ETILADI', () => {
    expect(upsertReviewSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(upsertReviewSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(upsertReviewSchema.safeParse({ rating: -3 }).success).toBe(false);
  });

  it("KASR baho RAD ETILADI", () => {
    /**
     * 4.5 baho qo'yish mumkin emas: yulduzlar butun sonlarda
     * bosiladi. Kasr kelsa, u brauzerdan emas, skriptdan kelgan.
     */
    expect(upsertReviewSchema.safeParse({ rating: 4.5 }).success).toBe(false);
  });

  it("baho MAJBURIY", () => {
    expect(upsertReviewSchema.safeParse({ body: 'Yaxshi' }).success).toBe(false);
  });

  it('matn IXTIYORIY', () => {
    const result = upsertReviewSchema.safeParse({ rating: 4 });

    expect(result.success).toBe(true);
    expect(result.success && result.data.body).toBeUndefined();
  });

  it("BO'SH matn `null` ga aylanadi", () => {
    /**
     * Aks holda bazada "bo'sh matn" va "matn yo'q" degan ikki xil
     * holat paydo bo'lardi va ro'yxatda bo'sh kartochka ko'rinardi.
     */
    const result = upsertReviewSchema.safeParse({ rating: 4, body: '   ' });

    expect(result.success && result.data.body).toBeNull();
  });

  it("matn atrofidagi bo'shliq kesiladi", () => {
    const result = upsertReviewSchema.safeParse({ rating: 4, body: '  Zo\'r  ' });

    expect(result.success && result.data.body).toBe("Zo'r");
  });

  it('juda uzun matn RAD ETILADI', () => {
    const result = upsertReviewSchema.safeParse({
      rating: 4,
      body: 'a'.repeat(REVIEW_BODY_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });

  it("chegaraning O'ZI qabul qilinadi", () => {
    const result = upsertReviewSchema.safeParse({
      rating: 4,
      body: 'a'.repeat(REVIEW_BODY_MAX_LENGTH),
    });

    expect(result.success).toBe(true);
  });
});

describe("ro'yxat so'rovi", () => {
  it("bo'sh so'rovda birinchi sahifa", () => {
    const result = reviewListQuerySchema.safeParse({});

    expect(result.success && result.data.page).toBe(1);
    expect(result.success && result.data.limit).toBe(REVIEW_PAGE_SIZE);
  });

  it('matnli raqam songa aylanadi', () => {
    // Manzildagi qiymat har doim MATN bo'ladi.
    const result = reviewListQuerySchema.safeParse({ page: '3', limit: '5' });

    expect(result.success && result.data.page).toBe(3);
    expect(result.success && result.data.limit).toBe(5);
  });

  it("nol yoki manfiy sahifa RAD ETILADI", () => {
    expect(reviewListQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(reviewListQuerySchema.safeParse({ page: -1 }).success).toBe(false);
  });

  it('juda katta chegara RAD ETILADI', () => {
    // Aks holda bitta so'rov bilan butun jadvalni tortib olish mumkin edi.
    expect(reviewListQuerySchema.safeParse({ limit: 5_000 }).success).toBe(false);
  });
});
