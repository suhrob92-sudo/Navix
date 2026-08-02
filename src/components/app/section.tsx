import Link from 'next/link';

import { cn } from '@/lib/utils';

export interface SectionProps {
  title: string;
  /** O'ng tomondagi "Barchasi" havolasi. */
  moreHref?: string;
  moreLabel?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Bosh sahifadagi bo'lim: sarlavha + o'ngda "Barchasi" havolasi.
 * Maketdagi barcha ro'yxatlar shu qolipda.
 */
export function Section({ title, moreHref, moreLabel = 'Barchasi', className, children }: SectionProps) {
  return (
    <section className={cn('space-y-3.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>

        {moreHref && (
          <Link href={moreHref} className="text-primary text-sm font-medium hover:underline">
            {moreLabel}
          </Link>
        )}
      </div>

      {children}
    </section>
  );
}
