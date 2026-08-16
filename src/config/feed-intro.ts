import type { LucideIcon } from 'lucide-react';
import { Clapperboard, LayoutGrid, Plus, ShoppingBag } from 'lucide-react';

/** Tanishtiruvning bitta qadami. */
export interface FeedIntroSlide {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Feed tanishtiruvi — YAGONA manba.
 *
 * ── Nima uchun ATIGI uchta qadam ──────────────────────────────────────
 * Tanishtiruv uzun bo'lsa, odam uni o'qimaydi — "o'tkazib yuborish" ni
 * bosadi va hech narsa bilmay qoladi. Uchta qadam esa o'n soniyada
 * o'qiladi.
 *
 * ── Nima uchun aynan SHU uchtasi ──────────────────────────────────────
 * Har biri odam BIRINCHI kunda duch keladigan savolga javob beradi:
 *   1. "Bu yerda nima bor?" — bo'limlar;
 *   2. "Videodagi narsani qanday sotib olaman?" — mahsulot tugmasi;
 *   3. "O'zim qanday joylayman?" — yaratish tugmasi.
 *
 * Qolgani (saqlanganlar, statistika, xeshteg) keyinroq o'zi
 * topiladi va ularni birinchi kunda aytish ortiqcha yuk bo'lardi.
 */
export const FEED_INTRO_SLIDES: readonly FeedIntroSlide[] = [
  {
    icon: LayoutGrid,
    title: "Bo'limlar tepada",
    description:
      "Chegirmalar, restoranlar, ishlar, e'lonlar — barmoq bilan surib tanlaysiz. Faqat o'zingizga keragini ko'rasiz.",
  },
  {
    icon: ShoppingBag,
    title: "Videodan to'g'ridan-to'g'ri xarid",
    description:
      "Video ostidagi tugma mahsulotni ochadi. Yoqqan narsani izlab yurish shart emas — bir bosishda topasiz.",
  },
  {
    icon: Plus,
    title: "O'zingiz ham joylaysiz",
    description:
      "Pastdagi '+' tugmasi: video, post yoki hikoya. Sotuvchi bo'lsangiz, videoga mahsulot biriktirasiz.",
  },
] as const;

/** Tanishtiruvdan keyin odam AYNAN shu yerga tushadi. */
export const FEED_INTRO_DESTINATION = '/feed/watch';

/** Oxirgi qadamdagi belgi. */
export const FEED_INTRO_FINISH_ICON: LucideIcon = Clapperboard;
