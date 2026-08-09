import { Suspense } from 'react';

import { WaitlistContent } from '@/app/navbat/waitlist-content';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { AuroraBackground } from '@/components/shared/aurora-background';

export const metadata = {
  title: 'Navbatga yozilish',
  description:
    "Navix ochilganda birinchilardan bo'lib xabar oling. Raqamingizni qoldiring — ochilish kuni sizga yozamiz.",
};

/**
 * Navbat sahifasi.
 *
 * ── Nima uchun ALOHIDA sahifa ─────────────────────────────────────────
 * Bu sahifaga Instagram profilidagi havoladan kiriladi. Odam bosh
 * sahifaga tushsa, uzun tanishtiruv matnini o'qib, formani izlab
 * yurardi va yo'lda yo'qolardi. Bu yerda ekranda bitta ish bor:
 * raqam qoldirish.
 */
export default function WaitlistPage() {
  return (
    <>
      <SiteHeader />
      <main className="relative">
        <AuroraBackground />
        {/*
          `Suspense` shart: forma manzildagi `?from=` ni o'qiydi, uni esa
          faqat brauzer biladi. Chegarasiz Next.js butun sahifani
          serverda oldindan chiza olmasdi.
        */}
        <Suspense fallback={<div className="min-h-[70vh]" />}>
          <WaitlistContent />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
