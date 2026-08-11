import { z } from 'zod';

/**
 * Manzildagi ID uchun tekshiruv.
 *
 * ── Nima uchun bu KERAK ───────────────────────────────────────────────
 * Bazadagi ID'lar UUID turida. Manzilga boshqa narsa yozilsa
 * (`/api/v1/posts/salom`), so'rov to'g'ridan-to'g'ri bazaga ketardi va
 * Postgres "invalid input syntax for type uuid" deb XATO tashlardi.
 *
 * Natijasi: foydalanuvchi 500 ("serverda kutilmagan xatolik") ko'radi,
 * xatolar jurnali esa shunday so'rovlar bilan to'lib ketadi —
 * holbuki bu oddiy "topilmadi" holati.
 *
 * Bu xato aynan shu bosqichda, yangi qurilgan xatolar jurnali orqali
 * topildi.
 */
export const uuidParamSchema = z.string().uuid("Noto'g'ri manzil");

/**
 * ID'ni tekshiradi va qaytaradi.
 *
 * Yaroqsiz bo'lsa `ZodError` tashlaydi — uni `withApiHandler` tutib,
 * tushunarli javob qaytaradi.
 */
export function parseIdParam(value: string): string {
  return uuidParamSchema.parse(value);
}
