'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Container } from '@/components/ui/container';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/modules/auth/auth-context';

/**
 * Sahifani faqat tizimga kirgan foydalanuvchilarga ochadi.
 *
 * MUHIM: bu FAQAT qulaylik uchun — haqiqiy himoya har doim SERVERDA,
 * API endpointlarida (`requireAuth`) amalga oshiriladi. Brauzerdagi
 * tekshiruvni chetlab o'tish mumkin, lekin bu hech narsa bermaydi:
 * ma'lumot baribir serverdan token bilan so'raladi.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;

    // Kirgandan keyin foydalanuvchi shu sahifaga qaytishi uchun manzilni saqlaymiz.
    const next = `${window.location.pathname}${window.location.search}`;
    router.replace(`/auth/login?next=${encodeURIComponent(next)}`);
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // Yo'naltirish bajarilguncha bo'sh ekran ko'rsatamiz.
  if (!isAuthenticated) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}

/** Tekshiruv davomida ko'rsatiladigan skelet. */
function AuthLoadingScreen() {
  return (
    <Container className="py-12">
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-72" />
        <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    </Container>
  );
}
