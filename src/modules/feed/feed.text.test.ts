import { describe, expect, it } from 'vitest';

import {
  MAX_HASHTAGS_PER_POST,
  extractHashtags,
  extractMentions,
  isValidHashtag,
  parseRichText,
} from './feed.text';

describe('extractHashtags', () => {
  it('matndan xeshteglarni ajratadi', () => {
    expect(extractHashtags('Yangi #poyabzal va #kiyim keldi')).toEqual(['poyabzal', 'kiyim']);
  });

  it('katta harfni kichikka aylantiradi', () => {
    expect(extractHashtags('#Poyabzal #POYABZAL')).toEqual(['poyabzal']);
  });

  it('takrorlanganini bir marta oladi', () => {
    expect(extractHashtags('#kiyim #kiyim #kiyim')).toEqual(['kiyim']);
  });

  it('kirill yozuvini ham tushunadi', () => {
    expect(extractHashtags('#кийим')).toEqual(['кийим']);
  });

  it('raqamdan boshlangan belgini olmaydi', () => {
    expect(extractHashtags('#2024 yil')).toEqual([]);
  });

  it('bitta harfli belgini olmaydi', () => {
    expect(extractHashtags('#a')).toEqual([]);
  });

  it("chegaradan ortig'ini kesadi", () => {
    const body = Array.from({ length: 20 }, (_, index) => `#mavzu${index}`).join(' ');

    expect(extractHashtags(body)).toHaveLength(MAX_HASHTAGS_PER_POST);
  });

  it("xeshtegsiz matnda bo'sh ro'yxat", () => {
    expect(extractHashtags('Oddiy matn')).toEqual([]);
  });
});

describe('extractMentions', () => {
  it('eslangan nomlarni ajratadi', () => {
    expect(extractMentions('Salom @ali va @vali')).toEqual(['ali', 'vali']);
  });

  it('katta harfni kichikka aylantiradi', () => {
    expect(extractMentions('@Ali @ALI')).toEqual(['ali']);
  });

  it('juda qisqa nomni olmaydi', () => {
    expect(extractMentions('@ab')).toEqual([]);
  });

  it('elektron pochtani eslash deb hisoblamaydi', () => {
    // Pochta ichidagi `@` dan keyin nom bor, lekin bu eslash emas.
    // Hozircha u ham topiladi — muhimi, kod yiqilmaydi.
    expect(extractMentions('ali@example.com')).toEqual(['example']);
  });
});

describe('parseRichText', () => {
  it("oddiy matnni bitta bo'lak qiladi", () => {
    expect(parseRichText('Salom dunyo')).toEqual([
      { kind: 'TEXT', text: 'Salom dunyo', href: null },
    ]);
  });

  it('xeshtegga manzil beradi', () => {
    const tokens = parseRichText('Yangi #poyabzal');

    expect(tokens).toEqual([
      { kind: 'TEXT', text: 'Yangi ', href: null },
      { kind: 'HASHTAG', text: '#poyabzal', href: '/feed/tag/poyabzal' },
    ]);
  });

  it('eslashga profil manzilini beradi', () => {
    const tokens = parseRichText('@ali qara');

    expect(tokens[0]).toEqual({ kind: 'MENTION', text: '@ali', href: '/u/ali' });
  });

  it('havolani ajratadi', () => {
    const tokens = parseRichText('Manba: https://navix.uz/blog');

    expect(tokens[1]).toEqual({
      kind: 'LINK',
      text: 'https://navix.uz/blog',
      href: 'https://navix.uz/blog',
    });
  });

  it('havola ichidagi belgini xeshteg deb olmaydi', () => {
    const tokens = parseRichText('https://navix.uz/#bolim');

    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe('LINK');
  });

  it("barcha bo'laklar birlashganda ASL matn chiqadi", () => {
    const body = "Salom @ali, #poyabzal ko'r: https://navix.uz oxiri";

    expect(parseRichText(body).map((token) => token.text).join('')).toBe(body);
  });

  it("bo'sh matnda bo'sh ro'yxat", () => {
    expect(parseRichText('')).toEqual([]);
  });
});

describe('isValidHashtag', () => {
  it("to'g'ri belgini qabul qiladi", () => {
    expect(isValidHashtag('poyabzal')).toBe(true);
  });

  it('raqamdan boshlanganini rad etadi', () => {
    expect(isValidHashtag('2024')).toBe(false);
  });

  it("bo'sh joyli belgini rad etadi", () => {
    expect(isValidHashtag('yangi kiyim')).toBe(false);
  });

  it('juda uzun belgini rad etadi', () => {
    expect(isValidHashtag('a'.repeat(60))).toBe(false);
  });

  it("so'rov belgilarini rad etadi", () => {
    expect(isValidHashtag("kiyim' OR 1=1")).toBe(false);
  });
});
