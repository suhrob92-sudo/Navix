import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bookmark,
  Clapperboard,
  Hash,
  Home,
  Image,
  Newspaper,
  Plus,
  Radio,
  Search,
  Settings,
  User,
  Video,
} from 'lucide-react';

import type { NavIcon } from '@/config/app-nav';
import { NEARBY_RADIUS_KM } from '@/config/geo';

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
// Feed modulining O'Z navigatsiyasi
// ─────────────────────────────────────────────────────────────────────

export interface FeedNavItem {
  /**
   * Manzil. `null` bo'lsa — bu tugma sahifa OCHMAYDI.
   *
   * "Yaratish" tugmasi shunday: u oyna ochadi. Uni sahifa qilsak,
   * odam post yozib bo'lgach "orqaga" bosishi kerak bo'lardi va
   * lentadagi joyi yo'qolardi.
   */
  href: string | null;
  label: string;
  icon: NavIcon;
  /** `true` — faqat aynan shu manzilda faol. */
  exact?: boolean;
  /** Markazdagi ko'tarilgan tugma. */
  isCreate?: boolean;
}

/**
 * Feed ichidagi pastki panel — YAGONA manba.
 *
 * ── Nima uchun Feed'ning O'Z navigatsiyasi bor ────────────────────────
 * Feed endi bitta sahifa emas: unda lenta, video oqimi, qidiruv,
 * yaratish va shaxsiy profil bor. Bularning hammasini ilovaning
 * umumiy pastki paneliga sig'dirib bo'lmaydi — u yerda atigi beshta
 * joy bor va ular butun ilova uchun.
 *
 * Shuning uchun Feed ochilganda pastki panel FEED'nikiga almashadi.
 * Xuddi telefonda ilova ochilgandek: ichkarida o'z menyusi ishlaydi.
 *
 * ── Odam qanday CHIQADI ───────────────────────────────────────────────
 * Har bir Feed sahifasining tepasida "orqaga" tugmasi bor va u
 * bosh sahifaga qaytaradi. Busiz odam Feed ichida qamalib qolardi —
 * bu eng katta xato bo'lardi.
 */
export const FEED_NAV: readonly FeedNavItem[] = [
  { href: '/feed', label: 'Asosiy', icon: Home, exact: true },
  { href: '/feed/videos', label: 'Video', icon: Video },
  { href: null, label: 'Yaratish', icon: Plus, isCreate: true },
  { href: '/feed/search', label: 'Qidirish', icon: Search },
  { href: '/feed/profile', label: 'Profil', icon: User },
] as const;

/** Feed panelidagi bo'lim joriy manzilga mos keladimi? */
export function isFeedNavActive(pathname: string, item: FeedNavItem): boolean {
  if (item.href === null) return false;
  if (item.exact) return pathname === item.href;

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Manzil Feed moduli ichidami?
 *
 * Ilovaning umumiy paneli shu javobga qarab yashiriladi: bir ekranda
 * ikkita pastki panel turishi mumkin emas.
 */
export function isInsideFeed(pathname: string): boolean {
  return pathname === '/feed' || pathname.startsWith('/feed/');
}

/**
 * Bu sahifada HECH QANDAY pastki panel ko'rinmasligi kerakmi?
 *
 * To'liq ekranli tomosha (`/feed/watch`) — yagona shunday sahifa.
 * Video butun ekranni egallaydi va panel uning ustiga tushib,
 * mahsulot tugmasi bilan yoqtirish tugmasini to'sib qo'yardi.
 * Chiqish uchun tepada alohida "orqaga" tugmasi bor.
 */
export function isFullScreenFeedPage(pathname: string): boolean {
  return pathname === '/feed/watch' || pathname.startsWith('/feed/watch/');
}

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
    emptyTitle: "Yaqin atrofda post yo'q",
    emptyDescription: `Sizdan ${NEARBY_RADIUS_KM} km oralig'ida hali hech kim joylashuvli post joylamagan. Birinchi bo'ling.`,
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
  /**
   * "Yaqin atrofda" ham oddiy lentani so'raydi.
   *
   * Farqi so'rovga QO'SHILADIGAN koordinatada: uni ekran qo'shadi,
   * chunki koordinata brauzerdan keladi va bu funksiya uni bilmaydi.
   */
  if (value === 'FOR_YOU' || value === 'NEARBY') return { tab: 'LATEST' };

  return { tab: 'LATEST', category: value };
}

// ─────────────────────────────────────────────────────────────────────
// Video sahifasining filtrlari
// ─────────────────────────────────────────────────────────────────────

export type VideoFilterValue = 'ALL' | 'SHORT' | 'LONG' | 'LIVE';

export interface VideoFilterItem {
  value: VideoFilterValue;
  label: string;
  emptyTitle: string;
  emptyDescription: string;
  /** Hali tayyor emasmi — chiziladi, lekin ro'yxat so'ralmaydi. */
  isComingSoon?: boolean;
}

/**
 * Video sahifasidagi filtrlar.
 *
 * ── Nima uchun "Uzun videolar" hozircha tayyor emas ───────────────────
 * Yuklashda chegara 60 soniya (`MAX_VIDEO_SECONDS`), ya'ni bazadagi
 * BARCHA video qisqa. Filtrni hozir yoqsak, u doim bo'sh chiqardi va
 * odam "ishlamayapti" deb o'ylardi.
 *
 * Filtr o'zi qoldirildi: uzun video yuklash qo'shilganda bayroqni
 * olib tashlash kifoya, serverdagi mantiq allaqachon tayyor.
 */
export const VIDEO_FILTERS: readonly VideoFilterItem[] = [
  {
    value: 'ALL',
    label: 'Barchasi',
    emptyTitle: "Hali video yo'q",
    emptyDescription: "Birinchi bo'lib video joylang — uni hamma ko'radi.",
  },
  {
    value: 'SHORT',
    label: 'Shorts',
    emptyTitle: "Qisqa video yo'q",
    emptyDescription: '60 soniyagacha bo\'lgan videolar shu yerda to\'planadi.',
  },
  {
    value: 'LONG',
    label: 'Uzun videolar',
    isComingSoon: true,
    emptyTitle: 'Tez orada',
    emptyDescription:
      "Hozircha video 60 soniyagacha yuklanadi. Uzun video qo'llab-quvvatlangach, ular shu yerda chiqadi.",
  },
  {
    value: 'LIVE',
    label: 'Jonli efir',
    isComingSoon: true,
    emptyTitle: 'Tez orada',
    emptyDescription: "Jonli efir ustida ishlanmoqda. Tayyor bo'lgach, efirlar shu yerda ko'rinadi.",
  },
] as const;

/** Filtr serverga qanday so'rov bo'lib ketadi. */
export function videoQueryFor(value: VideoFilterValue): string | null {
  if (value === 'ALL') return '/api/v1/feed?tab=VIDEO';
  if (value === 'SHORT') return '/api/v1/feed?tab=VIDEO&duration=SHORT';

  // Tayyor bo'lmagan filtrlar serverga UMUMAN bormaydi.
  return null;
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
    href: '/feed/watch',
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
  {
    href: '/feed/settings',
    label: 'Feed sozlamalari',
    description: 'Kontent, maxfiylik va bildirishnomalar',
    icon: Settings,
  },
] as const;

/** Yangi narsa yaratish tanlovlari — "+" tugmasi ostida. */
export interface CreateChoice {
  id: 'VIDEO' | 'POST' | 'STORY' | 'LIVE';
  label: string;
  description: string;
  icon: LucideIcon;
  /**
   * Hali tayyor emasmi.
   *
   * Jonli efir server tomonda alohida oqim uzatish xizmatini talab
   * qiladi. Uni ro'yxatdan olib tashlash o'rniga ochiq qoldiramiz —
   * odam nima kutayotganini bilib tursin.
   */
  isComingSoon?: boolean;
}

/**
 * Yaratish tanlovlari — "+" tugmasi ostida.
 *
 * Tartib ataylab video bilan boshlanadi: Feed'ning asosiy kontenti
 * video va odam eng ko'p shuni joylaydi.
 */
export const CREATE_CHOICES: readonly CreateChoice[] = [
  {
    id: 'VIDEO',
    label: 'Video yaratish',
    description: '60 soniyagacha, mahsulot tugmasi bilan',
    icon: Clapperboard,
  },
  {
    id: 'POST',
    label: 'Post yaratish',
    description: 'Rasm yoki matnli post',
    icon: Image,
  },
  {
    id: 'STORY',
    label: 'Hikoya yaratish',
    description: '24 soatlik hikoya',
    icon: Newspaper,
  },
  {
    id: 'LIVE',
    label: 'Jonli efir boshlash',
    description: 'Real vaqtda efir',
    icon: Radio,
    isComingSoon: true,
  },
] as const;
