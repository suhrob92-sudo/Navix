import type { PostCategoryName } from '@/modules/feed/feed.types';

/**
 * Feed sozlamalari — server va brauzer uchun umumiy turlar.
 */

/** Kimga ruxsat berilgan. */
export const AUDIENCE_SCOPES = ['EVERYONE', 'FOLLOWERS', 'NOBODY'] as const;

export type AudienceScopeName = (typeof AUDIENCE_SCOPES)[number];

/** Ekrandagi yozuvlar — savolga qarab boshqacha. */
export interface ScopeChoice {
  value: AudienceScopeName;
  label: string;
}

/**
 * Profil ko'rinishi tanlovlari.
 *
 * "Hech kim" — yopiq hisob: profilni faqat egasi ko'radi.
 */
export const PROFILE_SCOPES: readonly ScopeChoice[] = [
  { value: 'EVERYONE', label: 'Hamma' },
  { value: 'FOLLOWERS', label: 'Faqat obunachilarim' },
  { value: 'NOBODY', label: "Hech kim (yopiq hisob)" },
] as const;

export const COMMENT_SCOPES: readonly ScopeChoice[] = [
  { value: 'EVERYONE', label: 'Hamma' },
  { value: 'FOLLOWERS', label: 'Faqat obunachilarim' },
  { value: 'NOBODY', label: "Hech kim — izohlar yopiq" },
] as const;

export const FOLLOW_SCOPES: readonly ScopeChoice[] = [
  { value: 'EVERYONE', label: 'Hamma' },
  { value: 'FOLLOWERS', label: 'Faqat men obuna bo\'lganlar' },
  { value: 'NOBODY', label: "Hech kim" },
] as const;

/** Bildirishnoma kalitlari — ekranda ham, bazada ham bir xil nom. */
export const NOTIFY_KEYS = [
  'notifyLike',
  'notifyComment',
  'notifyFollow',
  'notifyMention',
  'notifyLive',
] as const;

export type NotifyKey = (typeof NOTIFY_KEYS)[number];

export interface NotifyItem {
  key: NotifyKey;
  label: string;
  description: string;
  /** Hali tayyor emasmi — o'chirilgan holda chiziladi. */
  isComingSoon?: boolean;
}

export const NOTIFY_ITEMS: readonly NotifyItem[] = [
  { key: 'notifyLike', label: 'Yoqtirishlar', description: 'Postingizni kimdir yoqtirsa' },
  { key: 'notifyComment', label: 'Izohlar', description: 'Postingizga izoh yozilsa' },
  { key: 'notifyFollow', label: 'Yangi obunachilar', description: 'Kimdir sizga obuna bo\'lsa' },
  { key: 'notifyMention', label: 'Eslatmalar', description: 'Sizni @nom bilan eslatishsa' },
  {
    key: 'notifyLive',
    label: 'Jonli efir',
    description: "Obuna bo'lganingiz efirga chiqsa",
    // Jonli efirning o'zi hali yo'q — sozlamasi oldindan tayyor turadi.
    isComingSoon: true,
  },
] as const;

/** Sozlamalarning to'liq holati — brauzerga shu ko'rinishda ketadi. */
export interface FeedSettingsView {
  interests: PostCategoryName[];
  notInterested: PostCategoryName[];
  sensitiveFilter: boolean;
  profileVisibility: AudienceScopeName;
  commentScope: AudienceScopeName;
  followScope: AudienceScopeName;
  notifyLike: boolean;
  notifyComment: boolean;
  notifyFollow: boolean;
  notifyMention: boolean;
  notifyLive: boolean;
  /**
   * Feed bilan tanishtirish tugaganmi.
   *
   * `null` — odam Feed'ni birinchi marta ochyapti va unga qiziqish
   * so'rovi bilan tanishtiruv ko'rsatiladi.
   */
  feedOnboardedAt: string | null;
  /** ISO sana yoki `null` — hech qachon tiklanmagan. */
  recommendationsResetAt: string | null;
}

/**
 * Standart holat.
 *
 * ── Nima uchun bu YAGONA manba ────────────────────────────────────────
 * Bazada ham `@default` qiymatlar bor. Lekin yozuv YO'Q bo'lgan odam
 * uchun javob shu yerdan yig'iladi — ikkalasi bir-biriga mos kelishi
 * shart, aks holda ekranda bir narsa, lentada boshqasi ishlardi.
 *
 * Mosligini sinov tekshiradi.
 */
export const DEFAULT_FEED_SETTINGS: FeedSettingsView = {
  interests: [],
  notInterested: [],
  sensitiveFilter: true,
  profileVisibility: 'EVERYONE',
  commentScope: 'EVERYONE',
  followScope: 'EVERYONE',
  notifyLike: true,
  notifyComment: true,
  notifyFollow: true,
  notifyMention: true,
  notifyLive: true,
  feedOnboardedAt: null,
  recommendationsResetAt: null,
};
