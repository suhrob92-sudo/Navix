'use client';

import { ArrowLeft, Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Logo } from '@/components/layout/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useApiQuery } from '@/hooks/use-api';
import { cn } from '@/lib/utils';

interface NotificationsResponse {
  unreadCount: number;
}

export interface AppHeaderProps {
  /** Sahifa nomi. Berilmasa logotip ko'rsatiladi (bosh sahifadagi kabi). */
  title?: string;
  /** Chapda "orqaga" tugmasi ko'rsatilsinmi (ichki sahifalar uchun). */
  showBack?: boolean;
  /** Qaysi sahifaga qaytadi. Berilmasa brauzer tarixida orqaga qaytadi. */
  backHref?: string;
  /** Orqaga bosilganda o'z amalini bajarish (masalan, formani yopish). */
  onBack?: () => void;
  className?: string;
}

/**
 * Ilovaning yuqori paneli.
 *
 * Maketdagi kabi: chapda brend yoki sahifa nomi, o'ngda mavzu tugmasi va
 * o'qilmagan xabarlar soni ko'rsatilgan qo'ng'iroq.
 */
export function AppHeader({ title, showBack = false, backHref, onBack, className }: AppHeaderProps) {
  const router = useRouter();
  /**
   * Faqat sonni olish uchun eng kichik sahifani so'raymiz.
   *
   * Har 45 soniyada yangilanadi: to'lov yoki o'tkazmadan keyin xabar
   * kelganini foydalanuvchi sahifani qayta ochmasdan ko'rishi kerak.
   * Tez-tez so'rash esa mobil trafikni behuda sarflaydi.
   */
  const { data } = useApiQuery<NotificationsResponse>('/api/v1/notifications?pageSize=1', {
    refreshIntervalMs: 45_000,
  });
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <header className={cn('glass-chrome sticky top-0 z-40 border-b', className)}>
      <div className="mx-auto flex h-15 max-w-lg items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-1">
          {showBack && (
            <button
              type="button"
              onClick={() => {
                if (onBack) onBack();
                else if (backHref) router.push(backHref);
                else router.back();
              }}
              aria-label="Orqaga"
              className="hover:bg-secondary/60 focus-visible:ring-ring -ml-2 inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
          )}

          {title ? <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1> : <Logo />}
        </div>

        <div className="flex items-center gap-0.5">
          <ThemeToggle />

          <Link
            href="/notifications"
            aria-label={unreadCount > 0 ? `Bildirishnomalar, ${unreadCount} ta o'qilmagan` : 'Bildirishnomalar'}
            className="hover:bg-secondary/60 focus-visible:ring-ring relative inline-flex size-11 items-center justify-center rounded-lg transition-colors focus-visible:ring-2"
          >
            <Bell className="size-5" aria-hidden="true" />

            {unreadCount > 0 && (
              <span
                className="bg-destructive text-destructive-foreground absolute top-2 right-2 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] leading-4 font-semibold tabular-nums"
                aria-hidden="true"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
