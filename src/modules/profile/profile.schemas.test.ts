import { describe, expect, it } from 'vitest';

import {
  changePasswordFormSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '@/modules/profile/profile.schemas';

describe('updateProfileSchema', () => {
  it('bitta maydonni yangilashga ruxsat beradi', () => {
    expect(updateProfileSchema.safeParse({ firstName: 'Ali' }).success).toBe(true);
  });

  it("bo'sh so'rovni rad etadi", () => {
    const result = updateProfileSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('kamida bitta maydon');
  });

  it("familiyani null bilan o'chirishga ruxsat beradi", () => {
    expect(updateProfileSchema.safeParse({ lastName: null }).success).toBe(true);
  });

  it("o'zbekcha va kirill harflarni qabul qiladi", () => {
    expect(updateProfileSchema.safeParse({ firstName: "G'ulomjon" }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ firstName: 'Шухрат' }).success).toBe(true);
  });

  it('ismdagi raqamni rad etadi', () => {
    expect(updateProfileSchema.safeParse({ firstName: 'Ali123' }).success).toBe(false);
  });

  describe("tug'ilgan sana", () => {
    it("to'g'ri sanani qabul qiladi", () => {
      expect(updateProfileSchema.safeParse({ dateOfBirth: '1995-06-15' }).success).toBe(true);
    });

    it('kelajakdagi sanani rad etadi', () => {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      expect(updateProfileSchema.safeParse({ dateOfBirth: nextYear.toISOString().slice(0, 10) }).success).toBe(
        false,
      );
    });

    it('120 yildan eski sanani rad etadi', () => {
      expect(updateProfileSchema.safeParse({ dateOfBirth: '1800-01-01' }).success).toBe(false);
    });

    it("noto'g'ri formatni rad etadi", () => {
      expect(updateProfileSchema.safeParse({ dateOfBirth: '15.06.1995' }).success).toBe(false);
    });

    it('null qiymatni qabul qiladi (sanani tozalash)', () => {
      expect(updateProfileSchema.safeParse({ dateOfBirth: null }).success).toBe(true);
    });
  });

  describe('vaqt zonasi', () => {
    it("ro'yxatdagi qiymatni qabul qiladi", () => {
      expect(updateProfileSchema.safeParse({ timezone: 'Asia/Tashkent' }).success).toBe(true);
    });

    it("ro'yxatda yo'q qiymatni rad etadi", () => {
      expect(updateProfileSchema.safeParse({ timezone: 'Europe/London' }).success).toBe(false);
    });
  });

  it("noto'g'ri rasm havolasini rad etadi", () => {
    expect(updateProfileSchema.safeParse({ avatarUrl: 'rasm.jpg' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ avatarUrl: 'https://cdn.navix.uz/a.jpg' }).success).toBe(true);
  });

  it("noma'lum tilni rad etadi", () => {
    expect(updateProfileSchema.safeParse({ language: 'FR' }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it("to'g'ri ma'lumotni qabul qiladi", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'eski1234', newPassword: 'yangi5678' }).success).toBe(
      true,
    );
  });

  it("yangi parol eskisiga teng bo'lsa rad etadi", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'parol1234',
      newPassword: 'parol1234',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('farq qilishi');
  });

  it('zaif yangi parolni rad etadi', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'eski1234', newPassword: '123' }).success).toBe(
      false,
    );
  });

  it("bo'sh joriy parolni rad etadi", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'yangi5678' }).success).toBe(false);
  });
});

describe('changePasswordFormSchema', () => {
  it('parollar mos kelsa qabul qiladi', () => {
    expect(
      changePasswordFormSchema.safeParse({
        currentPassword: 'eski1234',
        newPassword: 'yangi5678',
        newPasswordConfirm: 'yangi5678',
      }).success,
    ).toBe(true);
  });

  it("parollar mos kelmasa aniq maydonni ko'rsatadi", () => {
    const result = changePasswordFormSchema.safeParse({
      currentPassword: 'eski1234',
      newPassword: 'yangi5678',
      newPasswordConfirm: 'boshqa9999',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === 'newPasswordConfirm')).toBe(true);
  });
});

describe('profil tahrirlash — ijtimoiy maydonlar', () => {
  it("bo'sh bio va joylashuvni null ga aylantiradi", () => {
    // Foydalanuvchi maydonni tozalaganda brauzer '' yuboradi.
    const parsed = updateProfileSchema.parse({ bio: '   ', location: '' });

    expect(parsed.bio).toBeNull();
    expect(parsed.location).toBeNull();
  });

  it('bio uzunligini cheklaydi', () => {
    expect(updateProfileSchema.safeParse({ bio: 'a'.repeat(301) }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ bio: 'a'.repeat(300) }).success).toBe(true);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Protokolsiz havola `<a href>` ichida ilovaning O'Z manzili deb
   * qabul qilinardi va bosilganda hech qayerga olib bormasdi.
   */
  it('protokolsiz saytni rad etadi', () => {
    expect(updateProfileSchema.safeParse({ website: 'navix.uz' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ website: 'https://navix.uz' }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ website: 'http://navix.uz' }).success).toBe(true);
  });

  it("bo'sh saytni null ga aylantiradi", () => {
    expect(updateProfileSchema.parse({ website: '' }).website).toBeNull();
  });

  it("username qoidalarini qo'llaydi", () => {
    expect(updateProfileSchema.safeParse({ username: 'aziz_karimov' }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ username: 'Aziz.Karimov' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ username: 'admin' }).success).toBe(false);
  });

  it("noma'lum jins va maxfiylikni rad etadi", () => {
    expect(updateProfileSchema.safeParse({ gender: 'OTHER' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ messagePrivacy: 'FRIENDS' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ messagePrivacy: 'FOLLOWERS' }).success).toBe(true);
  });

  /**
   * Tasdiqlangan nishonni foydalanuvchi O'ZIGA bera olmasligi kerak —
   * uni faqat admin qo'yadi.
   */
  it('tasdiqlangan nishonni qabul qilmaydi', () => {
    expect(updateProfileSchema.parse({ isVerified: true, bio: 'salom' })).not.toHaveProperty('isVerified');
  });

  it('obunachilar sonini qabul qilmaydi', () => {
    expect(updateProfileSchema.parse({ followerCount: 999, bio: 'salom' })).not.toHaveProperty('followerCount');
  });
});
