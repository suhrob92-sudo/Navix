import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Amal tugmasi (masalan "Manzil qo'shish"). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Ro'yxat bo'sh bo'lganda ko'rsatiladigan blok.
 *
 * Nima uchun kerak: bo'sh ekran foydalanuvchini chalkashtiradi — "yuklanyaptimi
 * yoki xatolikmi?" Bu blok holatni aniq tushuntiradi va keyingi qadamni ko'rsatadi.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="bg-secondary text-muted-foreground inline-flex size-14 items-center justify-center rounded-2xl">
        <Icon className="size-6" aria-hidden="true" />
      </span>

      <h3 className="mt-5 text-base font-semibold">{title}</h3>

      {description && (
        <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed text-pretty">{description}</p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
