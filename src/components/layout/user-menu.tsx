'use client';

import { LayoutGrid, LogOut, MapPin, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/modules/auth/auth-context';

/** Menyudagi havolalar. */
const MENU_LINKS = [
  { href: '/dashboard', label: 'Kabinet', icon: LayoutGrid },
  { href: '/profile', label: 'Profilim', icon: User },
  { href: '/addresses', label: 'Manzillarim', icon: MapPin },
] as const;

/**
 * Yuqori paneldagi foydalanuvchi menyusi.
 *
 * Uch xil holat bo'ladi:
 *  1. Tekshirilmoqda — skelet ko'rsatiladi;
 *  2. Kirmagan — "Kirish" va "Boshlash" tugmalari;
 *  3. Kirgan — ism bilan ochiladigan menyu.
 */
export function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menyudan tashqariga bosilganda yopamiz.
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (isLoading) {
    return <Skeleton className="h-9 w-24 rounded-lg" />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/auth/login" onClick={onNavigate}>
            Kirish
          </Link>
        </Button>
        <Button variant="primary" size="sm" asChild>
          <Link href="/auth/register" onClick={onNavigate}>
            Boshlash
          </Link>
        </Button>
      </div>
    );
  }

  const displayName = user.firstName ?? user.phone;
  const initial = displayName.charAt(0).toUpperCase();

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    setIsOpen(false);
    setIsLoggingOut(false);
    onNavigate?.();
    router.push('/');
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="hover:bg-secondary/60 focus-visible:ring-ring flex items-center gap-2 rounded-lg py-1.5 pr-3 pl-1.5 text-sm font-medium transition-colors focus-visible:ring-2"
      >
        <span className="from-primary to-accent text-primary-foreground inline-flex size-8 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold">
          {initial}
        </span>
        <span className="hidden max-w-24 truncate sm:inline">{displayName}</span>
      </button>

      {isOpen && (
        <div role="menu" className="glass animate-scale-in absolute right-0 z-50 mt-2 w-56 rounded-xl p-1.5">
          <div className="border-border/60 border-b px-3 py-2.5">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="text-muted-foreground truncate text-xs">{user.phone}</p>
          </div>

          <div className="mt-1.5 space-y-0.5">
            {MENU_LINKS.map((link) => {
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate?.();
                  }}
                  className="hover:bg-secondary/60 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {isLoggingOut ? 'Chiqilmoqda...' : 'Chiqish'}
          </button>
        </div>
      )}
    </div>
  );
}
