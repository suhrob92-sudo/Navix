import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Yuklanish holatidagi "kulrang shakl".
 * Ma'lumot kelguncha shu ko'rsatiladi — foydalanuvchi bo'sh ekranga qaramaydi.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Yuklanmoqda"
      className={cn('bg-muted shimmer rounded-md', className)}
      {...props}
    />
  );
}
