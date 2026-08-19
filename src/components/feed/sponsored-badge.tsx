import { Megaphone } from 'lucide-react';

import { SPONSORED_BADGE_LABEL, SPONSORED_BADGE_TITLE } from '@/config/disclosure';
import { cn } from '@/lib/utils';

export interface SponsoredBadgeProps {
  /**
   * Video USTIDA turibdimi.
   *
   * To'liq ekranli pleyerda fon — video kadri: u har lahzada
   * rangini o'zgartiradi. Oddiy rang bilan nishon goh ko'rinib,
   * goh yo'qolib turardi.
   */
  onMedia?: boolean;
  className?: string;
}

/**
 * "Reklama" nishoni.
 *
 * ── Nima uchun alohida komponent ──────────────────────────────────────
 * Nishon uch joyda ko'rinadi: lentadagi kartochka, to'liq ekranli
 * pleyer va post sahifasi. Har joyda qo'lda yozilsa, ertaga yozuv
 * yoki rangi o'zgarganda bittasi eskicha qolardi — va aynan o'sha
 * joyda oshkoralik boshqacha ko'rinardi.
 *
 * ── Nima uchun ko'zga tashlanadigan rang ──────────────────────────────
 * Nishon YASHIRINMASLIGI kerak: uning butun ma'nosi ko'rinishda.
 * Kulrang, mayda yozuv bo'lsa, u shaklan bor bo'lib, amalda hech
 * kimga ko'rinmasdi — ya'ni oshkoralik faqat qog'ozda qolardi.
 *
 * Shu bilan birga u KARTOCHKANI ham egallamasligi kerak: bu
 * ogohlantirish emas, ma'lumot.
 */
export function SponsoredBadge({ onMedia = false, className }: SponsoredBadgeProps) {
  return (
    <span
      title={SPONSORED_BADGE_TITLE}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        onMedia
          ? 'bg-black/55 text-white backdrop-blur-sm'
          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
        className,
      )}
    >
      <Megaphone className="size-3" aria-hidden="true" />
      {SPONSORED_BADGE_LABEL}
    </span>
  );
}
