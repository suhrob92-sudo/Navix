import type { PostAuthorView, TaggedProductView } from '@/modules/feed/feed.types';

/**
 * Hikoyalar — brauzer va server uchun umumiy turlar.
 */

/**
 * Hikoya qancha yashaydi (soat).
 *
 * ── Nima uchun 24 soat ────────────────────────────────────────────────
 * Bu son texnik emas, MA'NAVIY: hikoya "bugun nima bo'lyapti" degan
 * javob. Ertaga u eskiradi va uni ko'rgan odam eski xabarni yangi deb
 * o'ylab qolardi.
 *
 * Aynan shu qisqa muddat odamni har kuni qaytishga majbur qiladi —
 * Instagram'ning eng kuchli mexanizmi ham shu.
 */
export const STORY_LIFETIME_HOURS = 24;

/**
 * Bitta odam bir kunda joylashi mumkin bo'lgan eng ko'p hikoya.
 *
 * Chegarasiz bo'lsa, bitta odam halqani yuzta hikoya bilan to'ldirib,
 * boshqalarni ko'rinmas qilib qo'yardi.
 */
export const MAX_STORIES_PER_DAY = 20;

/**
 * Hikoya videosining eng uzun davomiyligi (soniya).
 *
 * ── Nima uchun Reels'dan QISQA ───────────────────────────────────────
 * Hikoya ketma-ket ko'riladi: odam beshta hikoyani birin-ketin
 * o'tkazadi. Ular ham 60 soniya bo'lsa, bitta odamning hikoyalari
 * besh daqiqa cho'zilardi va tomoshabin yarmida tashlab ketardi.
 */
export const MAX_STORY_SECONDS = 15;

/** Rasmli hikoya ekranda necha soniya turadi. */
export const STORY_IMAGE_SECONDS = 5;

export const STORY_CAPTION_MAX_LENGTH = 200;

/** Bitta hikoya. */
export interface StoryView {
  id: string;
  caption: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoPosterUrl: string | null;
  videoSeconds: number | null;
  /** Biriktirilgan mahsulot — bo'lmasligi mumkin. */
  product: TaggedProductView | null;
  createdAt: string;
  expiresAt: string;
  /** So'rov yuborgan odam buni allaqachon ko'rganmi. */
  isSeen: boolean;
  /** Hikoya so'rov yuborgan odamning O'ZINIKIMI. */
  isMine: boolean;
  /**
   * Necha kishi ko'rgan.
   *
   * FAQAT muallifga yuboriladi — begonaga doim `0` ketadi. Boshqa
   * odamning hikoyasini kim ko'rgani hech kimga tegishli emas.
   */
  viewCount: number;
}

/** Bitta muallifning hikoyalari — halqadagi bitta doira. */
export interface StoryGroupView {
  author: PostAuthorView;
  stories: StoryView[];
  /**
   * Hammasi ko'rilganmi.
   *
   * Halqa rangi shundan chiqadi: ko'rilmagani rangli, ko'rilgani
   * kulrang. Odam bir qarashda yangisi bor-yo'qligini biladi.
   */
  isAllSeen: boolean;
  /** Eng yangi hikoya vaqti — ro'yxat tartibi shu bo'yicha. */
  latestAt: string;
}

export interface StoryTrayResponse {
  groups: StoryGroupView[];
}

/** Hikoyani ko'rgan odam — muallifga ko'rinadigan ro'yxat. */
export interface StoryViewerRow {
  author: PostAuthorView;
  viewedAt: string;
}

export interface StoryViewersResponse {
  viewers: StoryViewerRow[];
  viewCount: number;
}

/**
 * Hikoya ekranda necha soniya turishi kerak.
 *
 * Video o'z davomiyligicha, rasm esa belgilangan vaqt. Usiz rasm
 * abadiy turib qolardi yoki video yarmida uzilardi.
 */
export function storyDurationSeconds(story: {
  videoSeconds: number | null;
  videoUrl: string | null;
}): number {
  if (story.videoUrl && story.videoSeconds && story.videoSeconds > 0) {
    return Math.min(story.videoSeconds, MAX_STORY_SECONDS);
  }

  return STORY_IMAGE_SECONDS;
}

/**
 * Muddati tugashiga qancha qolgani — odam tiliga o'girilgan.
 *
 * ── Nima uchun aniq daqiqa ko'rsatilmaydi ────────────────────────────
 * "3 soat 47 daqiqa qoldi" degan aniqlik hech kimga kerak emas va
 * u sanoq mashinasi taassurotini beradi. "3 soat qoldi" yetarli.
 */
export function remainingLabel(expiresAt: string, now: Date = new Date()): string {
  const left = new Date(expiresAt).getTime() - now.getTime();

  if (left <= 0) return 'Muddati tugadi';

  const hours = Math.floor(left / (60 * 60 * 1000));

  if (hours >= 1) return `${hours} soat qoldi`;

  const minutes = Math.max(1, Math.floor(left / (60 * 1000)));

  return `${minutes} daqiqa qoldi`;
}
