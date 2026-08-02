import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Xatolik holati — chegara qizil bo'ladi. */
  hasError?: boolean;
  /** Maydon boshida ko'rinadigan ikonka yoki matn. */
  leading?: React.ReactNode;
  /** Maydon oxirida ko'rinadigan element (masalan parolni ko'rsatish tugmasi). */
  trailing?: React.ReactNode;
}

/**
 * Universal matn kiritish maydoni.
 *
 * Telefonda qulay bo'lishi uchun balandligi 48px (h-12) — barmoq bilan
 * bosish uchun tavsiya etilgan minimal o'lcham.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', hasError = false, leading, trailing, ...props },
  ref,
) {
  const inputElement = (
    <input
      ref={ref}
      type={type}
      aria-invalid={hasError || undefined}
      className={cn(
        'bg-card/60 h-12 w-full rounded-lg border px-4 text-base transition-colors outline-none',
        'placeholder:text-muted-foreground/70',
        'focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        hasError
          ? 'border-destructive focus-visible:ring-destructive'
          : 'border-border focus-visible:ring-ring focus-visible:border-ring',
        leading && 'pl-11',
        trailing && 'pr-11',
        className,
      )}
      {...props}
    />
  );

  if (!leading && !trailing) {
    return inputElement;
  }

  return (
    <div className="relative">
      {leading && (
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 [&_svg]:size-4">
          {leading}
        </span>
      )}
      {inputElement}
      {trailing && <span className="absolute top-1/2 right-1.5 -translate-y-1/2">{trailing}</span>}
    </div>
  );
});
