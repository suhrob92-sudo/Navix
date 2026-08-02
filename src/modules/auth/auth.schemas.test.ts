import { describe, expect, it } from 'vitest';

import {
  loginSchema,
  otpCodeSchema,
  passwordSchema,
  phoneSchema,
  registerFormSchema,
  registerSchema,
  verifyOtpSchema,
} from '@/modules/auth/auth.schemas';

describe('phoneSchema', () => {
  it("turli ko'rinishdagi raqamlarni bir formatga keltiradi", () => {
    expect(phoneSchema.parse('90 123 45 67')).toBe('+998901234567');
    expect(phoneSchema.parse('+998901234567')).toBe('+998901234567');
  });

  it("noto'g'ri raqamni rad etadi", () => {
    const result = phoneSchema.safeParse('12345');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("noto'g'ri");
  });

  it("bo'sh qiymatni rad etadi", () => {
    expect(phoneSchema.safeParse('').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it("to'g'ri parolni qabul qiladi", () => {
    expect(passwordSchema.safeParse('parol1234').success).toBe(true);
    expect(passwordSchema.safeParse('Navix2026!').success).toBe(true);
  });

  it('qisqa parolni rad etadi', () => {
    const result = passwordSchema.safeParse('abc12');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('8 ta belgi');
  });

  it('faqat raqamdan iborat parolni rad etadi', () => {
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
  });

  it('faqat harfdan iborat parolni rad etadi', () => {
    expect(passwordSchema.safeParse('parolparol').success).toBe(false);
  });

  it('bcrypt cheklovidan uzun parolni rad etadi', () => {
    expect(passwordSchema.safeParse(`${'a'.repeat(72)}1`).success).toBe(false);
  });
});

describe('otpCodeSchema', () => {
  it('6 xonali kodni qabul qiladi', () => {
    expect(otpCodeSchema.parse('123456')).toBe('123456');
    expect(otpCodeSchema.parse('000000')).toBe('000000');
  });

  it("noto'g'ri uzunlikdagi kodni rad etadi", () => {
    expect(otpCodeSchema.safeParse('12345').success).toBe(false);
    expect(otpCodeSchema.safeParse('1234567').success).toBe(false);
  });

  it('harf qatnashgan kodni rad etadi', () => {
    expect(otpCodeSchema.safeParse('12345a').success).toBe(false);
  });
});

describe('registerSchema', () => {
  const validInput = {
    phone: '901234567',
    password: 'parol1234',
    firstName: 'Ali',
    lastName: 'Valiyev',
  };

  it("to'g'ri ma'lumotni qabul qiladi va raqamni formatlaydi", () => {
    const result = registerSchema.parse(validInput);

    expect(result.phone).toBe('+998901234567');
    expect(result.firstName).toBe('Ali');
  });

  it('familiyasiz ham ishlaydi', () => {
    const { lastName: _lastName, ...withoutLastName } = validInput;

    expect(registerSchema.safeParse(withoutLastName).success).toBe(true);
  });

  it("o'zbekcha harflarni qabul qiladi", () => {
    expect(registerSchema.safeParse({ ...validInput, firstName: "G'ulomjon" }).success).toBe(true);
    expect(registerSchema.safeParse({ ...validInput, firstName: 'Шухрат' }).success).toBe(true);
  });

  it('ismdagi raqamni rad etadi', () => {
    expect(registerSchema.safeParse({ ...validInput, firstName: 'Ali123' }).success).toBe(false);
  });

  it('juda qisqa ismni rad etadi', () => {
    expect(registerSchema.safeParse({ ...validInput, firstName: 'A' }).success).toBe(false);
  });
});

describe('registerFormSchema — parolni takrorlash', () => {
  const base = {
    phone: '901234567',
    password: 'parol1234',
    firstName: 'Ali',
  };

  it('parollar mos kelsa qabul qiladi', () => {
    expect(registerFormSchema.safeParse({ ...base, passwordConfirm: 'parol1234' }).success).toBe(true);
  });

  it('parollar mos kelmasa aniq xabar beradi', () => {
    const result = registerFormSchema.safeParse({ ...base, passwordConfirm: 'boshqa1234' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Parollar mos kelmadi');
    expect(result.error?.issues[0]?.path).toEqual(['passwordConfirm']);
  });
});

describe('loginSchema', () => {
  it('parol uzunligini tekshirmaydi (eski parollar ham ishlashi kerak)', () => {
    expect(loginSchema.safeParse({ phone: '901234567', password: 'a' }).success).toBe(true);
  });

  it("bo'sh parolni rad etadi", () => {
    expect(loginSchema.safeParse({ phone: '901234567', password: '' }).success).toBe(false);
  });
});

describe('verifyOtpSchema', () => {
  it('raqam va kodni birga tekshiradi', () => {
    const result = verifyOtpSchema.parse({ phone: '90 123 45 67', code: '123456' });

    expect(result).toEqual({ phone: '+998901234567', code: '123456' });
  });
});
