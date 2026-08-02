import bcrypt from 'bcryptjs';

/**
 * Parollar bilan ishlash.
 *
 * Muhim qoida: ochiq parol HECH QACHON saqlanmaydi. Faqat uning "hash"i —
 * ya'ni orqaga qaytarib bo'lmaydigan matematik izi saqlanadi.
 * Baza o'g'irlansa ham parollarni tiklab bo'lmaydi.
 */

/**
 * Hash murakkabligi. Har +1 hisoblash vaqtini ikki barobar oshiradi.
 * 12 — 2026-yil uchun tavsiya etilgan muvozanat (~200-300 ms).
 */
const SALT_ROUNDS = 12;

/** Parolni hash'ga aylantiradi. */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Kiritilgan parol saqlangan hash'ga mos kelishini tekshiradi.
 *
 * `hash` bo'sh bo'lsa ham bcrypt chaqiriladi — bu "timing attack" ning
 * oldini oladi: hujumchi javob vaqtiga qarab foydalanuvchi bor-yo'qligini
 * bila olmaydi.
 */
export async function verifyPassword(plainPassword: string, hash: string | null): Promise<boolean> {
  if (!hash) {
    // Mavjud bo'lmagan foydalanuvchi uchun ham bir xil vaqt sarflaymiz.
    await bcrypt.compare(plainPassword, DUMMY_HASH);
    return false;
  }

  return bcrypt.compare(plainPassword, hash);
}

/**
 * Oldindan hisoblangan hash — faqat vaqtni "tenglashtirish" uchun ishlatiladi.
 * Bu hash'ga mos keladigan parol hech kimga ma'lum emas va kerak ham emas.
 */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO3Zx3Xy5cVj0aZKQqZ8YQ0m5tGvJ4Wpe';
