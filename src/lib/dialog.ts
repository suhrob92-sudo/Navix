'use client';

import type { SyntheticEvent } from 'react';

/**
 * `<dialog>` ning "bekor qilish" hodisasi uchun xavfsiz ishlovchi.
 *
 * ── HAQIQIY XATO, foydalanuvchi topgan ────────────────────────────────
 * Post yozish oynasi ichida fayl tanlash maydoni bor. Odam "Video"
 * tugmasini bosib, telefon galereyasi ochilgach fikridan qaytsa va
 * "Bekor" (yoki "orqaga") bossa — BUTUN OYNA yopilib ketardi. Yozib
 * qo'yilgan matn ham, biriktirilgan rasm ham yo'qolardi.
 *
 * Sababi: `<input type="file">` bekor qilinganda `cancel` hodisasi
 * chiqaradi va u YUQORIGA KO'TARILADI (bubbles). React esa hodisalarni
 * bitta joyda tinglagani uchun, u `<dialog>` ning `onCancel` ishlovchisiga
 * borib tushardi — go'yo odam oynani yopmoqchi bo'lgandek.
 *
 * Yechim: hodisa AYNAN oynaning o'zidan kelganini tekshiramiz. Ichkaridan
 * ko'tarilgani e'tiborsiz qoldiriladi.
 *
 * Escape tugmasi esa avvalgidek ishlayveradi — u haqiqatan ham
 * `<dialog>` ning o'zida yuz beradi.
 */
export function dialogCancelHandler(close: () => void) {
  return (event: SyntheticEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return;

    close();
  };
}
