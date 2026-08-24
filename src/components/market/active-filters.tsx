'use client';

import { X } from 'lucide-react';

import { describeFilter, type FilterKey, type ProductFilters } from '@/config/product-filter';
import { cn } from '@/lib/utils';

/**
 * Yoqilgan filtrlar qatori.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Filtrlar yopiq oynada turadi. Tugmadagi son "uchtasi yoqilgan"
 * deb aytadi, lekin QAYSILARI ekanini aytmaydi.
 *
 * Odam esa odatda bittasini olib tashlamoqchi bo'ladi: "narxni
 * qoldiray, lekin do'konni olib tashlay". Buning uchun oynani
 * ochib, kerakligini topib, bosib, keyin "Ko'rsatish" ni bosishi
 * kerak bo'lardi — to'rt harakat.
 *
 * Bu yerda esa bitta bosish yetadi.
 */

export interface ActiveFiltersProps {
  filters: ProductFilters;
  /** Tanlangan do'konning ko'rinadigan nomi. */
  shopName?: string;
  /** Belgi chizilmaydigan O'ZGARMAS maydonlar. */
  skip?: readonly FilterKey[];
  onClear: (key: FilterKey) => void;
  className?: string;
}

export function ActiveFilters({ filters, shopName, skip, onClear, className }: ActiveFiltersProps) {
  const chips = describeFilter(filters, shopName, skip);

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
          key={chip.key}
          type="button"
          onClick={() => onClear(chip.key)}
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
