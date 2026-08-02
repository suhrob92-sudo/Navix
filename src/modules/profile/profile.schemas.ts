import { z } from 'zod';

import { passwordSchema } from '@/modules/auth/auth.schemas';

/** Profil ma'lumotlarini tahrirlash uchun validatsiya qoidalari. */

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Kamida 2 ta belgi kiriting')
  .max(100, '100 ta belgidan oshmasligi kerak')
  .regex(/^[\p{L}\s'-]+$/u, "Faqat harflar, bo'shliq, apostrof va chiziqcha ishlatiladi");

/** Foydalanuvchi tanlashi mumkin bo'lgan tillar. */
export const LANGUAGE_OPTIONS = [
  { value: 'UZ', label: "O'zbekcha" },
  { value: 'RU', label: 'Русский' },
  { value: 'EN', label: 'English' },
] as const;

/** Mavzu (tashqi ko'rinish) variantlari. */
export const THEME_OPTIONS = [
  { value: 'SYSTEM', label: 'Tizim sozlamasi' },
  { value: 'LIGHT', label: 'Och' },
  { value: 'DARK', label: "To'q" },
] as const;

/**
 * O'zbekistonda ishlatiladigan vaqt zonalari.
 * Ro'yxat qisqa — foydalanuvchini 400 ta variant bilan charchatmaymiz.
 */
export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Tashkent', label: 'Toshkent (UTC+5)' },
  { value: 'Asia/Samarkand', label: 'Samarqand (UTC+5)' },
  { value: 'Asia/Almaty', label: 'Almati (UTC+6)' },
  { value: 'Asia/Bishkek', label: 'Bishkek (UTC+6)' },
  { value: 'Asia/Dushanbe', label: 'Dushanbe (UTC+5)' },
  { value: 'Asia/Ashgabat', label: 'Ashxobod (UTC+5)' },
] as const;

/** PATCH /api/v1/profile */
export const updateProfileSchema = z
  .object({
    firstName: nameSchema.optional(),
    // `null` — familiyani o'chirish uchun.
    lastName: nameSchema.nullable().optional(),
    avatarUrl: z.string().url("Rasm manzili noto'g'ri").max(500).nullable().optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD ko'rinishida bo'lishi kerak")
      .nullable()
      .optional()
      .refine((value) => {
        if (!value) return true;

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return false;

        // Kelajakdagi sana va 120 yildan katta yosh mantiqsiz.
        const now = new Date();
        const oldest = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());

        return date <= now && date >= oldest;
      }, "Tug'ilgan sana noto'g'ri"),
    language: z.enum(['UZ', 'RU', 'EN']).optional(),
    theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
    timezone: z
      .string()
      .max(64)
      .refine(
        (value) => TIMEZONE_OPTIONS.some((option) => option.value === value),
        "Vaqt zonasi ro'yxatdan tanlanishi kerak",
      )
      .optional(),
    marketingOptIn: z.boolean().optional(),
  })
  // Bo'sh so'rov yuborilishining oldini olamiz — bu odatda dasturchi xatosi.
  .refine((data) => Object.keys(data).length > 0, "O'zgartirish uchun kamida bitta maydon yuboring");

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Parolni o'zgartirish uchun asosiy maydonlar.
 * Alohida obyekt sifatida saqlanadi, chunki `.refine()` chaqirilgandan keyin
 * sxemaga yangi maydon qo'shib bo'lmaydi.
 */
const changePasswordFields = z.object({
  currentPassword: z.string().min(1, 'Joriy parolni kiriting'),
  newPassword: passwordSchema,
});

/** Yangi parol eskisidan farq qilishi shart. */
const isDifferentPassword = (data: { currentPassword: string; newPassword: string }) =>
  data.currentPassword !== data.newPassword;

const differentPasswordError = {
  message: 'Yangi parol eskisidan farq qilishi kerak',
  path: ['newPassword'],
};

/** POST /api/v1/profile/password */
export const changePasswordSchema = changePasswordFields.refine(isDifferentPassword, differentPasswordError);

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Brauzerdagi forma — parolni takrorlash maydoni bilan. */
export const changePasswordFormSchema = changePasswordFields
  .extend({ newPasswordConfirm: z.string().min(1, 'Parolni takrorlang') })
  .refine(isDifferentPassword, differentPasswordError)
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'Parollar mos kelmadi',
    path: ['newPasswordConfirm'],
  });
