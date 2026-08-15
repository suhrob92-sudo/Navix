'use client';

import { FEED_CATEGORIES, type FeedFilterValue } from '@/config/feed-nav';
import { cn } from '@/lib/utils';

export interface CategoryRowProps {
  value: FeedFilterValue;
  onChange: (value: FeedFilterValue) => void;
}

/**
 * Feed tepasidagi kategoriyalar qatori.
 *
 * ── Nima uchun GORIZONTAL surish ──────────────────────────────────────
 * O'n ikkita doira telefon ekraniga sig'maydi. Ularni ikki qatorga
 * yoysak, lentaning uchdan biri yo'qolardi — aynan shundan shikoyat
 * bo'lgan edi.
 *
 * Gorizontal qator esa bitta chiziqda qoladi va barmoq bilan
 * surilib ko'riladi.
 *
 * ── Nima uchun BELGI (emoji) bor ──────────────────────────────────────
 * Odam tez surayotganda matnni o'qimaydi — rangli belgini payqaydi.
 * Belgi bir qarashda "bu ovqat", "bu ish" deb aytadi.
 *
 * ── Nima uchun tanlangani KATTA farq bilan ajratiladi ─────────────────
 * Surilib turgan qatorda qaysi biri tanlangani ko'rinmasa, odam
 * lentada nima ko'rayotganini tushunmaydi.
 */
export function CategoryRow({ value, onChange }: CategoryRowProps) {
  return (
    <div
      role="tablist"
      aria-label="Feed bo'limlari"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {FEED_CATEGORIES.map((item) => {
        const isActive = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm whitespace-nowrap transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground font-medium'
                : 'border-border hover:bg-secondary',
            )}
          >
            <span aria-hidden="true">{item.emoji}</span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
