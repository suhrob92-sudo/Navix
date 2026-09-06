'use client';

import { Circle, MapPin } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Manzil qatori — "Qayerdan" yoki "Qayerga".
 *
 * ── Nima uchun bu tugma, matn maydoni emas ────────────────────────────
 * Manzilni yozib kiritish uchun qidiruv xizmati kerak: odam "Chorsu"
 * deb yozadi, tizim esa koordinatani topib berishi kerak. Bunday
 * xizmat hozircha yo'q.
 *
 * Shuning uchun manzil TANLANADI: saqlangan manzillardan yoki
 * xaritadan. Tugma bu haqiqatni ochiq aytadi — bo'sh maydon esa
 * "yozing" deb chaqirib, keyin ishlamasdi.
 */

export interface PlaceFieldProps {
  kind: 'from' | 'to';
  label: string;
  /** Tanlangan manzil matni. Bo'sh bo'lsa ko'rsatma ko'rinadi. */
  value: string | null;
  placeholder: string;
  onClick: () => void;
}

export function PlaceField({ kind, label, value, placeholder, onClick }: PlaceFieldProps) {
  const Icon = kind === 'from' ? Circle : MapPin;

  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-secondary/60 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors"
    >
      <Icon
        className={cn('size-4 shrink-0', kind === 'from' ? 'text-muted-foreground' : 'text-primary')}
        aria-hidden="true"
      />

      <span className="min-w-0 flex-1">
        <span className="text-muted-foreground block text-[11px] leading-none font-medium tracking-wide uppercase">
          {label}
        </span>
        <span
          className={cn(
            'mt-1 block truncate text-sm',
            value ? 'text-foreground font-medium' : 'text-muted-foreground',
          )}
        >
          {value ?? placeholder}
        </span>
      </span>
    </button>
  );
}
