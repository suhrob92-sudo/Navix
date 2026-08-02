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

  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Button size="lg" asChild>
        <Link href={isAuthenticated ? '/dashboard' : '/auth/register'}>
          {isAuthenticated ? "Kabinetga o'tish" : 'Bepul boshlash'}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>

      <Button size="lg" variant="glass" asChild>
        <Link href="#modullar">Xizmatlarni ko&apos;rish</Link>
      </Button>
    </div>
  );
}
