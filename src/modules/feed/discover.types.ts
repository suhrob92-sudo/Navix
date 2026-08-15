import type { HashtagView, PostView } from '@/modules/feed/feed.types';
import type { UserSearchResult } from '@/modules/profile/social.types';

/**
 * Qidiruv turlari — "Barchasi" dan tashqari uchtasi aniq bir turni
 * so'raydi.
 */
export const SEARCH_SCOPES = ['ALL', 'VIDEO', 'CREATOR', 'HASHTAG'] as const;

/**
 * Qidiruv so'zining eng kam uzunligi.
 *
 * ── Nima uchun ikkita harf ────────────────────────────────────────────
 * Bitta harf bo'yicha qidirsak, deyarli hamma narsa mos kelardi:
 * natija ming qatorlik va foydasiz bo'lardi. Bu chegara brauzerda ham,
 * serverda ham bir xil ishlatiladi.
 */
export const MIN_SEARCH_LENGTH = 2;

export type SearchScope = (typeof SEARCH_SCOPES)[number];

/** Yorliqdagi yozuv — ekranda ko'rinadi. */
export const SEARCH_SCOPE_LABELS: Record<SearchScope, string> = {
  ALL: 'Barchasi',
  VIDEO: 'Videolar',
  CREATOR: 'Yaratuvchilar',
  HASHTAG: 'Xeshteglar',
};

/** Qidiruv natijasi — uchala turdan. */
export interface FeedSearchResult {
  hashtags: HashtagView[];
  creators: UserSearchResult[];
  videos: PostView[];
}

/**
 * Qidiruv sahifasining boshlang'ich holati.
 *
 * Turi qidiruv natijasi bilan BIR XIL: ekran ikkalasini bir xil
 * chizadi va "qidirildimi yoki yo'qmi" degan shart faqat sarlavhaga
 * ta'sir qiladi.
 */
export type DiscoverResult = FeedSearchResult;
