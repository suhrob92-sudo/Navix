import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { ModuleStatus, type AppModule, type ModuleStatusValue } from '@/config/modules';
import { cn } from '@/lib/utils';

/** Har bir holat uchun yorliq matni va rangi. */
const STATUS_META: Record<ModuleStatusValue, { label: string; variant: 'success' | 'warning' | 'outline' }> = {
  [ModuleStatus.LIVE]: { label: 'Ishlamoqda', variant: 'success' },
  [ModuleStatus.IN_PROGRESS]: { label: 'Ishlanmoqda', variant: 'warning' },
  [ModuleStatus.PLANNED]: { label: 'Rejada', variant: 'outline' },
};

interface ModuleCardProps {
  module: AppModule;
  /** Ro'yxatdagi tartib raqami — animatsiyani navbat bilan ishga tushirish uchun. */
  index?: number;
  className?: string;
}

/**
 * Bitta super app modulini ko'rsatuvchi kartochka.
 * Bosh sahifa, qidiruv natijalari va AI yordamchi tavsiyalarida qayta ishlatiladi.
 */
export function ModuleCard({ module, index = 0, className }: ModuleCardProps) {
  const Icon = module.icon;
  const status = STATUS_META[module.status];
  const isAvailable = module.status === ModuleStatus.LIVE;

  const content = (
    <Card
      variant="glass"
      interactive={isAvailable}
      padding="sm"
      className={cn('animate-fade-up group h-full', className)}
      // Har bir kartochka biroz kechikib paydo bo'ladi — "to'lqin" effekti.
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="from-primary/15 to-accent/15 text-primary ring-primary/10 inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 transition-transform duration-300 group-hover:scale-110">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className="mt-4 space-y-1.5">
        <CardTitle className="text-base">{module.name}</CardTitle>
        <CardDescription>{module.description}</CardDescription>
      </div>
    </Card>
  );

  // Modul hali tayyor bo'lmasa — havola qilmaymiz, chunki 404 sahifaga olib boradi.
  if (!isAvailable) {
    return content;
  }

  return (
    <Link href={module.href} className="rounded-xl focus-visible:outline-offset-4">
      {content}
    </Link>
  );
}
