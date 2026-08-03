import type { LucideIcon } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  /** Asosiy qiymat — allaqachon formatlangan matn. */
  value: string;
  /** Qiymat ostidagi izoh: "bugun +12". */
  hint?: string;
  icon: LucideIcon;
  /** Diqqatni tortishi kerak bo'lgan holat (masalan xatoliklar soni). */
  tone?: 'default' | 'success' | 'warning';
  isLoading?: boolean;
  className?: string;
}

const TONE_STYLES = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/15 text-warning',
} as const;

/**
 * Bitta ko'rsatkich kartochkasi.
 *
 * Telefonda ikkitadan yonma-yon turadi, shuning uchun matn qisqa va
 * raqam kattaroq — ekranga bir qarashda tushunilishi kerak.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  isLoading = false,
  className,
}: StatCardProps) {
  return (
    <div className={cn('bg-card border-border animate-fade-up rounded-2xl border p-4', className)}>
      <span
        className={cn('inline-flex size-9 items-center justify-center rounded-xl', TONE_STYLES[tone])}
        aria-hidden="true"
      >
        <Icon className="size-4.5" />
      </span>

      <p className="text-muted-foreground mt-3 text-xs">{label}</p>

      {isLoading ? (
        <Skeleton className="mt-1.5 h-6 w-24" />
      ) : (
        <p className="mt-0.5 text-lg font-semibold tracking-tight tabular-nums">{value}</p>
      )}

      {hint && !isLoading && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}
