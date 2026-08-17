import { POST_CTA_CONFIG, type PostCtaKindName } from '@/config/post-cta';

/**
 * Ijodkor profili — sozlamalar.
 *
 * ── Nima uchun tarmoq ta'riflari QAYTA yozilmaydi ─────────────────────
 * Telegram, Instagram va YouTube uchun nom, belgi va manzil yasovchi
 * allaqachon `src/config/post-cta.ts` da bor (10-bosqich).
 *
 * Ularni bu yerda qayta yozsak, ikkita haqiqat manbasi paydo bo'lardi:
 * ertaga manzil qolipi o'zgarganda videodagi tugma yangilanib,
 * profildagi havola eskicha qolardi.
 *
 * Shuning uchun bu fayl faqat "qaysilari profilga tegishli" degan
 * ro'yxatni beradi — qolganini o'sha manba hal qiladi.
 */

/**
 * Profilda ko'rsatiladigan tarmoqlar.
 *
 * Telefon va "obuna bo'lish" bu yerda YO'Q: telefon profilda ochiq
 * turishi kerak emas (u videoga qo'yiladigan ataylab qaror), obuna
 * esa profilning o'zida alohida tugma sifatida turadi.
 */
export const CREATOR_LINK_KINDS = ['TELEGRAM', 'INSTAGRAM', 'YOUTUBE'] as const;

export type CreatorLinkKind = (typeof CREATOR_LINK_KINDS)[number];

/** Profil maydonining nomi — bazadagi ustun bilan bir xil. */
export const CREATOR_LINK_FIELD: Record<CreatorLinkKind, 'telegramHandle' | 'instagramHandle' | 'youtubeHandle'> = {
  TELEGRAM: 'telegramHandle',
  INSTAGRAM: 'instagramHandle',
  YOUTUBE: 'youtubeHandle',
};

/** Ekrandagi ko'rinish — chaqiruv ta'rifidan olinadi. */
export function creatorLinkConfig(kind: CreatorLinkKind) {
  return POST_CTA_CONFIG[kind as PostCtaKindName];
}

/**
 * Bir vaqtda nechta post mahkamlanadi.
 *
 * ── Nima uchun uchta ──────────────────────────────────────────────────
 * Mahkamlashning maqsadi — "mana bularni birinchi ko'ring" deyish.
 * Chegarasiz bo'lsa, ijodkor hamma postini mahkamlab qo'yardi va
 * mahkamlash ma'nosini butunlay yo'qotardi.
 *
 * Uchta — telefon ekranida bir qatorga sig'adigan son.
 */
export const MAX_PINNED_POSTS = 3;

/** Hamkorlik izohining chegarasi — u bitta qatorda turadi. */
export const COLLAB_NOTE_MAX_LENGTH = 200;
