import { describe, expect, it } from 'vitest';

import { MAX_TOP_UP_SOM, MIN_TOP_UP_SOM } from '@/lib/money';
import {
  createIdempotencyKey,
  topUpSchema,
  transactionQuerySchema,
  transferSchema,
} from '@/modules/wallet/wallet.schemas';

const VALID_KEY = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('topUpSchema', () => {
  it("to'g'ri ma'lumotni qabul qiladi", () => {
    const result = topUpSchema.safeParse({
      amount: 50_000,
      method: 'CARD',
      idempotencyKey: VALID_KEY,
    });

    expect(result.success).toBe(true);
  });

  it('eng kam summadan pastini rad etadi', () => {
    const result = topUpSchema.safeParse({
      amount: MIN_TOP_UP_SOM - 1,
      method: 'CARD',
      idempotencyKey: VALID_KEY,
    });

    expect(result.success).toBe(false);
  });

  it("eng ko'p summadan yuqorisini rad etadi", () => {
    const result = topUpSchema.safeParse({
      amount: MAX_TOP_UP_SOM + 1,
      method: 'CARD',
      idempotencyKey: VALID_KEY,
    });

    expect(result.success).toBe(false);
  });

  it('manfiy summani rad etadi', () => {
    const result = topUpSchema.safeParse({
      amount: -50_000,
      method: 'CARD',
      idempotencyKey: VALID_KEY,
    });

    expect(result.success).toBe(false);
  });

  it('kasrli summani rad etadi', () => {
    const result = topUpSchema.safeParse({
      amount: 50_000.5,
      method: 'CARD',
      idempotencyKey: VALID_KEY,
    });

    expect(result.success).toBe(false);
  });

  it("noma'lum to'lov usulini rad etadi", () => {
    const result = topUpSchema.safeParse({
      amount: 50_000,
      method: 'BITCOIN',
      idempotencyKey: VALID_KEY,
    });

    expect(result.success).toBe(false);
  });

  it("idempotencyKey majburiy — takroriy to'lovdan himoya", () => {
    const result = topUpSchema.safeParse({ amount: 50_000, method: 'CARD' });

    expect(result.success).toBe(false);
  });

  it('kalitda begona belgilarni rad etadi', () => {
    const result = topUpSchema.safeParse({
      amount: 50_000,
      method: 'CARD',
      idempotencyKey: "'; DROP TABLE wallets; --",
    });

    expect(result.success).toBe(false);
  });
});

describe('transferSchema', () => {
  it("raqamni E.164 ko'rinishiga keltiradi", () => {
    const result = transferSchema.safeParse({
      phone: '90 123 45 67',
      amount: 10_000,
      idempotencyKey: VALID_KEY,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+998901234567');
    }
  });

  it("noto'g'ri raqamni rad etadi", () => {
    const result = transferSchema.safeParse({
      phone: '123',
      amount: 10_000,
      idempotencyKey: VALID_KEY,
    });

    expect(result.success).toBe(false);
  });

  it('juda uzun izohni rad etadi', () => {
    const result = transferSchema.safeParse({
      phone: '901234567',
      amount: 10_000,
      note: 'x'.repeat(141),
      idempotencyKey: VALID_KEY,
    });

    expect(result.success).toBe(false);
  });

  it("izoh ixtiyoriy — usiz ham o'tadi", () => {
    const result = transferSchema.safeParse({
      phone: '901234567',
      amount: 10_000,
      idempotencyKey: VALID_KEY,
    });

    expect(result.success).toBe(true);
  });
});

describe('transactionQuerySchema', () => {
  it("standart qiymatlarni qo'yadi", () => {
    const result = transactionQuerySchema.parse({});

    expect(result.page).toBe(1);
    expect(result.type).toBe('ALL');
    expect(result.order).toBe('desc');
  });

  it("turi bo'yicha filtrni qabul qiladi", () => {
    const result = transactionQuerySchema.parse({ type: 'TOP_UP' });
    expect(result.type).toBe('TOP_UP');
  });

  it("noma'lum turni rad etadi", () => {
    expect(() => transactionQuerySchema.parse({ type: 'HACK' })).toThrow();
  });
});

describe('createIdempotencyKey', () => {
  it('har safar boshqacha kalit beradi', () => {
    const keys = new Set(Array.from({ length: 50 }, () => createIdempotencyKey()));
    expect(keys.size).toBe(50);
  });

  it('sxema talablariga mos keladi', () => {
    const key = createIdempotencyKey();

    const result = topUpSchema.safeParse({ amount: 10_000, method: 'CARD', idempotencyKey: key });
    expect(result.success).toBe(true);
  });
});
