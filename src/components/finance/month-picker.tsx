'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { FINANCE_MONTHS_BACK } from '@/config/finance';
import { formatUzMonth } from '@/lib/date';
import { cn } from '@/lib/utils';
import { monthsBetween, nextMonth, previousMonth } from '@/modules/finance/finance.calc';

/**
 * Oy tanlagich: `< sentabr 2026 >`.
 *
 * ── Nima uchun ochiladigan ro'yxat EMAS ───────────────────────────────
 * Odam ko'pincha bitta oy orqaga qaraydi ("o'tgan oyda qancha
 * sarfladim?"). Ro'yxatda bu UCH harakat: ochish, tanlash, yopish.
 * Bu yerda BIR — chapdagi tugmani bosish.
 *
 * ── Nima uchun tugmalar O'CHIRILADI, yashirilmaydi ────────────────────
 * Yashirilsa, qolgan tugma joyidan siljib ketardi va odam
 * mo'ljallamagan joyni bosib qo'yardi. O'chirilgan tugma esa
 * joyida turadi va "bu yerda oxiri" deb ko'rsatadi.
 */
export interface MonthPickerProps {
  /** Tanlangan oy — `YYYY-MM`. */
  value: string;
  /** Eng kech ochiq oy — odatda joriy oy. */
  latest: string;
  onChange: (month: string) => void;
  className?: string;
}

export function MonthPicker({ value, latest, onChange, className }: MonthPickerProps) {
  /*
    Kelajakka o'tib bo'lmaydi: u oyda hali hech narsa bo'lmagan va
    ekran har doim bo'sh chiqardi.
  */
  const canGoForward = monthsBetween(value, latest) > 0;
  const canGoBack = monthsBetween(value, latest) < FINANCE_MONTHS_BACK;

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <ArrowButton label="Oldingi oy" disabled={!canGoBack} onClick={() => onChange(previousMonth(value))}>
        <ChevronLeft className="size-4" aria-hidden="true" />
      </ArrowButton>

      {/*
        `aria-live` — oy o'zgarganda ekran o'qiydigan dastur yangi
        nomni O'ZI aytadi. Aks holda ko'r odam tugmani bosgani bilan
        nima o'zgarganini bilmasdi.
      */}
      <p className="flex-1 text-center text-sm font-semibold" aria-live="polite">
        {formatUzMonth(value)}
      </p>

      <ArrowButton label="Keyingi oy" disabled={!canGoForward} onClick={() => onChange(nextMonth(value))}>
        <ChevronRight className="size-4" aria-hidden="true" />
      </ArrowButton>
    </div>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'tap-target border-border bg-card inline-flex size-9 items-center justify-center rounded-full border',
        'transition-colors',
        disabled ? 'text-muted-foreground/40' : 'hover:bg-secondary text-foreground',
      )}
    >
      {children}
    </button>
  );
}
