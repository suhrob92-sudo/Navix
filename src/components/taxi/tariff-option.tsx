'use client';

import { Check, Clock, Users } from 'lucide-react';

import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { TaxiQuoteOption } from '@/modules/taxi/taxi.types';

/**
 * Tarif kartochkasi.
 *
 * ── Nima uchun narx O'NGDA va yirik ───────────────────────────────────
 * Odam tarifni nomiga qarab emas, NARXIGA qarab tanlaydi. Narx
 * kartochkaning eng ko'rinadigan joyida turishi kerak, aks holda
 * har birini o'qib chiqishga majbur bo'lardi.
 *
 * ── Nima uchun `radio`, oddiy tugma emas ──────────────────────────────
 * Ekran o'quvchi "ikkitadan biri tanlanadi" deb aytishi kerak.
 * Oddiy tugmalar guruhi bu ma'noni bermaydi.
 */

export interface TariffOptionProps {
  option: TaxiQuoteOption;
  selected: boolean;
  onSelect: () => void;
}

export function TariffOption({ option, selected, onSelect }: TariffOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all',
        selected
          ? 'border-primary bg-primary/8 ring-primary/25 ring-2'
          : 'border-border bg-card hover:border-border/80 hover:bg-secondary/40',
      )}
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors',
          selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
        )}
      >
        {selected ? <Check className="size-5" aria-hidden="true" /> : <CarSide />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{option.label}</span>
        <span className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" />
            {option.minutes} daq
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" aria-hidden="true" />
            {option.seats} o&apos;rin
          </span>
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-base font-bold tabular-nums">{formatTiyin(option.priceTiyin)}</span>
      </span>
    </button>
  );
}

/** Yon tomondan ko'rilgan mashina — alohida rasm yuklamaslik uchun. */
function CarSide() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
      <path
        d="M4 12l1.8-4.6A2.5 2.5 0 018.1 6h7.8a2.5 2.5 0 012.3 1.4L20 12m-16 0h16m-16 0v4.5m16-4.5v4.5M6.5 16.5h.01M17.5 16.5h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
