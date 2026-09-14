import bcrypt from 'bcryptjs';

import { logger } from '@/lib/logger';

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

  /*
    ── HAQIQIY XATO: buzuq hash SERVERNI YIQITARDI ────────────────────
    `bcrypt.compare` saqlangan hash noto'g'ri shaklda bo'lsa XATO
    TASHLAYDI ("Invalid salt version"). Bunday yozuv bazaga bir necha
    yo'l bilan tushishi mumkin: eski tizimdan ko'chirish, sinov
    ma'lumoti, qo'lda tahrirlangan qator.

    Natijasi ikki xil va ikkalasi ham yomon edi:

     1. Odam kirolmasdi va "Parol noto'g'ri" emas, "Serverda
        kutilmagan xatolik" degan javob olardi — ya'ni nima
        qilishni bilmasdi.

     2. Bu javob HUJUMCHIGA BELGI berardi. Oddiy hisobda 401,
        buzuq hashli hisobda 500 qaytardi — ya'ni javob kodiga
        qarab bunday hisoblarni ajratib olish mumkin edi.

    Endi buzuq hash "parol mos kelmadi" deb qaraladi: javob
    boshqalarnikiga to'liq o'xshaydi.
  */
  try {
    return await bcrypt.compare(plainPassword, hash);
  } catch (error) {
    /*
      Hash JURNALGA YOZILMAYDI — u parolning izi. Faqat xatoning
      o'zi yoziladi, chunki bunday yozuv bazada borligini
      administrator bilishi kerak.
    */
    logger.error({ err: error }, "Saqlangan parol hash'i buzuq — kirish rad etildi");

    // Vaqtni tenglashtiramiz: javob tezligi boshqa holatlar bilan bir xil bo'lsin.
    await bcrypt.compare(plainPassword, DUMMY_HASH);

    return false;
  }
}

/**
 * Oldindan hisoblangan hash — faqat vaqtni "tenglashtirish" uchun ishlatiladi.
 * Bu hash'ga mos keladigan parol hech kimga ma'lum emas va kerak ham emas.
 */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO3Zx3Xy5cVj0aZKQqZ8YQ0m5tGvJ4Wpe';
