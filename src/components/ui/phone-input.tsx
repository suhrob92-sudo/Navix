'use client';

import * as React from 'react';

import { Input, type InputProps } from '@/components/ui/input';

/**
 * O'zbekiston telefon raqami uchun maydon.
 *
 * Foydalanuvchi yozgan sari raqam avtomatik formatlanadi:
 *   901234567 → 90 123 45 67
 *
 * `+998` prefiksi maydon oldida doimiy turadi — foydalanuvchi uni
 * yozishi shart emas va o'chira olmaydi.
 */

/** Faqat raqamlarni qoldiradi va 9 tagacha qisqartiradi. */
function extractDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

/** `901234567` → `90 123 45 67` */
function formatNational(digits: string): string {
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  return parts.filter(Boolean).join(' ');
}

export interface PhoneInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type' | 'leading'> {
  /** Faqat raqamlar, prefiksiz: `901234567`. */
  value: string;
  /** Har o'zgarishda tozalangan raqamlar qaytadi. */
  onValueChange: (digits: string) => void;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value, onValueChange, ...props },
  ref,
) {
  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base tabular-nums">
        +998
      </span>
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="90 123 45 67"
        className="pl-16 tabular-nums"
        value={formatNational(value)}
        onChange={(event) => onValueChange(extractDigits(event.target.value))}
        {...props}
      />
    </div>
  );
});

/** Maydondagi raqamlarni to'liq E.164 formatga aylantiradi. */
export function toE164(digits: string): string {
  return `+998${digits}`;
}
