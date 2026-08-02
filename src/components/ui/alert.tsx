import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/** Foydalanuvchiga xabar berish bloki: xatolik, muvaffaqiyat, ogohlantirish. */
const alertVariants = cva('flex items-start gap-3 rounded-lg border p-4 text-sm', {
  variants: {
    variant: {
      info: 'border-primary/25 bg-primary/8 text-foreground',
      success: 'border-success/25 bg-success/8 text-foreground',
      warning: 'border-warning/30 bg-warning/10 text-foreground',
      error: 'border-destructive/25 bg-destructive/8 text-foreground',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

const VARIANT_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
} as const;

const ICON_COLORS = {
  info: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
} as const;

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
}

export function Alert({ className, variant = 'info', title, children, ...props }: AlertProps) {
  const resolvedVariant = variant ?? 'info';
  const Icon = VARIANT_ICONS[resolvedVariant];

  return (
    <div
      // Xatolik darhol o'qilishi kerak, qolganlari navbat bilan.
      role={resolvedVariant === 'error' ? 'alert' : 'status'}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', ICON_COLORS[resolvedVariant])} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-muted-foreground leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
