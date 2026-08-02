import { cn } from '@/lib/utils';

export interface PageIntroProps {
  /** Sahifaning qisqa izohi. Sarlavha yuqori paneldan (AppHeader) ko'rinadi. */
  description?: string;
  /** O'ng tomondagi asosiy amal tugmasi. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Ichki sahifalar uchun kirish bloki.
 *
 * `PageHeader`dan farqi: sarlavhani takrorlamaydi, chunki mobil maketda
 * sahifa nomi doim yuqori panelda (AppHeader) turadi.
 */
export function PageIntro({ description, action, className }: PageIntroProps) {
  if (!description && !action) return null;

  return (
    <div className={cn('animate-fade-up mb-5 flex flex-wrap items-center justify-between gap-3', className)}>
      {description && (
        <p className="text-muted-foreground min-w-50 flex-1 text-sm leading-relaxed">{description}</p>
      )}

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
