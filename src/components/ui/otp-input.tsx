'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * SMS kodini kiritish maydoni — 6 ta alohida katakcha.
 *
 * Telefonda qulay ishlashi uchun:
 *  - raqam kiritilganda fokus keyingi katakchaga o'tadi;
 *  - Backspace bosilganda oldingisiga qaytadi;
 *  - kodni to'liq nusxalab qo'yish (paste) ishlaydi;
 *  - `inputMode="numeric"` — telefonda raqamli klaviatura ochiladi;
 *  - `autoComplete="one-time-code"` — iOS SMS'dan kodni o'zi taklif qiladi.
 */

const CODE_LENGTH = 6;

export interface OtpInputProps {
  value: string;
  onValueChange: (code: string) => void;
  /** Kod to'liq kiritilganda chaqiriladi — forma avtomatik yuboriladi. */
  onComplete?: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  /** Ekran o'quvchisi uchun guruh nomi. */
  label?: string;
}

export function OtpInput({
  value,
  onValueChange,
  onComplete,
  disabled = false,
  hasError = false,
  label = 'Tasdiqlash kodi',
}: OtpInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.padEnd(CODE_LENGTH, ' ').slice(0, CODE_LENGTH).split('');

  const focusInput = (index: number) => {
    inputRefs.current[Math.min(Math.max(index, 0), CODE_LENGTH - 1)]?.focus();
  };

  const commit = (nextValue: string) => {
    onValueChange(nextValue);

    if (nextValue.length === CODE_LENGTH) {
      onComplete?.(nextValue);
    }
  };

  const handleChange = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, '').slice(-1);
    if (!digit) return;

    const chars = value.padEnd(CODE_LENGTH, ' ').split('');
    chars[index] = digit;

    commit(chars.join('').replace(/\s/g, ''));
    focusInput(index + 1);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();

      const chars = value.padEnd(CODE_LENGTH, ' ').split('');

      // Katakcha bo'sh bo'lsa — oldingisini tozalaymiz.
      if (chars[index] === ' ' && index > 0) {
        chars[index - 1] = ' ';
        focusInput(index - 1);
      } else {
        chars[index] = ' ';
      }

      onValueChange(chars.join('').trimEnd().replace(/\s/g, ''));
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusInput(index - 1);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;

    commit(pasted);
    focusInput(pasted.length);
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label={label}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          aria-label={`${index + 1}-raqam`}
          aria-invalid={hasError || undefined}
          value={digit.trim()}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          className={cn(
            'bg-card/60 h-14 w-full rounded-lg border text-center text-xl font-semibold tabular-nums transition-colors outline-none',
            'focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-60',
            hasError
              ? 'border-destructive focus-visible:ring-destructive'
              : 'border-border focus-visible:ring-ring focus-visible:border-ring',
          )}
        />
      ))}
    </div>
  );
}
