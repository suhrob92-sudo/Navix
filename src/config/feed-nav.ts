import type { LucideIcon } from 'lucide-react';
import { BarChart3, Bookmark, Clapperboard, Hash, Image, Newspaper, Users, Video } from 'lucide-react';

/**
 * Feed bo'limining tuzilishi — YAGONA manba.
 *
 * ── Nima uchun bu fayl kerak bo'ldi ───────────────────────────────────
 * Feed bosqichma-bosqich o'sdi: avval postlar, keyin video, mavzular,
 * saqlanganlar, statistika, hikoyalar. Har biri o'z joyiga qo'yildi
 * va natijada bo'limlar ilova bo'ylab TARQALIB ketdi: biri lentaning
 * tepasida, biri profil menyusida, biri sotuvchi kabinetida.
 *
 * Foydalanuvchi esa Feed'ga kirganda uning HAMMA imkoniyatini bir
 * joyda ko'rishi kerak — qidirib yurmasligi kerak.
 *
 * Endi ro'yxat shu yerda turadi va uni menyu ham, sinov ham shu
 * yerdan o'qiydi.
 */

// ─────────────────────────────────────────────────────────────────────
// Kategoriyalar — Feed tepasidagi qator
// ─────────────────────────────────────────────────────────────────────

/**
 * Bazadagi kategoriya qiymatlari.
 *
 * ── Nima uchun bu yerda QAYTA yozilgan ──────────────────────────────
 * Prisma turini import qilsak, bu fayl SERVER kodiga bog'lanib
 * qolardi va uni brauzer paketiga qo'shib bo'lmasdi. Ro'yxat
 * qisqa, o'zgarishi kam — takrorlash arzonroq.
 *
 * Mos kelishini sinov tekshiradi.
 */
export type PostCategoryValue =
  | 'DISCOUNTS'
  | 'RESTAURANTS'
  | 'MARKETPLACE'
  | 'JOBS'
  | 'DELIVERY'
  | 'LISTINGS'
  | 'TRAVEL'
  | 'EDUCATION'
  | 'CREATORS';

/**
 * Lentani ko'rish USULLARI — bular kategoriya emas.
 *
 * `FOR_YOU` — hammasi, `FOLLOWING` — obunalarim, `NEARBY` — yaqin
 * atrofda. Ularni postga yozib bo'lmaydi, shuning uchun bazada ham
 * yo'q.
 */
export type FeedModeValue = 'FOR_YOU' | 'FOLLOWING' | 'NEARBY';

/** Qatordagi bitta doira: yo usul, yo kategoriya. */
export type FeedFilterValue = FeedModeValue | PostCategoryValue;

export interface FeedCategoryItem {
  value: FeedFilterValue;
  label: string;
  /** Belgisi — matnsiz ham tanib olinadi. */
  emoji: string;
  /** Bo'sh bo'lganda ko'rsatiladigan izoh. */
  emptyTitle: string;
  emptyDescription: string;
  /**
   * Hali tayyor emasmi.
   *
   * "Yaqin atrofda" joylashuvga tayanadi — u keyingi bosqichda
   * qo'shiladi. Doirani olib tashlash o'rniga uni ochiq qoldirib,
   * halol yozuv ko'rsatamiz.
   */
  isComingSoon?: boolean;
}

/**
 * Feed tepasidagi kategoriyalar — YAGONA manba.
 *
 * ── Nima uchun tartib AYNAN shunday ─────────────────────────────────
 * Birinchi uchtasi — kundalik ishlatiladigan usullar. Keyin savdoga
 * eng yaqin bo'limlar (chegirma, restoran, marketplace), so'ng
 * qolganlari. Odam eng ko'p bosadigan doira barmoq yetadigan joyda
 * turishi kerak.
 */
export const FEED_CATEGORIES: readonly FeedCategoryItem[] = [
  {
    value: 'FOR_YOU',
    label: 'Siz uchun',
    emoji: '🔥',
    emptyTitle: "Hali post yo'q",
    emptyDescription: "Birinchi bo'lib yozing — postingizni hamma ko'radi.",
  },
  {
    value: 'FOLLOWING',
    label: 'Obunalar',
    emoji: '👥',
    emptyTitle: "Lentangiz hozircha bo'sh",
    emptyDescription: "Odamlarga obuna bo'ling — ularning postlari shu yerda paydo bo'ladi.",
  },
  {
    value: 'NEARBY',
    label: 'Yaqin atrofda',
    emoji: '📍',
    isComingSoon: true,
    emptyTitle: 'Tez orada',
    emptyDescription:
      "Videoga joylashuv biriktirish ustida ishlanmoqda. Tayyor bo'lgach, shu yerda sizga eng yaqin videolar chiqadi.",
  },
  {
    value: 'DISCOUNTS',
    label: 'Chegirmalar',
    emoji: '🏷',
    emptyTitle: "Chegirma e'lonlari yo'q",
    emptyDescription: "Aksiyangizni video qilib joylang — bu bo'lim eng ko'p ochiladiganlardan.",
  },
  {
    value: 'RESTAURANTS',
    label: 'Restoranlar',
    emoji: '🍔',
    emptyTitle: "Restoran videosi yo'q",
    emptyDescription: "Taomingizni ko'rsating — tomoshabin bir bosishda buyurtma beradi.",
  },
  {
    value: 'MARKETPLACE',
    label: 'Marketplace',
    emoji: '🛍',
    emptyTitle: "Mahsulot videosi yo'q",
    emptyDescription: 'Mahsulotingizni videoda ko\'rsatib, unga tugma biriktiring.',
  },
  {
    value: 'JOBS',
    label: 'Ishlar',
    emoji: '💼',
    emptyTitle: "Vakansiya videosi yo'q",
    emptyDescription: "Ish o'rningizni videoda e'lon qiling — u matnli e'londan ko'ra ko'proq ko'riladi.",
  },
  {
    value: 'DELIVERY',
    label: 'Yetkazib berish',
    emoji: '🚚',
    emptyTitle: "Yetkazib berish videosi yo'q",
    emptyDescription: 'Xizmatingizni tanishtiring.',
  },
  {
    value: 'LISTINGS',
    label: "E'lonlar",
    emoji: '🏠',
    emptyTitle: "E'lon videosi yo'q",
    emptyDescription: "Uy, avto yoki boshqa e'loningizni videoda ko'rsating.",
  },
  {
    value: 'TRAVEL',
    label: 'Sayohat',
    emoji: '✈️',
    emptyTitle: "Sayohat videosi yo'q",
    emptyDescription: "Yo'nalish yoki mehmonxonani tanishtiring.",
  },
  {
    value: 'EDUCATION',
    label: "Ta'lim",
    emoji: '🎓',
    emptyTitle: "Ta'lim videosi yo'q",
    emptyDescription: 'Kurs yoki darsingizni tanishtiring.',
  },
  {
    value: 'CREATORS',
    label: 'Creatorlar',
    emoji: '🎬',
    emptyTitle: "Ijodkor videosi yo'q",
    emptyDescription: "Savdoga bog'liq bo'lmagan qiziqarli kontent shu yerda turadi.",
  },
] as const;

/** Muallif tanlay oladigan kategoriyalar (usullar bundan tashqarida). */
export const POST_CATEGORIES = FEED_CATEGORIES.filter(
  (item) => !isFeedMode(item.value),
) as readonly FeedCategoryItem[];

/** Bu qiymat lentani ko'rish usulimi (kategoriya emasmi)? */
export function isFeedMode(value: FeedFilterValue): value is FeedModeValue {
  return value === 'FOR_YOU' || value === 'FOLLOWING' || value === 'NEARBY';
}

/**
 * Tanlangan doira serverga qanday so'rov bo'lib ketadi.
 *
 * Usullar `tab` ga, kategoriyalar `category` ga tushadi — server
 * ikkalasini alohida tushunadi.
 */
export function feedQueryFor(value: FeedFilterValue): { tab: string; category?: string } {
  if (value === 'FOLLOWING') return { tab: 'FOLLOWING' };
  if (value === 'FOR_YOU' || value === 'NEARBY') return { tab: 'LATEST' };

  return { tab: 'LATEST', category: value };
}

/** Feed'ning asosiy bo'limlari — tepadagi yorliqlar. */
export type FeedTabValue = 'VIDEOS' | 'FOLLOWING' | 'LATEST';

export interface FeedTabItem {
  value: FeedTabValue;
  label: string;
  icon: LucideIcon;
  /** Bo'sh bo'lganda ko'rsatiladigan izoh. */
  emptyTitle: string;
  emptyDescription: string;
}

export const FEED_TABS: readonly FeedTabItem[] = [
  {
    value: 'VIDEOS',
    label: 'Videolar',
    icon: Clapperboard,
    emptyTitle: "Hali video yo'q",
    emptyDescription: "Birinchi bo'lib video joylang — uni hamma ko'radi.",
  },
  {
    value: 'FOLLOWING',
    label: 'Obunalarim',
    icon: Users,
    emptyTitle: "Lentangiz hozircha bo'sh",
    emptyDescription: "Odamlarga obuna bo'ling — ularning postlari shu yerda paydo bo'ladi.",
  },
  {
    value: 'LATEST',
    label: 'Yangi',
    icon: Newspaper,
    emptyTitle: "Hali post yo'q",
    emptyDescription: "Birinchi bo'lib yozing — postingizni hamma ko'radi.",
  },
] as const;

/** Yorliq serverdagi qaysi bo'limni so'raydi. */
export function feedQueryTab(tab: FeedTabValue): 'VIDEO' | 'FOLLOWING' | 'LATEST' {
  if (tab === 'VIDEOS') return 'VIDEO';

  return tab;
}

/** Feed menyusidagi bitta qator. */
export interface FeedFeatureItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Feed'ning BARCHA imkoniyatlari — menyuda ko'rinadi.
 *
 * Yorliqlar (Videolar, Obunalarim, Yangi) bu yerda YO'Q: ular
 * ekranning o'zida turadi va menyuda takrorlanishi ortiqcha
 * bo'lardi.
 */
export const FEED_FEATURES: readonly FeedFeatureItem[] = [
  {
    href: '/feed/videos',
    label: 'Video oqimi',
    description: "To'liq ekranda ketma-ket tomosha",
    icon: Video,
  },
  {
    href: '/feed/saved',
    label: 'Saqlanganlar',
    description: "Keyin ko'rish uchun belgilaganlaringiz",
    icon: Bookmark,
  },
  {
    href: '/feed/stats',
    label: 'Videolarim natijasi',
    description: "Ko'rishlar, bosishlar va savdo",
    icon: BarChart3,
  },
  {
    href: '/feed/tags',
    label: 'Mashhur mavzular',
    description: 'Xeshteglar bo\'yicha kashf qilish',
    icon: Hash,
  },
] as const;

/** Yangi narsa yaratish tanlovlari — "+" tugmasi ostida. */
export interface CreateChoice {
  id: 'POST' | 'VIDEO' | 'STORY';
  label: string;
  description: string;
  icon: LucideIcon;
}

export const CREATE_CHOICES: readonly CreateChoice[] = [
  {
    id: 'POST',
    label: 'Post',
    description: 'Matn va rasm — lentada qoladi',
    icon: Image,
  },
  {
    id: 'VIDEO',
    label: 'Video',
    description: '60 soniyagacha, mahsulot tugmasi bilan',
    icon: Clapperboard,
  },
  {
    id: 'STORY',
    label: 'Hikoya',
    description: '24 soatdan keyin yo\'qoladi',
    icon: Newspaper,
  },
] as const;
