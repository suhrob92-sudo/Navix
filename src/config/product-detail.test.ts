import { describe, expect, it } from 'vitest';

import {
  ANSWER_MAX_LENGTH,
  ATTRIBUTE_NAME_MAX_LENGTH,
  ATTRIBUTE_VALUE_MAX_LENGTH,
  MAX_PRODUCT_ATTRIBUTES,
  MAX_QUESTIONS_PER_DAY,
  QUESTION_BLOCK_TEXT,
  QUESTION_MAX_LENGTH,
  QUESTIONS_PAGE_SIZE,
  VISIBLE_ATTRIBUTES,
  answerCountText,
  moreAttributesText,
} from '@/config/product-detail';

/**
 * Mahsulot sahifasi — sozlama testlari.
 */

describe('xususiyatlar chegarasi', () => {
  it("ko'rinadigan soni JAMIDAN kam", () => {
    /**
     * Teng bo'lsa "yana N ta" tugmasi hech qachon ko'rinmasdi va
     * chegaraning ma'nosi yo'qolardi.
     */
    expect(VISIBLE_ATTRIBUTES).toBeLessThan(MAX_PRODUCT_ATTRIBUTES);
    expect(VISIBLE_ATTRIBUTES).toBeGreaterThan(0);
  });

  it('nom qiymatdan QISQA', () => {
    // "Ekran" qisqa, "6.6 dyuym AMOLED, 120 Gts" uzun bo'ladi.
    expect(ATTRIBUTE_NAME_MAX_LENGTH).toBeLessThan(ATTRIBUTE_VALUE_MAX_LENGTH);
  });

  it("yashirilganlar soni AYTILADI", () => {
    /**
     * "Hammasini ko'rsatish" degan yozuvdan aniqroq: odam bosishga
     * arziydimi yo'qmi, darhol biladi.
     */
    expect(moreAttributesText(8)).toContain('8');
  });
});

describe('savol chegarasi', () => {
  it('kunlik chegara mantiqiy', () => {
    // Haqiqiy xaridor uchun juda ko'p, spam uchun foydasiz.
    expect(MAX_QUESTIONS_PER_DAY).toBeGreaterThan(2);
    expect(MAX_QUESTIONS_PER_DAY).toBeLessThanOrEqual(50);
  });

  it('savol javobdan QISQA', () => {
    /**
     * Savol qisqa bo'ladi ("zaryadlagichi bormi?"), javob esa
     * tushuntirish talab qilishi mumkin.
     */
    expect(QUESTION_MAX_LENGTH).toBeLessThan(ANSWER_MAX_LENGTH);
  });

  it('sahifa hajmi mantiqiy', () => {
    expect(QUESTIONS_PAGE_SIZE).toBeGreaterThan(0);
    expect(QUESTIONS_PAGE_SIZE).toBeLessThanOrEqual(50);
  });

  it('har bir sababning MATNI bor', () => {
    for (const text of Object.values(QUESTION_BLOCK_TEXT)) {
      expect(text.length).toBeGreaterThan(5);
    }
  });

  it('kunlik chegara matnida SON bor', () => {
    // Odam nechta savol berganini bilishi kerak.
    expect(QUESTION_BLOCK_TEXT.DAILY_LIMIT).toContain(String(MAX_QUESTIONS_PER_DAY));
  });
});

describe('javob soni matni', () => {
  it("javobsiz savol AYTILADI", () => {
    /**
     * "0 ta javob" degan yozuv sovuq: u savol e'tiborsiz qolgandek
     * ko'rsatardi. "Javob kutilmoqda" esa holatni aytadi.
     */
    expect(answerCountText(0)).toBe('Javob kutilmoqda');
  });

  it("ko'plik qo'shimchasisiz yoziladi", () => {
    expect(answerCountText(1)).toBe('1 ta javob');
    expect(answerCountText(5)).toBe('5 ta javob');
  });
});
