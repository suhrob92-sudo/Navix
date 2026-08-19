import { describe, expect, it } from 'vitest';

import {
  SPONSORED_BADGE_LABEL,
  SPONSORED_BADGE_TITLE,
  SPONSORED_TOGGLE_HINT,
  SPONSORED_TOGGLE_LABEL,
} from '@/config/disclosure';
import { createPostSchema, updatePostSchema } from '@/modules/feed/feed.schemas';

describe('reklama oshkorligi — matnlar', () => {
  it("hamma yozuv to'ldirilgan", () => {
    /*
      Bo'sh yozuv ekranda ko'rinmas nishon bo'lardi: u shaklan
      bor, amalda esa hech kimga ko'rinmasdi.
    */
    for (const text of [
      SPONSORED_BADGE_LABEL,
      SPONSORED_BADGE_TITLE,
      SPONSORED_TOGGLE_LABEL,
      SPONSORED_TOGGLE_HINT,
    ]) {
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  it("nishon yozuvi QISQA", () => {
    // U muallif nomi yonida turadi: uzun yozuv ismni ekrandan
    // surib yuborardi.
    expect(SPONSORED_BADGE_LABEL.length).toBeLessThanOrEqual(12);
  });

  it("tushuntirishda Navix pul olmasligi AYTILGAN", () => {
    /*
      Bloger belgini bosishdan qo'rqishi mumkin: "endi mendan foiz
      olisharmikan?" Javob darhol berilmasa, u belgilamay qo'ya
      qolardi va oshkoralik ishlamasdi.
    */
    expect(SPONSORED_TOGGLE_HINT.toLowerCase()).toContain('navix');
    expect(SPONSORED_TOGGLE_HINT.toLowerCase()).toContain('pul');
  });
});

describe('createPostSchema — reklama belgisi', () => {
  it("belgi berilmasa ODATDA o'chiq", () => {
    /*
      Eng muhim odatiy qiymat. Yoqiq bo'lsa, nishon deyarli har
      postda turib, ma'nosini yo'qotardi.
    */
    const result = createPostSchema.safeParse({ body: 'Oddiy post' });

    expect(result.success && result.data.isSponsored).toBe(false);
  });

  it('belgi yoqilishi mumkin', () => {
    const result = createPostSchema.safeParse({ body: 'Reklamali post', isSponsored: true });

    expect(result.success && result.data.isSponsored).toBe(true);
  });

  it('SATR sifatida yuborilgan qiymat RAD etiladi', () => {
    /*
      Majburlash ishlatilsa, "false" degan satr `true` bo'lib
      qolardi: post reklama emas deb yuborilib, nishon bilan
      chiqardi. Bu jimgina ishlaydigan xato — eng yomon turi.
    */
    expect(createPostSchema.safeParse({ body: 'a', isSponsored: 'false' }).success).toBe(false);
    expect(createPostSchema.safeParse({ body: 'a', isSponsored: 'true' }).success).toBe(false);
    expect(createPostSchema.safeParse({ body: 'a', isSponsored: 1 }).success).toBe(false);
  });
});

describe('updatePostSchema — reklama belgisi', () => {
  it("belgi berilmasa TEGILMAYDI", () => {
    /*
      `undefined` — "o'zgartirma". Agar u `false` ga aylanib
      qolsa, faqat matnni tuzatgan bloger belgisini bilmasdan
      o'chirib qo'yardi — ya'ni oshkoralik jimgina yo'qolardi.
    */
    const result = updatePostSchema.safeParse({ body: 'Tuzatilgan matn' });

    expect(result.success && result.data.isSponsored).toBeUndefined();
  });

  it('belgini KEYIN qo\'yish mumkin', () => {
    const result = updatePostSchema.safeParse({ body: 'Matn', isSponsored: true });

    expect(result.success && result.data.isSponsored).toBe(true);
  });

  it("belgini olib tashlash ham mumkin", () => {
    const result = updatePostSchema.safeParse({ body: 'Matn', isSponsored: false });

    expect(result.success && result.data.isSponsored).toBe(false);
  });
});
