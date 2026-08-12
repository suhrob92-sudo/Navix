import { describe, expect, it } from 'vitest';

import { DELETE_ACCOUNT_CONFIRMATION, deleteAccountSchema } from '@/modules/profile/profile.schemas';
import { DELETED_USER_NAME, displayName } from '@/modules/profile/account.service';

describe('deleteAccountSchema', () => {
  it("to'g'ri so'rovni qabul qiladi", () => {
    const parsed = deleteAccountSchema.parse({ password: 'Parol123!', confirmation: 'TASDIQLAYMAN' });

    expect(parsed.password).toBe('Parol123!');
  });

  it('kichik harfda yozilsa ham qabul qilinadi', () => {
    // Telefon klaviaturasida bosh harfga o'tish qo'shimcha harakat.
    expect(deleteAccountSchema.safeParse({ password: 'x', confirmation: 'tasdiqlayman' }).success).toBe(true);
  });

  it("bo'shliqlar olib tashlanadi", () => {
    expect(deleteAccountSchema.safeParse({ password: 'x', confirmation: '  TASDIQLAYMAN  ' }).success).toBe(true);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Bu — qaytarib bo'lmaydigan amal. Ikkala to'siq ham bo'lishi
   * shart: parol shaxsni tasdiqlaydi, qo'lda yozilgan so'z esa
   * "men nima qilayotganimni bilaman" degani.
   */
  it('tasdiqlash so’zisiz rad etiladi', () => {
    expect(deleteAccountSchema.safeParse({ password: 'x', confirmation: '' }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ password: 'x', confirmation: 'ha' }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ password: 'x' }).success).toBe(false);
  });

  it('parolsiz rad etiladi', () => {
    expect(deleteAccountSchema.safeParse({ password: '', confirmation: 'TASDIQLAYMAN' }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ confirmation: 'TASDIQLAYMAN' }).success).toBe(false);
  });

  it("boshqa odamning ID sini qabul qilmaydi", () => {
    // Aks holda begona hisobni o'chirish yo'li ochiq bo'lardi.
    const parsed = deleteAccountSchema.parse({
      password: 'x',
      confirmation: DELETE_ACCOUNT_CONFIRMATION,
      userId: 'boshqa-odam',
    });

    expect(parsed).not.toHaveProperty('userId');
  });
});

describe('displayName', () => {
  it('oddiy foydalanuvchi ismi', () => {
    expect(displayName({ firstName: 'Aziz', lastName: 'Karimov' })).toBe('Aziz Karimov');
  });

  it('familiyasiz ham ishlaydi', () => {
    expect(displayName({ firstName: 'Aziz', lastName: null })).toBe('Aziz');
  });

  it("ismsiz foydalanuvchi uchun umumiy nom", () => {
    expect(displayName({ firstName: null, lastName: null })).toBe('Foydalanuvchi');
  });

  /**
   * Yopilgan hisobda ism bazada allaqachon almashtirilgan. Lekin bu
   * funksiya ikkinchi to'siq: eski yozuvda ism qolib ketgan bo'lsa
   * ham u ekranga chiqmasligi kerak.
   */
  it("yopilgan hisobning ISMI ko'rsatilmaydi", () => {
    expect(displayName({ firstName: 'Aziz', lastName: 'Karimov', deletedAt: new Date() })).toBe(
      DELETED_USER_NAME,
    );
  });
});
