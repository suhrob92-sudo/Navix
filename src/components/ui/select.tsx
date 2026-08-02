import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: readonly SelectOption[];
  hasError?: boolean;
  /** Bo'sh qiymat uchun matn. Berilmasa bo'sh variant ko'rsatilmaydi. */
  placeholder?: string;
}

/**
 * Ochiladigan ro'yxat.
 *
 * Oddiy `<select>` ustiga qurilgan — telefonda tizimning o'z ro'yxati
 * ochiladi, bu esa maxsus komponentlardan ancha qulay va tez.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, hasError = false, placeholder, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={hasError || undefined}
        className={cn(
          'bg-card/60 h-12 w-full appearance-none rounded-lg border px-4 pr-10 text-base transition-colors outline-none',
          'focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          hasError
            ? 'border-destructive focus-visible:ring-destructive'
            : 'border-border focus-visible:ring-ring focus-visible:border-ring',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
    </div>
  );
});
