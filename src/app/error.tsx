'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';

/**
 * Sahifada kutilmagan xatolik yuz berganda ko'rsatiladigan ekran.
 *
 * Next.js talabiga ko'ra bu fayl 'use client' bo'lishi shart.
 * Foydalanuvchiga texnik tafsilotlar ko'rsatilmaydi — faqat `digest`
 * (xatolikning qisqa belgisi), u orqali server log'idan to'liq xatolik topiladi.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Brauzer konsoliga yozamiz; server tomonidagi to'liq log Next.js tomonidan yozilgan bo'ladi.
    console.error('Sahifa xatosi:', error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center py-24">
      <Container size="sm" className="text-center">
        <span className="bg-destructive/10 text-destructive mx-auto inline-flex size-14 items-center justify-center rounded-2xl">
          <AlertTriangle className="size-7" aria-hidden="true" />
        </span>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          Nimadir noto&apos;g&apos;ri ketdi
        </h1>

        <p className="text-muted-foreground mt-3 leading-relaxed">
          Kutilmagan xatolik yuz berdi. Sahifani qayta yuklab ko&apos;ring — muammo takrorlansa, bizga xabar
          bering.
        </p>

        {error.digest && (
          <p className="text-muted-foreground mt-4 font-mono text-xs">Xatolik kodi: {error.digest}</p>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>
            <RotateCcw aria-hidden="true" />
            Qayta urinish
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Bosh sahifaga</Link>
          </Button>
        </div>
      </Container>
    </main>
  );
}
