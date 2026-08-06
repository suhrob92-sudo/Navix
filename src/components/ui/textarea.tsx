import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Xatolik holati — chegara qizil bo'ladi. */
  hasError?: boolean;
}

/**
 * Ko'p qatorli matn maydoni.
 *
 * `Input` bilan bir xil ko'rinishda: bir xil chegara, bir xil fokus
 * halqasi. Farqi faqat balandlikda va `resize-y` da — foydalanuvchi
 * uzun matn yozayotganda maydonni cho'zishi mumkin.
 *
 * ── Nima uchun `field-sizing` emas ────────────────────────────────────
 * CSS'ning yangi `field-sizing: content` xossasi maydonni matnga
 * qarab o'stiradi, lekin uni hali barcha brauzerlar qo'llab-quvvatlamaydi
 * (jumladan O'zbekistonda keng tarqalgan eski Android brauzerlari).
 * Shuning uchun oddiy `rows` va qo'lda cho'zish ishlatiladi — u
 * hamma joyda ishlaydi.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, hasError = false, rows = 5, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={hasError || undefined}
      className={cn(
        'bg-card/60 w-full resize-y rounded-lg border px-4 py-3 text-base leading-relaxed transition-colors outline-none',
        'placeholder:text-muted-foreground/70',
        'focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        hasError
          ? 'border-destructive focus-visible:ring-destructive'
          : 'border-border focus-visible:ring-ring focus-visible:border-ring',
        className,
      )}
      {...props}
    />
  );
});
