import { Home, Search } from 'lucide-react';
import Link from 'next/link';

import { SiteHeader } from '@/components/layout/site-header';
import { AuroraBackground } from '@/components/shared/aurora-background';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';

export const metadata = { title: 'Sahifa topilmadi' };

/** 404 — mavjud bo'lmagan manzilga kirilganda ko'rsatiladi. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden py-24">
        <AuroraBackground />

        <Container size="sm" className="relative text-center">
          <p className="text-gradient animate-fade-up text-7xl font-semibold tabular-nums sm:text-8xl">404</p>

          <h1
            className="animate-fade-up mt-4 text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ animationDelay: '80ms' }}
          >
            Bunday sahifa topilmadi
          </h1>

          <p
            className="animate-fade-up text-muted-foreground mt-3 leading-relaxed"
            style={{ animationDelay: '160ms' }}
          >
            Manzil noto&apos;g&apos;ri kiritilgan bo&apos;lishi yoki sahifa ko&apos;chirilgan bo&apos;lishi mumkin.
          </p>

          <div
            className="animate-fade-up mt-8 flex flex-col justify-center gap-3 sm:flex-row"
            style={{ animationDelay: '240ms' }}
          >
            <Button asChild>
              <Link href="/">
                <Home aria-hidden="true" />
                Bosh sahifaga
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/#modullar">
                <Search aria-hidden="true" />
                Xizmatlarni ko&apos;rish
              </Link>
            </Button>
          </div>
        </Container>
      </main>
    </>
  );
}
