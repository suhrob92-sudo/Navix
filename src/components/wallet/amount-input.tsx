'use client';

import { formatAmountInput, parseAmountInput } from '@/lib/money';
import { cn } from '@/lib/utils';

export interface AmountInputProps {
  /** Joriy qiymat SO'MDA. Bo'sh bo'lsa `null`. */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Tez tanlash tugmalari (so'mda). */
  presets?: readonly number[];
  disabled?: boolean;
  hasError?: boolean;
  id?: string;
  className?: string;
}

/**
 * Pul summasini kiritish maydoni.
 *
 * Nima uchun oddiy `<input type="number">` emas:
 *  - telefonda strelkalar keraksiz joy egallaydi;
 *  - "50000" o'qish qiyin, "50 000" esa oson — shuning uchun kiritish
 *    paytida guruhlab ko'rsatiladi;
 *  - kasr va manfiy qiymat umuman kiritilmaydi.
 *
 * `inputMode="numeric"` telefonda RAQAMLI klaviaturani ochadi.
 */
export function AmountInput({
  value,
  onChange,
  presets,
  disabled = false,
  hasError = false,
  id,
  className,
}: AmountInputProps) {
  const display = value === null ? '' : formatAmountInput(value);

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'bg-card flex items-center gap-2 rounded-xl border px-4 py-3 transition-colors',
          hasError ? 'border-destructive' : 'border-border focus-within:border-primary',
        )}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={display}
          onChange={(event) => onChange(parseAmountInput(event.target.value))}
          placeholder="0"
          disabled={disabled}
          aria-invalid={hasError}
          className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tabular-nums outline-none disabled:opacity-60"
        />
        <span className="text-muted-foreground shrink-0 text-lg font-medium">so&apos;m</span>
      </div>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              disabled={disabled}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60',
                value === preset
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-secondary',
              )}
            >
              {formatAmountInput(preset)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
