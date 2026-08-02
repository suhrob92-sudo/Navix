import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** O'ng tomondagi amal tugmasi. */
  action?: React.ReactNode;
  className?: string;
}

/** Kabinet sahifalari uchun umumiy sarlavha bloki. */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('animate-fade-up mb-7 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{description}</p>}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
