import { describe, expect, it } from 'vitest';

import { cn, formatUZS, slugify, truncate } from '@/lib/utils';

describe('cn — class birlashtirish', () => {
  it("bir nechta class'ni birlashtiradi", () => {
    expect(cn('px-2', 'py-3')).toBe('px-2 py-3');
  });

  it("zid class'lardan oxirgisini qoldiradi", () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it("shartli qiymatlarni to'g'ri ishlaydi", () => {
    expect(cn('base', false && 'yashirin', undefined, 'oxiri')).toBe('base oxiri');
  });
});

describe('formatUZS — pul formati', () => {
  it("summani so'm bilan chiqaradi", () => {
    const result = formatUZS(25_000);

    expect(result).toContain('25');
    // Node turli versiyalarda "UZS" yoki "soʻm" chiqarishi mumkin —
    // apostrof belgisi ham har xil bo'lgani uchun ikkalasini ham qabul qilamiz.
    expect(result).toMatch(/UZS|so.?m/i);
  });

  it("kasr qismini ko'rsatmaydi", () => {
    expect(formatUZS(1500.75)).not.toContain('.75');
  });
});

describe('truncate — matnni qisqartirish', () => {
  it("qisqa matnni o'zgartirmaydi", () => {
    expect(truncate('Salom', 10)).toBe('Salom');
  });

  it('uzun matnni kesib "…" qo\'shadi', () => {
    const result = truncate("Bu juda uzun matn bo'lib, qisqartirilishi kerak", 15);

    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(15);
  });
});

describe('slugify — URL uchun matn', () => {
  it("bo'shliqlarni chiziqchaga aylantiradi", () => {
    expect(slugify('Toshkent shahri')).toBe('toshkent-shahri');
  });

  it('maxsus belgilarni olib tashlaydi', () => {
    expect(slugify('Pizza & Burger!')).toBe('pizza-burger');
  });

  it('boshi va oxiridagi chiziqchalarni olib tashlaydi', () => {
    expect(slugify('  --- Salom ---  ')).toBe('salom');
  });
});
