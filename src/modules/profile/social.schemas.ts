import { z } from 'zod';

import { USERNAME_RULES, isReservedUsername } from '@/config/profile';

/**
 * Ommaviy profil uchun validatsiya.
 */

/**
 * Manzildagi `username`.
 *
 * Katta harf bilan kelsa kichikka o'giriladi: odam `/u/Aziz` deb yozsa
 * ham `/u/aziz` profili ochilishi kerak.
 */
export const usernameParamSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_RULES.minLength, 'Nom juda qisqa')
  .max(USERNAME_RULES.maxLength, 'Nom juda uzun')
  .regex(USERNAME_RULES.pattern, "Nom noto'g'ri");

/**
 * Foydalanuvchi TANLAYDIGAN nom.
 *
 * Manzildagidan farqi: bu yerda band nomlar ham rad etiladi. Manzilda
 * esa rad etilmasligi kerak — aks holda mavjud profilni ochib
 * bo'lmasdi.
 */
export const usernameSchema = usernameParamSchema
  .regex(USERNAME_RULES.pattern, "Nom harf bilan boshlanib, faqat harf, raqam va '_' dan iborat bo'lsin")
  .refine((value) => !isReservedUsername(value), 'Bu nom band');

export type UsernameParam = z.infer<typeof usernameParamSchema>;

/**
 * Odam qidirish so'rovi.
 *
 * ── Nima uchun `username` qoidalari QO'LLANMAYDI ──────────────────────
 * Qidiruvda odam ismini ham yozadi ("Aziz Karimov"), ya'ni bo'sh joy va
 * katta harf bo'lishi tabiiy. Qat'iy naqsh talab qilinsa, qidiruv
 * ishlamay qolardi.
 *
 * Uzunlik esa cheklanadi: cheksiz matn bilan bazani bekorga
 * charchatib bo'lardi.
 */
export const userSearchQuerySchema = z.object({
  q: z.string().trim().min(1, "Qidiruv so'zi bo'sh").max(60, "Qidiruv so'zi juda uzun"),
  limit: z.coerce.number().int().min(1).max(30).default(20),
});

export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;
