import Link from 'next/link';

import { NavixMark } from '@/components/brand/navix-mark';
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
      {/*
        Belgi `NavixMark` dan olinadi — pastki paneldagi AI tugmasi ham
        aynan shuni chizadi. Ilgari bu yerda alohida "N" chizilgan edi va
        ikkita joyda ikki xil brend ko'rinardi.
      */}
      <span className="from-brand-from to-brand-to shadow-brand-from/30 inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg">
        <NavixMark className="text-brand-foreground size-6" />
      </span>
      {!iconOnly && <span className="text-lg font-semibold tracking-tight">{siteConfig.name}</span>}
    </Link>
  );
}
