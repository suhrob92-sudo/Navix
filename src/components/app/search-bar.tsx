'use client';

import { Search, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SearchBarProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** `true` bo'lsa maydon o'zi yozilmaydi — bosilganda boshqa sahifaga o'tadi. */
  readOnly?: boolean;
  onClick?: () => void;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Qidiruv paneli — maketdagi barcha sahifalarda takrorlanadigan element.
 *
 * Ikki rejimda ishlaydi:
 *  - yozish rejimi (qidiruv sahifasida);
 *  - "tugma" rejimi (`readOnly`) — bosh sahifada bosilsa qidiruvga o'tadi.
 */
export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { value = '', onValueChange, placeholder = 'Qidiruv', readOnly = false, onClick, autoFocus, className },
  ref,
) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2"
        aria-hidden="true"
      />

      <input
        ref={ref}
        type="search"
        inputMode="search"
        role={readOnly ? 'button' : undefined}
        readOnly={readOnly}
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onValueChange?.(event.target.value)}
        onClick={onClick}
        className={cn(
          'bg-card border-border h-12 w-full rounded-xl border pr-11 pl-11 text-base transition-colors outline-none',
          'placeholder:text-muted-foreground',
          'focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-2',
          // Brauzerning o'z "tozalash" belgisini yashiramiz — o'zimizniki bor.
          '[&::-webkit-search-cancel-button]:hidden',
          readOnly && 'cursor-pointer',
        )}
      />

      {value.length > 0 && !readOnly && (
        <button
          type="button"
          onClick={() => onValueChange?.('')}
          aria-label="Tozalash"
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
});
