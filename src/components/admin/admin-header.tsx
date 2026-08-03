'use client';

import { ArrowLeft, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';

export interface AdminHeaderProps {
  title: string;
  /** Chapda "orqaga" tugmasi (ichki sahifalar uchun). */
  showBack?: boolean;
  backHref?: string;
  /** O'ng tomondagi qo'shimcha amal (masalan "Qo'shish" tugmasi). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Admin panelning yuqori paneli.
 *
 * `AppHeader` dan farqi: bu yerda bildirishnomalar qo'ng'irog'i yo'q
 * (admin ishlayotganda shaxsiy xabarlar chalg'itadi), lekin ilovaga
 * qaytish tugmasi bor — admin ham oddiy foydalanuvchi.
 */
export function AdminHeader({ title, showBack = false, backHref, action, className }: AdminHeaderProps) {
  const router = useRouter();

  return (
    <header className={cn('glass-chrome sticky top-0 z-40 border-b', className)}>
      <div className="mx-auto flex h-15 max-w-lg items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-1">
          {showBack && (
            <button
              type="button"
              onClick={() => (backHref ? router.push(backHref) : router.back())}
              aria-label="Orqaga"
              className="hover:bg-secondary/60 focus-visible:ring-ring -ml-2 inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
          )}

          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        </div>

        <div className="flex items-center gap-0.5">
          {action}
          <ThemeToggle />

          <Link
            href="/dashboard"
            aria-label="Ilovaga qaytish"
            title="Ilovaga qaytish"
            className="hover:bg-secondary/60 focus-visible:ring-ring inline-flex size-11 items-center justify-center rounded-lg transition-colors focus-visible:ring-2"
          >
            <LogOut className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
