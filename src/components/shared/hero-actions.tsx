'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/modules/auth/auth-context';

/**
 * Bosh sahifadagi asosiy tugmalar.
 *
 * Foydalanuvchi tizimga kirgan bo'lsa "Bepul boshlash" o'rniga
 * "Kabinetga o'tish" ko'rsatiladi — u allaqachon ro'yxatdan o'tgan.
 */
export function HeroActions() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Skeleton className="h-13 w-44 rounded-lg" />
        <Skeleton className="h-13 w-44 rounded-lg" />
      </div>
    );
  }

  /*
    Bosishdagi va ustiga kelgandagi o'lcham SINFLAR bilan beriladi,
    CSS fayldan emas.

    Sabab: tugmaning o'z ko'rinishida allaqachon `active:scale-[0.98]`
    bor va u Tailwind qatlamida turadi. Bir xil turdagi sinf bu yerda
    ham berilsa, oxirgisi qoladi — ya'ni ziddiyat yo'q.
  */
  const motion = 'transition-transform duration-200 hover:scale-[1.02] active:scale-[0.97]';

  /*
    `shadow-none` — tugmaning o'z KO'K soyasini o'chirish uchun.

    Asosiy tugma ko'rinishida `shadow-primary/25` bor: qaymoq rangli
    tugma ostida ko'k yorug'lik paydo bo'lardi va u tabiiy palitraga
    yopishmasdi. Haqiqiy soya CSS faylda, `.hero-cta` ichida.
  */
  const flat = 'shadow-none';

  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
      <Button size="lg" asChild className={`hero-cta w-full sm:w-auto ${motion} ${flat}`}>
        <Link href={isAuthenticated ? '/dashboard' : '/auth/register'}>
          {isAuthenticated ? "Kabinetga o'tish" : 'Bepul boshlash'}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>

      <Button size="lg" variant="glass" asChild className={`hero-cta-quiet w-full sm:w-auto ${motion} ${flat}`}>
        <Link href="#modullar">Xizmatlarni ko&apos;rish</Link>
      </Button>
    </div>
  );
}
