import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Forma maydoni uchun umumiy qobiq: yorliq + kiritish maydoni + xatolik matni.
 *
 * Nima uchun kerak: har bir formada bir xil tuzilishni qayta yozmaslik va
 * qulaylik (accessibility) qoidalari doim bajarilishi uchun —
 * yorliq maydonga bog'lanadi, xatolik esa ekran o'quvchisiga o'qib beriladi.
 */

export interface FieldProps {
  /** Maydonning `id` atributi — yorliq shu orqali bog'lanadi. */
  id: string;
  label: string;
  /** Maydon ostidagi tushuntirish matni. */
  hint?: string;
  /** Xatolik matnlari (bir nechta bo'lishi mumkin). */
  errors?: string[];
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({ id, label, hint, errors, required, className, children }: FieldProps) {
  const hasErrors = Boolean(errors?.length);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="majburiy maydon">
            *
          </span>
        )}
      </label>

      {children}

      {hint && !hasErrors && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}

      {hasErrors && (
        <div id={errorId} role="alert" className="space-y-1">
          {errors?.map((message) => (
            <p key={message} className="text-destructive text-xs">
              {message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
