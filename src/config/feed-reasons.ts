import type { LucideIcon } from 'lucide-react';
import { Clock, Flame, Sparkles, Star, UserCheck, UserPlus } from 'lucide-react';

import type { ReasonCode } from '@/modules/feed/ranking';

/**
 * Sabab kodlarining ekrandagi ko'rinishi — YAGONA manba.
 *
 * ── Nima uchun matn SERVERDA emas ─────────────────────────────────────
 * Server sababni HISOBLAYDI, matnni esa ekran yasaydi. Shu tufayli
 * yozuvni o'zgartirish uchun server kodini tahrirlash shart emas va
 * ertaga ikkinchi til qo'shilganda ham hech narsa buzilmaydi.
 *
 * ── Nima uchun har birida "nima qilsam bo'ladi" bor ───────────────────
 * "Nega bu ko'rinyapti?" degan savolning ortida odatda ikkinchi savol
 * turadi: "buni qanday o'zgartiraman?" Javob faqat birinchisiga
 * berilsa, odam baribir noqulaylikda qoladi.
 */
export interface ReasonPresentation {
  icon: LucideIcon;
  /** `{category}` va `{author}` o'rniga haqiqiy qiymat qo'yiladi. */
  template: string;
  /** Nima qilish mumkinligi — sabab ostida kichik yozuv. */
  hint?: string;
}

export const REASON_PRESENTATION: Record<ReasonCode, ReasonPresentation> = {
  FOLLOWING: {
    icon: UserCheck,
    template: 'Siz {author} ga obunasiz',
    hint: "Obunani profil sahifasidan bekor qilishingiz mumkin.",
  },
  CHOSEN_INTEREST: {
    icon: Star,
    template: 'Siz "{category}" bo\'limini qiziqishlaringizga qo\'shgansiz',
    hint: "Sozlamalar → Kontent sozlamalari da o'zgartiriladi.",
  },
  LEARNED_INTEREST: {
    icon: Sparkles,
    template: 'Siz "{category}" bo\'limidagi postlarni ko\'p yoqtirasiz',
    hint: "Sozlamalar → Feedni tiklash bu xotirani tozalaydi.",
  },
  AUTHOR_AFFINITY: {
    icon: UserPlus,
    template: '{author} ning postlarini avval ham yoqtirgansiz',
    hint: "Sozlamalar → Feedni tiklash bu xotirani tozalaydi.",
  },
  POPULAR: {
    icon: Flame,
    template: 'Bu post boshqalarga yoqmoqda',
  },
  RECENT: {
    icon: Clock,
    template: 'Bu yaqinda joylangan',
  },
  OWN: {
    icon: Star,
    template: 'Bu sizning postingiz',
  },
};

/**
 * Andozani haqiqiy qiymatlar bilan to'ldiradi.
 *
 * ── Nima uchun qiymat YO'Q bo'lsa ham ishlaydi ────────────────────────
 * Muallif ismini kiritmagan yoki post bo'limsiz bo'lishi mumkin.
 * Bunday holda "undefined ga obunasiz" degan yozuv chiqmasligi
 * kerak — o'rniga umumiy so'z qo'yiladi.
 */
export function buildReasonText(
  template: string,
  values: { category?: string | null; author?: string | null },
): string {
  return template
    .replace('{category}', values.category ?? "shu bo'lim")
    .replace('{author}', values.author ?? 'bu muallif');
}
