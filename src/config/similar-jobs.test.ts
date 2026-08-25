import { describe, expect, it } from 'vitest';

import {
  MAX_SIMILAR,
  SALARY_NEAR_PERCENT,
  SIMILARITY_WEIGHTS,
  midSalary,
  pickSimilar,
  similarityScore,
  type SimilarCandidate,
} from '@/config/similar-jobs';

/**
 * "O'xshash vakansiyalar" — testlar.
 *
 * Tasodifiy narsani "o'xshash" deb ko'rsatish ishonchni
 * yo'qotadigan eng oson yo'l, shuning uchun chegaralar alohida
 * tekshiriladi.
 */

const job = (over: Partial<SimilarCandidate> = {}): SimilarCandidate => ({
  id: 'a',
  categorySlug: 'it',
  city: 'Toshkent',
  experienceLevel: 'MIDDLE',
  employmentType: 'FULL_TIME',
  salaryMin: 800_000_000,
  salaryMax: 1_200_000_000,
  ...over,
});

describe("o'rtacha maosh", () => {
  it('ikki chegaraning o\'rtasi', () => {
    expect(midSalary({ salaryMin: 100, salaryMax: 300 })).toBe(200);
  });

  it('faqat pastki chegara bo\'lsa — o\'sha', () => {
    // "2 mln dan" degan e'londa bu yagona mavjud ma'lumot.
    expect(midSalary({ salaryMin: 100, salaryMax: null })).toBe(100);
  });

  it('faqat yuqori chegara bo\'lsa — o\'sha', () => {
    expect(midSalary({ salaryMin: null, salaryMax: 300 })).toBe(300);
  });

  it('"kelishilgan holda" — null', () => {
    expect(midSalary({ salaryMin: null, salaryMax: null })).toBeNull();
  });
});

describe('ball', () => {
  it('aynan bir xil vakansiya — eng yuqori ball', () => {
    const source = job();
    const total =
      SIMILARITY_WEIGHTS.category +
      SIMILARITY_WEIGHTS.city +
      SIMILARITY_WEIGHTS.experience +
      SIMILARITY_WEIGHTS.employment +
      SIMILARITY_WEIGHTS.salary;

    expect(similarityScore(source, job({ id: 'b' }))).toBe(total);
  });

  it('YO\'NALISH eng og\'ir', () => {
    // Kasb — eng muhim mezon, shahardan ham og'irroq.
    expect(SIMILARITY_WEIGHTS.category).toBeGreaterThan(SIMILARITY_WEIGHTS.city);
    expect(SIMILARITY_WEIGHTS.category).toBeGreaterThan(SIMILARITY_WEIGHTS.salary);
  });

  it("BALL yolg'iz o'zi yetarli EMAS", () => {
    /**
     * ── HAQIQIY XATO shu test bilan topildi ──────────────────────
     * Avval yo'nalish oddiy ball edi va "eng kam ball" sharti
     * qo'yilgandi. Lekin oshpaz vakansiyasi shahar (25) +
     * tajriba (15) + bandlik (10) + maosh (20) = 70 ball to'plab,
     * dasturchi ro'yxatiga tushib qolardi.
     *
     * Endi yo'nalish SHART: `pickSimilar` uni qat'iy tekshiradi.
     * Ball esa faqat tartiblaydi — bu test o'sha xato qaytib
     * kelmasligini kuzatadi.
     */
    const otherCategory = similarityScore(job(), job({ id: 'b', categorySlug: 'oshpaz' }));

    expect(otherCategory).toBeGreaterThan(0);
    expect(pickSimilar(job(), [job({ id: 'b', categorySlug: 'oshpaz' })], 5)).toEqual([]);
  });

  it('boshqa shahar ball KAMAYTIRADI', () => {
    const same = similarityScore(job(), job({ id: 'b' }));
    const other = similarityScore(job(), job({ id: 'b', city: 'Buxoro' }));

    expect(other).toBe(same - SIMILARITY_WEIGHTS.city);
  });

  it('yaqin maosh ball QO\'SHADI', () => {
    // 1 mln o'rtacha, 1.2 mln — 20% farq, chegaradan ichkarida.
    const near = similarityScore(job(), job({ id: 'b', salaryMin: 1_100_000_000, salaryMax: 1_300_000_000 }));

    expect(near).toBe(
      SIMILARITY_WEIGHTS.category +
        SIMILARITY_WEIGHTS.city +
        SIMILARITY_WEIGHTS.experience +
        SIMILARITY_WEIGHTS.employment +
        SIMILARITY_WEIGHTS.salary,
    );
  });

  it('uzoq maosh ball BERMAYDI', () => {
    const far = similarityScore(job(), job({ id: 'b', salaryMin: 200_000_000, salaryMax: 300_000_000 }));

    expect(far).toBe(
      SIMILARITY_WEIGHTS.category +
        SIMILARITY_WEIGHTS.city +
        SIMILARITY_WEIGHTS.experience +
        SIMILARITY_WEIGHTS.employment,
    );
  });

  it("chegaraning O'ZI yaqin hisoblanadi", () => {
    // 1 mln dan aynan 30% yuqori.
    const source = job({ salaryMin: 1_000_000_000, salaryMax: 1_000_000_000 });
    const edge = job({ id: 'b', salaryMin: 1_300_000_000, salaryMax: 1_300_000_000 });

    expect(SALARY_NEAR_PERCENT).toBe(30);

    /* Chegaradagi e'lon maosh ballini OLADI. */
    const atEdge = similarityScore(source, edge);
    const beyond = similarityScore(source, job({ id: 'c', salaryMin: 1_400_000_000, salaryMax: 1_400_000_000 }));

    expect(atEdge - beyond).toBe(SIMILARITY_WEIGHTS.salary);
  });

  it('maosh NOMA\'LUM bo\'lsa jazolanmaydi', () => {
    /**
     * O'zbekistonda e'lonlarning katta qismi "kelishilgan holda"
     * deb yoziladi. Ularni pastga tushirish ro'yxatni buzardi.
     */
    const unknown = similarityScore(job(), job({ id: 'b', salaryMin: null, salaryMax: null }));

    expect(unknown).toBe(
      SIMILARITY_WEIGHTS.category +
        SIMILARITY_WEIGHTS.city +
        SIMILARITY_WEIGHTS.experience +
        SIMILARITY_WEIGHTS.employment,
    );
  });
});

describe('tanlash', () => {
  it("o'zini ro'yxatga qo'shmaydi", () => {
    const source = job({ id: 'a' });

    expect(pickSimilar(source, [source, job({ id: 'b' })], 5).map((item) => item.id)).toEqual(['b']);
  });

  it("BOSHQA yo'nalish umuman tushmaydi", () => {
    /**
     * Tasodifiy narsani "o'xshash" deb ko'rsatish ishonchni
     * yo'qotardi. Yaxshisi bo'lim bo'sh qolsin.
     */
    const result = pickSimilar(job(), [job({ id: 'b', categorySlug: 'oshpaz' })], 5);

    expect(result).toEqual([]);
  });

  it("eng o'xshashi TEPADA", () => {
    const result = pickSimilar(
      job(),
      [
        job({ id: 'uzoq', city: 'Nukus', experienceLevel: 'NONE', employmentType: 'REMOTE' }),
        job({ id: 'yaqin' }),
      ],
      5,
    );

    expect(result[0].id).toBe('yaqin');
  });

  it('chegaradan oshmaydi', () => {
    const many = Array.from({ length: 10 }, (_, index) => job({ id: `x${index}` }));

    expect(pickSimilar(job({ id: 'source' }), many, 3)).toHaveLength(3);
  });

  it('teng ballda tartib BARQAROR', () => {
    /**
     * Aks holda sahifa har yangilanganda ro'yxat o'zgarib, odam
     * kechagi vakansiyani topa olmasdi.
     */
    const many = [job({ id: 'c' }), job({ id: 'a2' }), job({ id: 'b' })];
    const source = job({ id: 'source' });

    expect(pickSimilar(source, many, 3).map((item) => item.id)).toEqual(
      pickSimilar(source, [...many].reverse(), 3).map((item) => item.id),
    );
  });

  it("bo'sh ro'yxatda bo'sh javob", () => {
    expect(pickSimilar(job(), [], 5)).toEqual([]);
  });
});

describe('sozlama', () => {
  it("ko'rsatiladigan soni oz", () => {
    expect(MAX_SIMILAR).toBeLessThanOrEqual(6);
  });
});
