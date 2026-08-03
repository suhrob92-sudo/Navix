import { describe, expect, it } from 'vitest';

import {
  createPaymentSchema,
  createSavedAccountSchema,
  paymentHistoryQuerySchema,
  providerQuerySchema,
} from '@/modules/payment/payment.schemas';
import { SERVICE_PROVIDERS } from '@/config/service-providers';

const VALID_UUID = '3a9e5aad-e0ca-4098-b59f-9bb9ce83a625';
const VALID_KEY = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const validPayment = {
  providerId: VALID_UUID,
  accountNumber: '1234567890',
  amount: 50_000,
  idempotencyKey: VALID_KEY,
};

describe('createPaymentSchema', () => {
  it("to'g'ri ma'lumotni qabul qiladi", () => {
    const result = createPaymentSchema.safeParse(validPayment);

    expect(result.success).toBe(true);
    if (result.success) {
      // Belgilanmagan bo'lsa hisob saqlanmaydi.
      expect(result.data.saveAccount).toBe(false);
    }
  });

  it("noto'g'ri providerId ni rad etadi", () => {
    const result = createPaymentSchema.safeParse({ ...validPayment, providerId: 'hududgaz' });
    expect(result.success).toBe(false);
  });

  it('manfiy va nol summani rad etadi', () => {
    expect(createPaymentSchema.safeParse({ ...validPayment, amount: -1000 }).success).toBe(false);
    expect(createPaymentSchema.safeParse({ ...validPayment, amount: 0 }).success).toBe(false);
  });

  it('kasrli summani rad etadi', () => {
    expect(createPaymentSchema.safeParse({ ...validPayment, amount: 1000.5 }).success).toBe(false);
  });

  it('hisob raqamida begona belgilarni rad etadi', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayment,
      accountNumber: "123'; DROP TABLE service_payments; --",
    });

    expect(result.success).toBe(false);
  });

  it('idempotencyKey majburiy', () => {
    const { idempotencyKey: _omitted, ...withoutKey } = validPayment;
    expect(createPaymentSchema.safeParse(withoutKey).success).toBe(false);
  });

  it("hisobni saqlash uchun nom qo'shsa bo'ladi", () => {
    const result = createPaymentSchema.safeParse({
      ...validPayment,
      saveAccount: true,
      accountLabel: 'Uy gazi',
    });

    expect(result.success).toBe(true);
  });
});

describe('createSavedAccountSchema', () => {
  it("to'g'ri ma'lumotni qabul qiladi", () => {
    const result = createSavedAccountSchema.safeParse({
      providerId: VALID_UUID,
      accountNumber: '1234567890',
      label: 'Uy gazi',
    });

    expect(result.success).toBe(true);
  });

  it('juda qisqa nomni rad etadi', () => {
    const result = createSavedAccountSchema.safeParse({
      providerId: VALID_UUID,
      accountNumber: '1234567890',
      label: 'a',
    });

    expect(result.success).toBe(false);
  });
});

describe('providerQuerySchema', () => {
  it('standart holatda hammasini qaytaradi', () => {
    expect(providerQuerySchema.parse({}).category).toBe('ALL');
  });

  it("noma'lum toifani rad etadi", () => {
    expect(() => providerQuerySchema.parse({ category: 'CRYPTO' })).toThrow();
  });
});

describe('paymentHistoryQuerySchema', () => {
  it("standart qiymatlarni qo'yadi", () => {
    const result = paymentHistoryQuerySchema.parse({});

    expect(result.page).toBe(1);
    expect(result.status).toBe('ALL');
  });
});

describe('SERVICE_PROVIDERS (seed manbasi)', () => {
  it('kodlar takrorlanmaydi', () => {
    const codes = SERVICE_PROVIDERS.map((provider) => provider.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("chegaralar mantiqiy: eng kam < eng ko'p", () => {
    for (const provider of SERVICE_PROVIDERS) {
      expect(provider.minAmountSom).toBeGreaterThan(0);
      expect(provider.maxAmountSom).toBeGreaterThan(provider.minAmountSom);
    }
  });

  it('har bir naqsh haqiqiy regex va namunaga mos keladi', () => {
    for (const provider of SERVICE_PROVIDERS) {
      // Naqsh buzuq bo'lsa server to'lovni rad etadi — shuni oldindan ushlaymiz.
      const pattern = new RegExp(provider.accountRegex);

      expect(
        pattern.test(provider.accountHint),
        `${provider.code}: namuna "${provider.accountHint}" o'z naqshiga mos kelmadi`,
      ).toBe(true);
    }
  });

  it("naqsh noto'g'ri uzunlikdagi raqamni rad etadi", () => {
    const gas = SERVICE_PROVIDERS.find((provider) => provider.code === 'hududgaz');
    expect(gas).toBeDefined();

    const pattern = new RegExp(gas!.accountRegex);
    expect(pattern.test('123')).toBe(false);
    expect(pattern.test('12345678901234')).toBe(false);
    expect(pattern.test('1234567890')).toBe(true);
  });
});
