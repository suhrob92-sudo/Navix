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
