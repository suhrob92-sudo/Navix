import type { LucideIcon } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Bitta ko'rsatkich kartochkasi — "Sarflandi", "Qaytarildi", "Tushdi".
 *
 * ── Nima uchun diagramma emas ─────────────────────────────────────────
 * Bu yerda solishtiriladigan narsa yo'q: har biri BITTA son. Bitta
 * sonni diagramma qilish uni faqat sekinroq o'qitadi.
 *
 * ── Nima uchun raqam RANGSIZ ──────────────────────────────────────────
 * Chiqimni qizil, tushumni yashil qilish mumkin edi. Lekin qizil bu
 * ilovada XATO degani (`Alert variant="error"`), va odam har oy
 * xarajat qilganini xato deb o'qimasligi kerak.
 *
 * Rangni faqat belgi (ikonka) tashiydi, ma'no esa yozuvda — shuning
 * uchun rang ko'rmaydigan odam ham hammasini tushunadi.
 */
export interface StatTileProps {
  label: string;
  /** Tayyor formatlangan summa: "125 000 so'm". */
  value: string;
  icon: LucideIcon;
  /** Ikonka rangi — Tailwind sinfi. */
  iconClassName?: string;
  /** Qo'shimcha izoh: "3 ta amal". */
  hint?: string;
  className?: string;
}

export function StatTile({ label, value, icon: Icon, iconClassName, hint, className }: StatTileProps) {
  return (
    <Card padding="none" className={cn('p-4', className)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('size-4 shrink-0', iconClassName ?? 'text-muted-foreground')} aria-hidden="true" />
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
      </div>

      <p className="mt-2 text-base font-semibold tracking-tight tabular-nums">{value}</p>

      {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
    </Card>
  );
}
