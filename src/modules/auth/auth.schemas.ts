import { z } from 'zod';

import { normalizeUzPhone } from '@/lib/phone';

/**
 * Autentifikatsiya uchun barcha kirish ma'lumotlari sxemalari.
 *
 * Bu sxemalar HAM serverda (API), HAM brauzerda (forma) ishlatiladi —
 * shuning uchun qoidalar bir joyda yoziladi va hech qachon ikkiga bo'linmaydi.
 */

/** Telefon raqami — kiritilgan qanday ko'rinishda bo'lsa ham E.164 ga aylantiriladi. */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Telefon raqamini kiriting')
  .transform((value, ctx) => {
    const normalized = normalizeUzPhone(value);

    if (!normalized) {
      ctx.addIssue({
        code: 'custom',
        message: "Telefon raqami noto'g'ri. Namuna: +998 90 123 45 67",
      });
      return z.NEVER;
    }

    return normalized;
  });

/**
 * Parol talablari.
 * Juda murakkab qoidalar qo'ymaymiz — foydalanuvchi parolni yozib qo'yishga
 * majbur bo'lmasligi kerak. Lekin harf va raqam aralashmasi majburiy.
 */
export const passwordSchema = z
  .string()
  .min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak")
  .max(72, 'Parol 72 ta belgidan oshmasligi kerak') // bcrypt cheklovi
  .refine((value) => /[a-zA-Z]/.test(value), "Parolda kamida bitta harf bo'lishi kerak")
  .refine((value) => /\d/.test(value), "Parolda kamida bitta raqam bo'lishi kerak");

/** SMS orqali keladigan 6 xonali tasdiqlash kodi. */
export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Kod 6 ta raqamdan iborat bo'lishi kerak");

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Kamida 2 ta belgi kiriting')
  .max(100, '100 ta belgidan oshmasligi kerak')
  .regex(/^[\p{L}\s'-]+$/u, "Faqat harflar, bo'shliq, apostrof va chiziqcha ishlatiladi");

/** POST /api/v1/auth/register */
export const registerSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/** POST /api/v1/auth/verify-otp */
export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

/** POST /api/v1/auth/resend-otp */
export const resendOtpSchema = z.object({
  phone: phoneSchema,
});

export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

/** POST /api/v1/auth/login */
export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Parolni kiriting'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** POST /api/v1/auth/password/forgot */
export const forgotPasswordSchema = z.object({
  phone: phoneSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** POST /api/v1/auth/password/reset */
export const resetPasswordSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  password: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Brauzerdagi forma uchun sxemalar.
 * Server sxemasidan farqi — parolni takrorlash maydoni bor.
 */
export const registerFormSchema = registerSchema
  .extend({
    passwordConfirm: z.string().min(1, 'Parolni takrorlang'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Parollar mos kelmadi',
    path: ['passwordConfirm'],
  });

export const resetPasswordFormSchema = resetPasswordSchema
  .extend({
    passwordConfirm: z.string().min(1, 'Parolni takrorlang'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Parollar mos kelmadi',
    path: ['passwordConfirm'],
  });
