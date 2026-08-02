import Link from 'next/link';

import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  /** Yozuvsiz, faqat belgi ko'rinishida. */
  iconOnly?: boolean;
}

/** Navix brend belgisi. SVG bo'lgani uchun har qanday ekranda aniq ko'rinadi. */
export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn('inline-flex items-center gap-2.5 rounded-lg', className)}
      aria-label={`${siteConfig.name} — bosh sahifa`}
    >
      <span className="from-primary to-accent shadow-primary/30 inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg">
        <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
          <path
            d="M5 19V5l14 14V5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary-foreground"
          />
        </svg>
      </span>
      {!iconOnly && <span className="text-lg font-semibold tracking-tight">{siteConfig.name}</span>}
    </Link>
  );
}
