import { describe, expect, it } from 'vitest';

/** Uzilmas probel — `money.ts` shu belgi bilan guruhlaydi. */
const NBSP = '\u00a0';

import {
  formatAmountInput,
  formatTiyin,
  parseAmountInput,
  somToTiyin,
  tiyinToNumber,
  tiyinToSom,
} from '@/lib/money';

describe('somToTiyin', () => {
  it("so'mni tiyinga o'giradi", () => {
    expect(somToTiyin(1)).toBe(100n);
    expect(somToTiyin(125_000)).toBe(12_500_000n);
    expect(somToTiyin(0)).toBe(0n);
  });

  it('kasrli summani qabul qilmaydi', () => {
    expect(() => somToTiyin(10.5)).toThrow(TypeError);
  });

  it("juda katta summada ham aniqlikni yo'qotmaydi", () => {
    // 90 mlrd so'm — `Number` bilan hisoblanganda xato bo'lishi mumkin edi.
    expect(somToTiyin(90_000_000_000)).toBe(9_000_000_000_000n);
  });
});

describe('tiyinToSom', () => {
  it("tiyinni so'mga o'giradi", () => {
    expect(tiyinToSom(12_500_000n)).toBe(125_000);
    expect(tiyinToSom(0n)).toBe(0);
  });

  it('kasr qismini tashlab yuboradi', () => {
    expect(tiyinToSom(150n)).toBe(1);
  });
});

describe('tiyinToNumber', () => {
  it("BigInt'ni songa o'giradi", () => {
    expect(tiyinToNumber(12_500_000n)).toBe(12_500_000);
  });

  it('xavfsiz chegaradan oshsa xatolik beradi', () => {
    expect(() => tiyinToNumber(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow(RangeError);
  });
});

describe('formatTiyin', () => {
  /**
   * Natija HAR DOIM bir xil bo'lishi kerak: server va brauzer boshqacha
   * chiqarsa React "hydration mismatch" xatosini beradi. Shuning uchun
   * bu yerda aniq satr tekshiriladi, "taxminan to'g'ri" emas.
   */
  it("o'qishga qulay ko'rinish beradi", () => {
    expect(formatTiyin(12_500_000n)).toBe(`125${NBSP}000${NBSP}so'm`);
  });

  it("nol summani ham to'g'ri chiqaradi", () => {
    expect(formatTiyin(0n)).toBe(`0${NBSP}so'm`);
  });

  it('oddiy son (tiyin) bilan ham ishlaydi', () => {
    expect(formatTiyin(12_500_000)).toBe(`125${NBSP}000${NBSP}so'm`);
  });

  it("guruhlash chegaralarini to'g'ri qo'yadi", () => {
    expect(formatTiyin(100n)).toBe(`1${NBSP}so'm`);
    expect(formatTiyin(99_900n)).toBe(`999${NBSP}so'm`);
    expect(formatTiyin(100_000n)).toBe(`1${NBSP}000${NBSP}so'm`);
    expect(formatTiyin(100_000_000_000n)).toBe(`1${NBSP}000${NBSP}000${NBSP}000${NBSP}so'm`);
  });
});

describe('parseAmountInput', () => {
  it('probel va nuqtalarni tashlab yuboradi', () => {
    expect(parseAmountInput('50 000')).toBe(50_000);
    expect(parseAmountInput('50.000')).toBe(50_000);
    expect(parseAmountInput('1 234 567')).toBe(1_234_567);
  });

  it("bo'sh yoki harfli kiritishda null qaytaradi", () => {
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('abc')).toBeNull();
  });
});

describe('formatAmountInput', () => {
  it('guruhlab chiqaradi', () => {
    expect(formatAmountInput(50_000)).toBe(`50${NBSP}000`);
    expect(formatAmountInput(0)).toBe('0');
    expect(formatAmountInput(1_234_567)).toBe(`1${NBSP}234${NBSP}567`);
  });

  it("kiritish va o'qish teskari amal — birga ishlaydi", () => {
    expect(parseAmountInput(formatAmountInput(1_234_567))).toBe(1_234_567);
  });
});
