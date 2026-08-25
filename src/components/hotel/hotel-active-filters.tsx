'use client';

import { X } from 'lucide-react';

import { describeHotelFilters, type HotelFilterKey, type HotelFilters } from '@/config/hotel-filters';
import { cn } from '@/lib/utils';

/**
 * Yoqilgan filtrlar qatori.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Sabab `market/active-filters.tsx` dagi bilan bir xil: tugmadagi
 * son "uchtasi yoqilgan" deydi, lekin QAYSILARI ekanini aytmaydi.
 *
 * Mehmonxonada bu ayniqsa muhim: qulayliklar bir necha bo'lishi
 * mumkin va odam odatda bittasidan voz kechadi ("konferens-zal
 * shart emas ekan"). Bu yerda bitta bosish yetadi.
 */

export interface HotelActiveFiltersProps {
  filters: HotelFilters;
  /** Narxni matnga aylantiruvchi — so'mda son kutadi. */
  format: (som: number) => string;
  skip?: readonly HotelFilterKey[];
  onClear: (key: HotelFilterKey, value?: string) => void;
  className?: string;
}

export function HotelActiveFilters({ filters, format, skip, onClear, className }: HotelActiveFiltersProps) {
  const chips = describeHotelFilters(filters, format, skip);

  // Hech narsa yoqilmagan bo'lsa, qator umuman chizilmaydi.
  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {chips.map((chip) => (
        <button
          key={`${chip.key}:${chip.value ?? ''}`}
          type="button"
          onClick={() => onClear(chip.key, chip.value)}
          aria-label={`${chip.label} — filtrni olib tashlash`}
          className={cn(
            'border-primary/40 bg-primary/10 text-primary inline-flex shrink-0 items-center gap-1.5',
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            'hover:bg-primary/15',
          )}
        >
          {chip.label}
          <X className="size-3" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
