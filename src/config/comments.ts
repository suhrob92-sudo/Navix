/**
 * Izohlar — YAGONA manba.
 *
 * ── Nima uchun alohida fayl ───────────────────────────────────────────
 * Saralash turlari uch joyda kerak: ekrandagi tugmalar, sxema
 * (kelgan qiymatni tekshiradi) va xizmat (so'rovni yasaydi).
 *
 * Har birida alohida yozilsa, yangi tur qo'shilganda bittasi eskicha
 * qolardi: tugma bosilardi, server esa uni tanimay rad etardi.
 */

/**
 * Izohlarni saralash turlari.
 *
 * ── Nima uchun ikkitasi yetarli ───────────────────────────────────────
 * "Eng yangi" — suhbat tartibi: odam oxirgi gapni ko'rmoqchi.
 * "Mashhur" — foydalilik tartibi: eng ko'p yoqtirilgan javob birinchi.
 *
 * Uchinchi tur ("eng eski") kerak emas: u faqat birinchi izohni
 * topish uchun ishlatilardi va bu deyarli hech kimga kerak emas.
 */
export const COMMENT_SORTS = ['NEW', 'TOP'] as const;

export type CommentSort = (typeof COMMENT_SORTS)[number];

export const COMMENT_SORT_LABELS: Record<CommentSort, string> = {
  NEW: 'Yangi',
  TOP: 'Mashhur',
};

/**
 * Odatiy saralash — YANGI.
 *
 * ── Nima uchun "mashhur" emas ─────────────────────────────────────────
 * Yangi postda hali hech kim izohga yoqtirish qo'ymagan: "mashhur"
 * tartib ham aynan vaqt tartibi bo'lardi, lekin odam buni bilmasdi.
 *
 * Bundan tashqari suhbat tabiiy ravishda vaqt bo'yicha o'qiladi:
 * javob undan oldingi gapga tegishli bo'ladi.
 */
export const DEFAULT_COMMENT_SORT: CommentSort = 'NEW';

/** Mahkamlangan izoh yonidagi yozuv. */
export const PINNED_COMMENT_LABEL = 'Mahkamlangan';

/**
 * Post muallifining izohi yonidagi yozuv.
 *
 * ── Nima uchun bu KERAK ───────────────────────────────────────────────
 * Izohlar orasida muallifning o'z javobi eng ishonchli ma'lumot:
 * "narxi qancha?" degan savolga u eng aniq javob beradi.
 *
 * Belgisiz u boshqa yuzta izoh orasida yo'qolib ketardi va odam
 * "muallif javob bermabdi" degan xulosaga kelardi.
 */
export const AUTHOR_COMMENT_LABEL = 'Muallif';
