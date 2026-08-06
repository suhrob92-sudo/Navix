'use client';

import { useAuthGate } from '@/modules/auth/auth-gate';

/**
 * Sahifani faqat tizimga kirgan foydalanuvchilarga ochadi.
 *
 * MUHIM: bu FAQAT qulaylik uchun — haqiqiy himoya har doim SERVERDA,
 * API endpointlarida (`requireAuth`) amalga oshiriladi. Brauzerdagi
 * tekshiruvni chetlab o'tish mumkin, lekin bu hech narsa bermaydi:
 * ma'lumot baribir serverdan token bilan so'raladi.
 *
 * Tekshiruv mantig'i `useAuthGate()` da — u barcha qo'riqchilar
 * uchun umumiy (sabab o'sha faylda).
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { screen } = useAuthGate();

  if (screen) return <>{screen}</>;

  return <>{children}</>;
}
