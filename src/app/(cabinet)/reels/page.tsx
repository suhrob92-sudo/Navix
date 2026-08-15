import { redirect } from 'next/navigation';

/**
 * Eski manzil — yangisiga yo'naltiradi.
 *
 * ── Nima uchun sahifa O'CHIRILMADI ────────────────────────────────────
 * `/reels` havolasi allaqachon ulashilgan bo'lishi mumkin: odam uni
 * Telegramga yuborgan yoki xatcho'pga qo'ygan bo'lsa, u "sahifa
 * topilmadi" ga tushardi.
 *
 * Yo'naltirish esa eski havolani ishlab turgan holda qoldiradi.
 */
export default function ReelsRedirectPage() {
  redirect('/feed/videos');
}
