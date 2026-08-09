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
