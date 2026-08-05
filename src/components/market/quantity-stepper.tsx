'use client';

import { Minus, Plus } from 'lucide-react';

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Omborda nechta bor — undan ko'p tanlab bo'lmaydi. */
  max: number;
  disabled?: boolean;
  label: string;
}

/**
 * Miqdor tanlagich.
 *
 * ── Nima uchun `max` MAJBURIY ─────────────────────────────────────────
 * Omborda 3 ta bo'lsa, foydalanuvchi 5 ta tanlay olmasligi kerak.
 * Buni faqat serverda tekshirish yomon tajriba: odam savatni to'ldirib,
 * oxirida xato oladi. Shuning uchun chegara TUGMANING O'ZIDA.
 */
export function QuantityStepper({ value, onChange, max, disabled = false, label }: QuantityStepperProps) {
  const canAdd = !disabled && value < max;

  return (
    <div className="border-border inline-flex items-center gap-1 rounded-full border p-1">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 0}
        aria-label={`${label} — kamaytirish`}
        className="hover:bg-secondary inline-flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-40"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>

      <span className="min-w-6 text-center text-sm font-semibold tabular-nums">{value}</span>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canAdd}
        aria-label={`${label} — ko'paytirish`}
        className="hover:bg-secondary inline-flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
