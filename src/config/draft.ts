/**
 * Post QORALAMASI — yagona sozlama.
 *
 * ── Muammo ────────────────────────────────────────────────────────────
 * Post yozish oynasi yopilganda hamma narsa yo'qolardi: matn, tanlangan
 * bo'lim, biriktirilgan mahsulotlar va hatto YUKLANGAN video.
 *
 * Oyna esa juda oson yopiladi:
 *   - telefonda "orqaga" ishorasi;
 *   - kimdir qo'ng'iroq qildi va ilova fonga o'tdi;
 *   - brauzer xotira yetmagani uchun varaqni tashladi;
 *   - odam tasodifan "X" ni bosdi.
 *
 * Uzun post yozgan bloger uchun bu — bir necha daqiqalik mehnat.
 * Ikkinchi marta u xuddi shunday yozmaydi: qisqartiradi yoki
 * umuman voz kechadi.
 *
 * ── Yechim ────────────────────────────────────────────────────────────
 * Yozilayotgan narsa telefon xotirasiga saqlanadi va oyna qayta
 * ochilganda tiklanadi.
 */

/**
 * Qoralama qancha yashaydi (kunlarda).
 *
 * ── Nima uchun muddat KERAK ───────────────────────────────────────────
 * Muddatsiz qoralama abadiy qoladi. Odam bir oy oldin boshlab
 * tashlab ketgan matn birdan qalqib chiqsa, u "bu qayerdan keldi?"
 * deb hayron bo'ladi va uni o'chirish uchun ortiqcha harakat
 * qiladi.
 *
 * Yetti kun — yozib, ertasiga davom ettirish uchun bemalol; unutilgan
 * matn esa o'zi yo'qoladi.
 */
export const DRAFT_TTL_DAYS = 7;

/**
 * Saqlash qancha kechiktiriladi (millisekund).
 *
 * ── Nima uchun kechiktirish kerak ─────────────────────────────────────
 * Har bosilgan harfda saqlansa, uzun matn yozayotganda sekundiga
 * o'nlab marta yozish bo'lardi. `localStorage` esa SINXRON ishlaydi:
 * u yozayotganda brauzer boshqa hech narsa qila olmaydi va yozish
 * sezilarli darajada sekinlashardi.
 *
 * Yarim soniya — odam bir so'zni yozib tugatadigan vaqt. Ya'ni
 * saqlash "pauza" paytlarida bo'ladi va yozishga xalaqit bermaydi.
 */
export const DRAFT_SAVE_DELAY_MS = 500;

/**
 * Kalit HAR ODAM uchun ALOHIDA.
 *
 * ── Nima uchun bu MUHIM ───────────────────────────────────────────────
 * Bitta telefonni ikki kishi ishlatishi mumkin (oila, do'kon).
 * Kalit umumiy bo'lsa, birinchi odamning yozayotgan matni
 * ikkinchisining oynasida ochilardi.
 *
 * Bu shunchaki noqulaylik emas — bu shaxsiy yozishmaning
 * oshkor bo'lishi.
 */
export function draftKey(userId: string): string {
  return `navix.draft.post.${userId}`;
}

/** Qoralama tiklanganda ko'rsatiladigan yozuv. */
export const DRAFT_RESTORED_LABEL = 'Saqlangan qoralama tiklandi';

/** Qoralamani o'chirish tugmasi. */
export const DRAFT_DISCARD_LABEL = 'Tozalash';
