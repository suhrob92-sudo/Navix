import { describe, expect, it } from 'vitest';

import {
  MAX_SUGGESTED_HASHTAGS,
  SHORT_BODY_LENGTH,
  TOO_MANY_HASHTAGS,
  assistPost,
  reviewPost,
  suggestCategory,
  suggestHashtags,
} from '@/modules/feed/feed-assist';
import { POST_CATEGORY_VALUES } from '@/modules/feed/feed.types';

const EMPTY = { body: '', hasMedia: false, hasAttachments: false, hasCta: false };

describe('suggestCategory', () => {
  it('taom haqidagi postni tanidi', () => {
    expect(suggestCategory('Bugun uyda osh pishirdik, retsept oddiy')).toBe('RESTAURANTS');
  });

  it('ish elonini tanidi', () => {
    expect(suggestCategory('Vakansiya: frontend dasturchi kerak, maosh yaxshi')).toBe('JOBS');
  });

  it('sayohat postini tanidi', () => {
    expect(suggestCategory('Samarqandga sayohat qildik, mehmonxona zo\'r edi')).toBe('TRAVEL');
  });

  it("bo'sh matnda taxmin qilmaydi", () => {
    expect(suggestCategory('')).toBeNull();
    expect(suggestCategory('   ')).toBeNull();
  });

  it("mos so'z yo'q bo'lsa taxmin qilmaydi", () => {
    /*
      Noto'g'ri bo'lim postni butunlay boshqa filtrga tushirib
      yuboradi va muallif buni sezmaydi ham. Taxmin qilmagan
      ma'qul.
    */
    expect(suggestCategory('Bugun havo juda yaxshi, kayfiyat ham')).toBeNull();
  });

  it("qo'shimchali so'zni ham tanidi", () => {
    /*
      O'zbek tilida qo'shimchalar ko'p: "chegirmalar", "chegirmada".
      To'liq shakl qidirilsa, ularning aksariyati topilmasdi.
    */
    expect(suggestCategory('Katta chegirmalar boshlandi, arzon narxlar')).toBe('DISCOUNTS');
  });

  it("KO'P moslik yutadi", () => {
    /*
      "Restoranda ish bor" — bu ISH e'loni, restoran haqidagi post
      emas. Bitta so'z bo'yicha qaror qilinsa, u noto'g'ri bo'limga
      tushardi.
    */
    expect(suggestCategory('Restoranga xodim kerak: vakansiya, maosh kelishiladi, ish')).toBe(
      'JOBS',
    );
  });

  it('apostrof va katta harf halaqit bermaydi', () => {
    expect(suggestCategory("LAG'MON tayyorladik, taom zo'r")).toBe('RESTAURANTS');
  });
});

describe('suggestHashtags', () => {
  it("bo'lim mavzularini taklif qiladi", () => {
    const tags = suggestHashtags('Osh pishirdik', 'RESTAURANTS');

    expect(tags).toContain('taom');
    expect(tags.length).toBeLessThanOrEqual(MAX_SUGGESTED_HASHTAGS);
  });

  it("bo'limsiz ham umumiy mavzu beradi", () => {
    const tags = suggestHashtags('Salom', null);

    expect(tags.length).toBeGreaterThan(0);
  });

  it('matndagi mavzu QAYTA taklif qilinmaydi', () => {
    /*
      Odam allaqachon yozgan xeshtegni qayta taklif qilish uni
      chalg'itardi: u taklifni bosib, ikkinchi nusxasini qo'shib
      qo'yardi.
    */
    const tags = suggestHashtags('Osh pishirdik #taom #retsept', 'RESTAURANTS');

    expect(tags).not.toContain('taom');
    expect(tags).not.toContain('retsept');
  });

  it("takrorlanuvchi mavzu YO'Q", () => {
    const tags = suggestHashtags('Salom', 'TRAVEL');

    expect(new Set(tags).size).toBe(tags.length);
  });

  it('chegaradan oshmaydi', () => {
    for (const category of POST_CATEGORY_VALUES) {
      expect(suggestHashtags('Salom', category).length).toBeLessThanOrEqual(MAX_SUGGESTED_HASHTAGS);
    }
  });
});

describe('reviewPost', () => {
  const codes = (input: Parameters<typeof reviewPost>[0]) =>
    reviewPost(input).map((tip) => tip.code);

  it('juda qisqa matnga maslahat beradi', () => {
    expect(codes({ ...EMPTY, body: 'Zor' })).toContain('SHORT_BODY');
  });

  it('yetarli matnda qisqalik maslahati YO\'Q', () => {
    expect(codes({ ...EMPTY, body: 'a'.repeat(SHORT_BODY_LENGTH + 10) })).not.toContain(
      'SHORT_BODY',
    );
  });

  it('rasm bor, matn yo\'q — izoh so\'raydi', () => {
    expect(codes({ ...EMPTY, body: '', hasMedia: true })).toContain('NO_BODY');
  });

  it('mavzusiz postga maslahat beradi', () => {
    expect(codes({ ...EMPTY, body: 'Bugun ajoyib kun bo\'ldi, hammaga salom' })).toContain(
      'NO_HASHTAG',
    );
  });

  it("mavzu bo'lsa maslahat YO'Q", () => {
    expect(codes({ ...EMPTY, body: 'Bugun ajoyib kun bo\'ldi #kayfiyat' })).not.toContain(
      'NO_HASHTAG',
    );
  });

  it("juda KO'P mavzuga ogohlantirish beradi", () => {
    const many = Array.from({ length: TOO_MANY_HASHTAGS + 2 }, (_, i) => `#mavzu${i}`).join(' ');

    expect(codes({ ...EMPTY, body: `Post matni ${many}` })).toContain('TOO_MANY_HASHTAGS');
  });

  it('katta harfdagi UZUN matnga maslahat beradi', () => {
    expect(codes({ ...EMPTY, body: 'BUGUN KATTA CHEGIRMA BOSHLANDI TEZ KELING' })).toContain(
      'ALL_CAPS',
    );
  });

  it('QISQA katta harfli matn normal', () => {
    /*
      "YANGI!" kabi qisqa sarlavha to'liq katta harf bo'lishi
      butunlay normal — u qichqiriq emas, urg'u.
    */
    expect(codes({ ...EMPTY, body: 'YANGI!' })).not.toContain('ALL_CAPS');
  });

  it('biriktirma bor, chaqiruv yo\'q — eslatadi', () => {
    expect(
      codes({ ...EMPTY, body: 'Mana shu mahsulot juda yaxshi', hasAttachments: true }),
    ).toContain('NO_CTA');
  });

  it("chaqiruv bo'lsa eslatma YO'Q", () => {
    expect(
      codes({
        ...EMPTY,
        body: 'Mana shu mahsulot juda yaxshi',
        hasAttachments: true,
        hasCta: true,
      }),
    ).not.toContain('NO_CTA');
  });

  it("har bir maslahatda matn bor", () => {
    const tips = reviewPost({ ...EMPTY, body: 'Zor', hasAttachments: true });

    for (const tip of tips) {
      expect(tip.code.length, 'kodsiz maslahat').toBeGreaterThan(0);
      expect(tip.text.length, `${tip.code} matnsiz`).toBeGreaterThan(0);
    }
  });

  it("bo'sh maydonda maslahat ham YO'Q", () => {
    /*
      Kompozitor ochilishi bilan maslahatlar chiqsa, odam hali
      hech narsa yozmasdan turib "xato qildim" degan taassurot
      olardi.
    */
    expect(reviewPost(EMPTY)).toEqual([]);
  });
});

describe('assistPost', () => {
  it('hamma taklifni bir joyda qaytaradi', () => {
    const result = assistPost({ ...EMPTY, body: 'Osh pishirdik, retsept oddiy' });

    expect(result.category).toBe('RESTAURANTS');
    expect(result.categoryLabel).toBe('Restoranlar');
    expect(result.hashtags.length).toBeGreaterThan(0);
  });

  it("bo'lim topilmasa nomi ham bo'sh", () => {
    const result = assistPost({ ...EMPTY, body: 'Bugun havo yaxshi' });

    expect(result.category).toBeNull();
    expect(result.categoryLabel).toBeNull();
  });

  it("bo'sh postda ham yiqilmaydi", () => {
    const result = assistPost(EMPTY);

    expect(result.category).toBeNull();
    expect(result.tips).toEqual([]);
  });
});
