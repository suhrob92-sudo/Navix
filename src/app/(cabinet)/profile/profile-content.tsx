'use client';

import {
  Bell,
  ChevronRight,
  ClipboardList,
  LogOut,
  MapPin,
  Settings,
  ShieldCheck,
  Smartphone,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzPhone } from '@/lib/phone';
import { formatUZS } from '@/lib/utils';
import { useAuth } from '@/modules/auth/auth-context';

export interface ProfileResponse {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: string;
  phoneVerified: string | null;
  createdAt: string;
  roles: string[];
  preferences: {
    dateOfBirth: string | null;
    language: string;
    theme: string;
    timezone: string;
    marketingOptIn: boolean;
  };
}

/** Profil menyusi — pastki panelga sig'magan bo'limlar. */
const MENU_ITEMS: { href: string; label: string; description: string; icon: LucideIcon }[] = [
  {
    href: '/orders',
    label: 'Mening buyurtmalarim',
    description: 'Barcha modullardagi buyurtmalar',
    icon: ClipboardList,
  },
  { href: '/addresses', label: 'Manzillarim', description: 'Uy, ish va boshqa manzillar', icon: MapPin },
  { href: '/notifications', label: 'Bildirishnomalar', description: 'Kelgan xabarlar', icon: Bell },
  { href: '/devices', label: 'Qurilmalarim', description: 'Tizimga kirgan qurilmalar', icon: Smartphone },
  { href: '/security', label: 'Xavfsizlik', description: 'Parol va himoya', icon: ShieldCheck },
  {
    href: '/profile/settings',
    label: 'Sozlamalar',
    description: "Til, mavzu va shaxsiy ma'lumotlar",
    icon: Settings,
  },
];

/** Profil sahifasi — maketdagi kabi menyu ko'rinishida. */
export function ProfileContent() {
  const router = useRouter();
  const { logout } = useAuth();
  const { data, isLoading, error } = useApiQuery<ProfileResponse>('/api/v1/profile');

  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    router.push('/');
  }

  const fullName = data ? [data.firstName, data.lastName].filter(Boolean).join(' ') || null : null;

  return (
    <>
      <AppHeader title="Profil" />

      <div className="space-y-5 px-4 pt-4">
        {error && (
          <Alert variant="error" title="Ma'lumotni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {/* Foydalanuvchi kartochkasi — maketdagi gradientli blok */}
        <div className="from-primary to-accent relative overflow-hidden rounded-2xl bg-gradient-to-br p-5">
          <span
            className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-white/10"
            aria-hidden="true"
          />

          <div className="relative flex items-center gap-4">
            {isLoading ? (
              <Skeleton className="size-16 rounded-full" />
            ) : (
              <Avatar
                src={data?.avatarUrl}
                name={fullName ?? data?.phone}
                size="lg"
                className="ring-2 ring-white/40"
              />
            )}

            <div className="min-w-0 flex-1">
              {isLoading ? (
                <>
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="mt-2 h-4 w-28" />
                </>
              ) : (
                <>
                  <p className="text-primary-foreground truncate text-lg font-semibold">
                    {fullName ?? 'Ism kiritilmagan'}
                  </p>
                  <p className="text-primary-foreground/80 truncate text-sm">
                    {data ? formatUzPhone(data.phone) : ''}
                  </p>
                  {data?.phoneVerified && (
                    <span className="text-primary-foreground mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
                      <ShieldCheck className="size-3" aria-hidden="true" />
                      Tasdiqlangan
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hamyon */}
        <Link
          href="/wallet"
          className="bg-card border-border flex items-center gap-3 rounded-2xl border p-4 transition-transform active:scale-[0.99]"
        >
          <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400 inline-flex size-11 items-center justify-center rounded-xl">
            <Wallet className="size-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs">Mening hamyonim</p>
            <p className="text-lg font-semibold tabular-nums">{formatUZS(0)}</p>
          </div>

          <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
        </Link>

        {/* Menyu */}
        <nav className="bg-card border-border divide-border divide-y overflow-hidden rounded-2xl border">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="hover:bg-secondary/50 flex items-center gap-3 px-4 py-3.5 transition-colors"
              >
                <span className="bg-secondary text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.label}</span>
                  <span className="text-muted-foreground block truncate text-xs">{item.description}</span>
                </span>

                <ChevronRight className="text-muted-foreground size-4.5 shrink-0" aria-hidden="true" />
              </Link>
            );
          })}
        </nav>

        {/* Chiqish */}
        <button
          type="button"
          onClick={() => setIsLogoutOpen(true)}
          className="text-destructive bg-card border-border hover:bg-destructive/5 flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-medium transition-colors"
        >
          <LogOut className="size-4.5" aria-hidden="true" />
          Chiqish
        </button>
      </div>

      <ConfirmDialog
        open={isLogoutOpen}
        title="Chiqmoqchimisiz?"
        description="Hisobingizdan chiqasiz. Qaytadan kirish uchun telefon raqami va parol kerak bo'ladi."
        confirmLabel="Chiqish"
        isDestructive
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutOpen(false)}
      />
    </>
  );
}
