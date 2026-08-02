import type { LucideIcon } from 'lucide-react';

import type { ServiceColor } from '@/config/modules';
import { cn } from '@/lib/utils';

/**
 * Xizmat ikonkasi — rangli fonli kvadrat.
 *
 * Maketdagi kabi har bir xizmat o'z rangiga ega. Bu shunchaki bezak emas:
 * foydalanuvchi bir necha marta ishlatgach ikonkani MATNNI O'QIMASDAN,
 * faqat rang va shakl bo'yicha topadigan bo'ladi.
 *
 * Ranglar bu yerda bitta joyda saqlanadi. Tailwind class'lari to'liq yozilgan,
 * chunki `bg-${color}-50` ko'rinishidagi dinamik nomlarni Tailwind build
 * vaqtida topa olmaydi va uslub yo'qoladi.
 */
const COLOR_CLASSES: Record<ServiceColor, string> = {
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-400/15 dark:text-rose-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-400/15 dark:text-orange-400',
  green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400',
  pink: 'bg-pink-100 text-pink-600 dark:bg-pink-400/15 dark:text-pink-400',
  teal: 'bg-teal-100 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-400',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-400/15 dark:text-sky-400',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-400',
  slate: 'bg-slate-200 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300',
};

const SIZE_CLASSES = {
  sm: 'size-10 rounded-xl [&_svg]:size-5',
  md: 'size-14 rounded-2xl [&_svg]:size-6',
  lg: 'size-16 rounded-2xl [&_svg]:size-7',
} as const;

export interface ServiceIconProps {
  icon: LucideIcon;
  color: ServiceColor;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function ServiceIcon({ icon: Icon, color, size = 'md', className }: ServiceIconProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center transition-transform duration-200',
        COLOR_CLASSES[color],
        SIZE_CLASSES[size],
        className,
      )}
    >
      <Icon aria-hidden="true" />
    </span>
  );
}
