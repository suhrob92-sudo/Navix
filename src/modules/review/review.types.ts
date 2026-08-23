import type { ReviewBlockReason } from '@/config/review';

/**
 * Baho va sharh — brauzer va server uchun umumiy turlar.
 *
 * Xizmat fayli Prisma'ga bog'liq va uni brauzer kodiga qo'shib
 * bo'lmaydi, shuning uchun turlar bazadan MUSTAQIL faylda turadi.
 */

/** Bitta sharh. */
export interface ReviewView {
  id: string;
  rating: number;
  body: string | null;
  /** ISO sana — ekranda `formatUzDate` bilan chiziladi. */
  createdAt: string;
  author: {
    id: string;
    /** Ism va familiyaning bosh harfi: "Aziz Y.". */
    name: string;
    avatarUrl: string | null;
  };
  /** Bu sharh so'rov yuborgan odamnikimi. */
  isMine: boolean;
}

/**
 * Bahoning umumiy ko'rinishi.
 *
 * ── Nima uchun TAQSIMOT ham qaytadi ───────────────────────────────────
 * Faqat o'rtacha son yetarli emas: 3.0 baho "hamma o'rtacha dedi"
 * degani ham, "yarmi 5, yarmi 1 dedi" degani ham bo'lishi mumkin.
 *
 * Bu ikkalasi butunlay boshqa narsa va xaridor buni ko'rishi kerak.
 */
export interface ReviewSummaryView {
  average: number;
  total: number;
  /** 1 dan 5 gacha har bir bahoning soni. */
  distribution: Record<number, number>;
}

/** Baho qo'yish huquqi. */
export interface ReviewEligibility {
  canReview: boolean;
  /** Ruxsat yo'q bo'lsa — sababi. */
  reason: ReviewBlockReason | null;
}

/** GET javobi. */
export interface ReviewsResponse {
  summary: ReviewSummaryView;
  reviews: ReviewView[];
  /** Yana sharh bormi. */
  hasMore: boolean;
  /** So'rov yuborgan odamning o'z sharhi (bo'lsa). */
  mine: ReviewView | null;
  eligibility: ReviewEligibility;
}

/** POST va DELETE javobi. */
export interface ReviewMutationResponse {
  summary: ReviewSummaryView;
  mine: ReviewView | null;
}

/** Bo'sh taqsimot — 1 dan 5 gacha nollar. */
export function emptyDistribution(): Record<number, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

/**
 * Ismni qisqartiradi: "Aziz Yusupov" -> "Aziz Y.".
 *
 * ── Nima uchun familiya TO'LIQ ko'rsatilmaydi ─────────────────────────
 * Sharh ochiq sahifada turadi va uni istalgan odam o'qiy oladi.
 * To'liq ism-familiya esa odamni topish uchun yetarli ma'lumot:
 * "falon do'kondan falon narsa sotib olgan falon Familiya".
 *
 * Bosh harf esa sharhlarni bir-biridan ajratishga yetadi.
 */
export function shortAuthorName(firstName: string | null, lastName: string | null): string {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();

  /**
   * Ismi ham yo'q bo'lsa — "Xaridor".
   *
   * Ism ixtiyoriy maydon: telefon orqali ro'yxatdan o'tgan odam uni
   * to'ldirmasligi mumkin. Bo'sh qoldirilsa sharh muallifsiz
   * ko'rinardi.
   */
  if (first.length === 0) return last.length === 0 ? 'Xaridor' : `${last.charAt(0).toUpperCase()}.`;

  if (last.length === 0) return first;

  return `${first} ${last.charAt(0).toUpperCase()}.`;
}
