/**
 * Lenta — brauzer va server uchun umumiy turlar.
 */

/** Post muallifi — lentada ko'rinadigan eng kam ma'lumot. */
export interface PostAuthorView {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface PostView {
  id: string;
  /** O'chirilgan postda BO'SH bo'ladi. Rasm bo'lsa matnsiz ham bo'lishi mumkin. */
  body: string;
  /** Biriktirilgan rasm. O'chirilgan postda `null`. */
  imageUrl: string | null;
  author: PostAuthorView;
  createdAt: string;
  /**
   * Tahrirlangan payt — `null` bo'lsa post o'zgartirilmagan.
   *
   * Belgi KERAK: o'quvchi izoh yozgandan keyin matn o'zgarsa, uning
   * izohi ma'nosiz ko'rinib qolardi. "Tahrirlangan" yozuvi buni
   * ochiq qiladi.
   */
  editedAt: string | null;

  likeCount: number;
  commentCount: number;

  /** So'rov yuborgan odam bu postni yoqtirganmi. */
  isLiked: boolean;
  /** Post so'rov yuborgan odamning O'ZINIKIMI (o'chirish tugmasi uchun). */
  isMine: boolean;
  isDeleted: boolean;
}

export interface CommentView {
  id: string;
  body: string;
  author: PostAuthorView;
  createdAt: string;
  isMine: boolean;
}

/**
 * Lentaning bo'limlari.
 *
 * ── Nima uchun IKKITA ─────────────────────────────────────────────────
 * Faqat "Obunalar" bo'lsa, yangi kelgan odam bo'sh ekran ko'rardi va
 * kimga obuna bo'lishni bilmasdi. Faqat "Yangi" bo'lsa esa, obuna
 * bo'lishning ma'nosi qolmasdi.
 */
export type FeedTabName = 'FOLLOWING' | 'LATEST';

export const FEED_TABS = [
  { value: 'FOLLOWING', label: 'Obunalarim' },
  { value: 'LATEST', label: 'Yangi' },
] as const satisfies readonly { value: FeedTabName; label: string }[];

export interface FeedResponse {
  posts: PostView[];
  /**
   * Keyingi sahifa uchun belgi. `null` — oxiriga yetildi.
   *
   * ── Nima uchun sahifa RAQAMI emas ────────────────────────────────────
   * Lentaga doim yangi post qo'shiladi. Sahifa raqami bilan o'qilganda
   * yangi post kelishi bilan hamma narsa bir pog'ona pastga suriladi va
   * ikkinchi sahifada birinchi sahifaning oxirgi posti QAYTA ko'rinardi.
   *
   * Belgi (cursor) esa aniq joyni ko'rsatadi — u surilmaydi.
   */
  nextCursor: string | null;
}

export interface PostResponse {
  post: PostView;
}

export interface CommentsResponse {
  comments: CommentView[];
  nextCursor: string | null;
}

export interface LikeResponse {
  isLiked: boolean;
  likeCount: number;
}

/** Post matnining eng ko'p uzunligi — server va brauzerda bir xil. */
export const POST_MAX_LENGTH = 1_000;

/** Izohning eng ko'p uzunligi. */
export const COMMENT_MAX_LENGTH = 500;

/**
 * Muallifning ko'rinadigan nomi.
 *
 * Ism kiritilmagan bo'lishi mumkin — unda `@nom` ishlatiladi. Bo'sh
 * joy qoldirish mumkin emas: post kimniki ekani bilinmay qolardi.
 */
export function authorDisplayName(author: PostAuthorView): string {
  if (author.fullName) return author.fullName;

  return author.username ? `@${author.username}` : 'Foydalanuvchi';
}

/**
 * Yoqtirishlar soni.
 *
 * Nol bo'lsa BO'SH satr qaytariladi — tugma yonida "0" turishi
 * "hech kim yoqtirmadi" degan ma'noni ta'kidlab, yozgan odamni
 * xafa qiladi.
 */
export function formatReactionCount(count: number): string {
  if (count <= 0) return '';
  if (count < 1_000) return String(count);

  const thousands = Math.floor((count / 1_000) * 10) / 10;

  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
}

/**
 * O'chirilgan post o'rnida ko'rsatiladigan matn.
 *
 * ── Nima uchun post RO'YXATDAN olib tashlanmaydi ──────────────────────
 * Postga yozilgan izohlar qoladi. Post butunlay yo'qolsa, izohlar
 * havoda osilib qolardi: odam o'z izohini ko'radi, lekin nimaga
 * javob berganini bilmaydi.
 */
export const DELETED_POST_TEXT = "Bu post o'chirilgan.";

/**
 * Postda ko'rsatiladigan narsa bormi.
 *
 * Matn ham, rasm ham bo'lmasa — post yaratilmasligi kerak. Bu
 * tekshiruv brauzerda tugmani o'chirish uchun ishlatiladi; server
 * va baza ham xuddi shu qoidani mustaqil tekshiradi.
 */
export function hasPostContent(body: string, imageUrl: string | null): boolean {
  return body.trim().length > 0 || imageUrl !== null;
}
