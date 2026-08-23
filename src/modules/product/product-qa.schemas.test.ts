import { describe, expect, it } from 'vitest';

import { ANSWER_MAX_LENGTH, QUESTION_MAX_LENGTH } from '@/config/product-detail';
import {
  answerQuestionSchema,
  askQuestionSchema,
  questionListQuerySchema,
} from '@/modules/product/product-qa.schemas';

/**
 * Savol-javob — validatsiya testlari.
 */

describe('savol', () => {
  it("to'g'ri savol qabul qilinadi", () => {
    expect(askQuestionSchema.safeParse({ body: 'Zaryadlagichi bormi?' }).success).toBe(true);
  });

  it('juda QISQA savol rad etiladi', () => {
    /**
     * "a" yoki "??" degan savol hech qanday ma'noga ega emas va u
     * faqat sahifani to'ldirardi.
     */
    expect(askQuestionSchema.safeParse({ body: 'a' }).success).toBe(false);
    expect(askQuestionSchema.safeParse({ body: '??' }).success).toBe(false);
  });

  it("BO'SH savol rad etiladi", () => {
    expect(askQuestionSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(askQuestionSchema.safeParse({}).success).toBe(false);
  });

  it('juda uzun savol rad etiladi', () => {
    expect(askQuestionSchema.safeParse({ body: 'a'.repeat(QUESTION_MAX_LENGTH + 1) }).success).toBe(
      false,
    );
  });

  it("bo'shliq kesiladi", () => {
    const result = askQuestionSchema.safeParse({ body: '  Rangi qanday?  ' });

    expect(result.success && result.data.body).toBe('Rangi qanday?');
  });
});

describe('javob', () => {
  it("to'g'ri javob qabul qilinadi", () => {
    expect(answerQuestionSchema.safeParse({ body: 'Ha, bor' }).success).toBe(true);
  });

  it("BO'SH javob rad etiladi", () => {
    expect(answerQuestionSchema.safeParse({ body: ' ' }).success).toBe(false);
  });

  it('juda uzun javob rad etiladi', () => {
    expect(
      answerQuestionSchema.safeParse({ body: 'a'.repeat(ANSWER_MAX_LENGTH + 1) }).success,
    ).toBe(false);
  });

  it("qisqa javob ('Ha') QABUL QILINADI", () => {
    /**
     * Savol chegarasi javobga tegishli emas: "Ha" — to'liq va
     * foydali javob.
     */
    expect(answerQuestionSchema.safeParse({ body: 'Ha' }).success).toBe(true);
  });
});

describe("ro'yxat so'rovi", () => {
  it("bo'sh so'rovda birinchi sahifa", () => {
    const result = questionListQuerySchema.safeParse({});

    expect(result.success && result.data.page).toBe(1);
  });

  it('matnli raqam songa aylanadi', () => {
    const result = questionListQuerySchema.safeParse({ page: '2', limit: '5' });

    expect(result.success && result.data.page).toBe(2);
    expect(result.success && result.data.limit).toBe(5);
  });

  it('juda katta chegara rad etiladi', () => {
    expect(questionListQuerySchema.safeParse({ limit: 5_000 }).success).toBe(false);
  });
});
