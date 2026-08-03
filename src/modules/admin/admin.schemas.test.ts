import { describe, expect, it } from 'vitest';

import {
  adminAuditQuerySchema,
  adminTransactionQuerySchema,
  adminUserQuerySchema,
  createProviderSchema,
  refundPaymentSchema,
  updateProviderSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '@/modules/admin/admin.schemas';

/** To'g'ri to'ldirilgan namuna — testlarda faqat kerakli maydon o'zgartiriladi. */
const validProvider = {
  code: 'test-gaz',
  name: 'Test Gaz',
  category: 'UTILITY',
  description: 'Sinov uchun',
  accountLabel: 'Shaxsiy hisob raqami',
  accountHint: '1234567890',
  accountRegex: '^\\d{10}$',
  minAmountSom: 1_000,
  maxAmountSom: 10_000_000,
  color: 'orange',
  sortOrder: 10,
  isActive: true,
};

describe('createProviderSchema', () => {
  it("to'g'ri ma'lumotni qabul qiladi", () => {
    const result = createProviderSchema.safeParse(validProvider);

    expect(result.success).toBe(true);
  });

  it.each([
    ['Hududgaz', 'katta harf'],
    ['hudud gaz', 'probel'],
    ['hudud_gaz', 'pastki chiziq'],
    ['gz', 'juda qisqa'],
  ])('kod "%s" rad etiladi (%s)', (code) => {
    expect(createProviderSchema.safeParse({ ...validProvider, code }).success).toBe(false);
  });

  /**
   * Chegara teskari bo'lsa provayder ishlamay qoladi: hech qanday
   * summa "min dan katta VA max dan kichik" shartiga mos kelmaydi.
   */
  it("eng kichik summa eng kattasidan katta bo'lsa rad etiladi", () => {
    const result = createProviderSchema.safeParse({
      ...validProvider,
      minAmountSom: 500_000,
      maxAmountSom: 1_000,
    });

    expect(result.success).toBe(false);
  });

  it('teng chegaralar qabul qilinadi (aniq summa)', () => {
    // Masalan aniq 50 000 so'mlik obuna.
    const result = createProviderSchema.safeParse({
      ...validProvider,
      minAmountSom: 50_000,
      maxAmountSom: 50_000,
    });

    expect(result.success).toBe(true);
  });

  it('xavfli naqsh sxema darajasida rad etiladi', () => {
    const result = createProviderSchema.safeParse({ ...validProvider, accountRegex: '^(\\d+)+$' });

    expect(result.success).toBe(false);
  });

  it('kasrli summa rad etiladi', () => {
    expect(createProviderSchema.safeParse({ ...validProvider, minAmountSom: 1_000.5 }).success).toBe(false);
  });

  it("noma'lum rang rad etiladi", () => {
    expect(createProviderSchema.safeParse({ ...validProvider, color: 'gold' }).success).toBe(false);
  });
});

describe('updateProviderSchema', () => {
  it('faqat bitta maydonni yuborish mumkin', () => {
    const result = updateProviderSchema.safeParse({ isActive: false });

    expect(result.success).toBe(true);
  });

  it("bo'sh obyekt ham qabul qilinadi", () => {
    expect(updateProviderSchema.safeParse({}).success).toBe(true);
  });

  /**
   * Kod o'zgartirilmasligi kerak: u seed uchun kalit. Sxemada bunday
   * maydon yo'q, shuning uchun yuborilgan qiymat natijaga TUSHMAYDI.
   */
  it("kod maydoni e'tiborga olinmaydi", () => {
    const result = updateProviderSchema.safeParse({ code: 'yangi-kod', name: 'Yangi nom' });

    expect(result.success).toBe(true);
    expect(result.success && 'code' in result.data).toBe(false);
  });

  it('tahrirlashda ham naqsh tekshiriladi', () => {
    expect(updateProviderSchema.safeParse({ accountRegex: '\\d+' }).success).toBe(false);
  });
});

describe('updateUserStatusSchema', () => {
  it.each(['ACTIVE', 'SUSPENDED', 'DEACTIVATED'])('"%s" holati qabul qilinadi', (status) => {
    expect(updateUserStatusSchema.safeParse({ status }).success).toBe(true);
  });

  /**
   * `PENDING_VERIFICATION` — tizim holati. Admin uni qo'lda qo'ysa,
   * foydalanuvchi telefonini qayta tasdiqlashga majbur bo'lardi.
   */
  it("PENDING_VERIFICATION qo'lda qo'yilmaydi", () => {
    expect(updateUserStatusSchema.safeParse({ status: 'PENDING_VERIFICATION' }).success).toBe(false);
  });

  it("sabab ixtiyoriy, lekin juda qisqa bo'lmasligi kerak", () => {
    expect(updateUserStatusSchema.safeParse({ status: 'SUSPENDED' }).success).toBe(true);
    expect(updateUserStatusSchema.safeParse({ status: 'SUSPENDED', reason: 'ha' }).success).toBe(false);
    expect(updateUserStatusSchema.safeParse({ status: 'SUSPENDED', reason: 'firibgarlik' }).success).toBe(true);
  });
});

describe("so'rov sxemalari", () => {
  it("foydalanuvchi so'rovi standart qiymatlarni beradi", () => {
    const result = adminUserQuerySchema.parse({});

    expect(result.page).toBe(1);
    expect(result.status).toBe('ALL');
  });

  it("sahifa o'lchami chegaralangan", () => {
    // Chegarasiz bo'lsa, bitta so'rov bilan butun bazani so'rash mumkin edi.
    expect(adminUserQuerySchema.safeParse({ pageSize: '1000' }).success).toBe(false);
  });

  it('tranzaksiya filtrlari tekshiriladi', () => {
    expect(adminTransactionQuerySchema.parse({}).type).toBe('ALL');
    expect(adminTransactionQuerySchema.safeParse({ type: 'HACK' }).success).toBe(false);
    expect(adminTransactionQuerySchema.safeParse({ direction: 'IN' }).success).toBe(true);
  });
});

describe('refundPaymentSchema', () => {
  /**
   * Sabab MAJBURIY: pulni qaytarish qaytarib bo'lmaydigan amal.
   * Nizo chiqqanda "nima uchun qaytarilgan?" degan savolga javob
   * bo'lmasa, jurnalning foydasi qolmaydi.
   */
  it('sababsiz qaytarish rad etiladi', () => {
    expect(refundPaymentSchema.safeParse({}).success).toBe(false);
    expect(refundPaymentSchema.safeParse({ reason: '' }).success).toBe(false);
    expect(refundPaymentSchema.safeParse({ reason: 'xato' }).success).toBe(false);
  });

  it('mazmunli sabab qabul qilinadi', () => {
    expect(refundPaymentSchema.safeParse({ reason: 'provayder qabul qilmadi' }).success).toBe(true);
  });

  it("bo'shliqlar olib tashlanadi", () => {
    const result = refundPaymentSchema.parse({ reason: "   ikki marta to'langan   " });

    expect(result.reason).toBe("ikki marta to'langan");
  });

  it('juda uzun sabab rad etiladi', () => {
    // Bazadagi ustun 255 belgi.
    expect(refundPaymentSchema.safeParse({ reason: 'a'.repeat(256) }).success).toBe(false);
  });
});

describe('updateUserRoleSchema', () => {
  it.each(['DRIVER', 'COURIER', 'MERCHANT', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN'])(
    '"%s" roli qabul qilinadi',
    (role) => {
      expect(updateUserRoleSchema.safeParse({ role, action: 'grant' }).success).toBe(true);
    },
  );

  /**
   * CUSTOMER — har bir foydalanuvchining asosiy roli. Uni olib tashlash
   * odamni o'z profiliga ham kira olmaydigan holga keltirardi.
   */
  it("CUSTOMER roli qo'lda boshqarilmaydi", () => {
    expect(updateUserRoleSchema.safeParse({ role: 'CUSTOMER', action: 'revoke' }).success).toBe(false);
  });

  it("noma'lum rol rad etiladi", () => {
    expect(updateUserRoleSchema.safeParse({ role: 'GOD', action: 'grant' }).success).toBe(false);
  });

  it("noma'lum amal rad etiladi", () => {
    expect(updateUserRoleSchema.safeParse({ role: 'ADMIN', action: 'delete' }).success).toBe(false);
  });
});

describe('adminAuditQuerySchema', () => {
  it('standart guruh — hammasi', () => {
    expect(adminAuditQuerySchema.parse({}).group).toBe('ALL');
  });

  it("noma'lum guruh rad etiladi", () => {
    expect(adminAuditQuerySchema.safeParse({ group: 'SECRET' }).success).toBe(false);
  });

  it("aniq amal bo'yicha filtrlash mumkin", () => {
    const result = adminAuditQuerySchema.parse({ action: 'payment.service.refunded' });

    expect(result.action).toBe('payment.service.refunded');
  });
});
