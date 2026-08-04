'use client';

import { Minus, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface QuantityStepperProps {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  /** Chegaraga yetganda "+" bloklanadi. */
  max?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * Son o'zgartirgich: [−] 2 [+]
 *
 * Tugmalar 36px — barmoq bilan bosish uchun eng kichik qulay o'lcham.
 * Ular yonma-yon turgani uchun ataylab bir-biridan ajratilgan, aks
 * holda "kamaytirish" o'rniga "ko'paytirish" bosilib ketardi.
 */
export function QuantityStepper({
  quantity,
  onDecrease,
  onIncrease,
  max,
  disabled = false,
  className,
}: QuantityStepperProps) {
  const atMax = max !== undefined && quantity >= max;

  return (
    <div className={cn('bg-secondary flex items-center gap-1 rounded-full p-1', className)}>
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled}
        aria-label="Kamaytirish"
        className="bg-card text-foreground focus-visible:ring-ring inline-flex size-8 items-center justify-center rounded-full transition-transform focus-visible:ring-2 active:scale-90 disabled:opacity-50"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>

      <span className="min-w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled || atMax}
        aria-label="Ko'paytirish"
        className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex size-8 items-center justify-center rounded-full transition-transform focus-visible:ring-2 active:scale-90 disabled:opacity-50"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
