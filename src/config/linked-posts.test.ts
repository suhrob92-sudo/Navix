import { describe, expect, it } from 'vitest';

import { ATTACHMENT_KINDS } from '@/config/attachments';
import {
  LINKED_POSTS_HINT,
  LINKED_POSTS_LIMIT,
  LINKED_POSTS_TITLE,
  linkedPostsPath,
} from '@/config/linked-posts';

/**
 * Zanjirning teskari tomoni — "shu narsa ko'rsatilgan videolar".
 *
 * Bu sozlama to'rtta ekotizim sahifasida ishlatiladi. Undagi
 * xatolik bo'limni jimgina yo'q qilardi: bo'sh bo'lim ham to'g'ri
 * holat bo'lgani uchun hech qanday xato ko'rinmasdi.
 */
describe('LINKED_POSTS_TITLE', () => {
  it("HAR BIR biriktirma turi uchun sarlavha bor", () => {
    /*
      Yangi tur qo'shilib, sarlavhasi unutilsa, sahifada sarlavha
      o'rnida `undefined` chiqardi.
    */
    for (const kind of ATTACHMENT_KINDS) {
      expect(LINKED_POSTS_TITLE[kind]).toBeTruthy();
    }
  });

  it('sarlavhalar bir-biridan farq qiladi', () => {
    /*
      Ikkita tur bir xil sarlavha olsa, xarita nusxa-joylashtirishda
      to'ldirilgani bilinadi — va nishon turi bilan yozuv mos
      kelmay qolgani ham.
    */
    const unique = new Set(ATTACHMENT_KINDS.map((kind) => LINKED_POSTS_TITLE[kind]));

    expect(unique.size).toBe(ATTACHMENT_KINDS.length);
  });

  it("sarlavhada 'video' so'zi bor", () => {
    // Bo'lim aynan videolar haqida — sarlavha buni aytishi kerak.
    for (const kind of ATTACHMENT_KINDS) {
      expect(LINKED_POSTS_TITLE[kind].toLowerCase()).toContain('video');
    }
  });
});

describe('LINKED_POSTS_HINT', () => {
  it('videolarni FOYDALANUVCHILAR joylaganini aytadi', () => {
    /*
      Bu eng muhim jumla: sahifa do'konniki, video esa boshqa
      odamniki. Aytilmasa, odam uni do'konning o'z reklamasi deb
      o'ylardi.
    */
    expect(LINKED_POSTS_HINT.toLowerCase()).toContain('foydalanuvchi');
  });
});

describe('LINKED_POSTS_LIMIT', () => {
  it('oqilona chegarada', () => {
    /*
      Nol bo'lsa bo'lim hech qachon ko'rinmasdi; juda katta bo'lsa
      mahsulot sahifasi lentaga aylanib qolardi.
    */
    expect(LINKED_POSTS_LIMIT).toBeGreaterThan(0);
    expect(LINKED_POSTS_LIMIT).toBeLessThanOrEqual(30);
  });
});

describe('linkedPostsPath', () => {
  it('tur va nishonni manzilga qo\'yadi', () => {
    expect(linkedPostsPath('PRODUCT', '9f0e8d7c-1234-4321-8888-000000000001')).toBe(
      '/api/v1/feed/linked?kind=PRODUCT&targetId=9f0e8d7c-1234-4321-8888-000000000001',
    );
  });

  it('nishonni himoyalab yozadi', () => {
    /*
      ID har doim UUID bo'ladi, lekin bu funksiya boshqa joydan
      ham chaqirilishi mumkin. Belgilar tozalanmasa, `&` bilan
      qo'shimcha parametr qo'shib yuborish mumkin bo'lardi.
    */
    expect(linkedPostsPath('HOTEL', 'a&b=c')).toBe(
      '/api/v1/feed/linked?kind=HOTEL&targetId=a%26b%3Dc',
    );
  });

  it('HAR BIR tur uchun manzil quriladi', () => {
    for (const kind of ATTACHMENT_KINDS) {
      expect(linkedPostsPath(kind, 'x')).toContain(`kind=${kind}`);
    }
  });
});
