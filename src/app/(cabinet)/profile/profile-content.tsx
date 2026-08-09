'use client';

import {
  Bike,
  Briefcase,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  Store,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PROFILE_MENU } from '@/config/app-nav';
import { Permission, hasPermission } from '@/config/rbac';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzPhone } from '@/lib/phone';
import { formatTiyin } from '@/lib/money';
import { useAuth } from '@/modules/auth/auth-context';
import type { WalletSummary } from '@/modules/wallet/wallet.types';

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
  username: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  gender: string | null;
  messagePrivacy: string;
  preferences: {
    dateOfBirth: string | null;
    language: string;
    theme: string;
    timezone: string;
    marketingOptIn: boolean;
  };
}

/** Profil sahifasi — maketdagi kabi menyu ko'rinishida. */
export function ProfileContent() {
  const router = useRouter();
  const { logout, user } = useAuth();

  /**
   * Admin panel havolasi faqat ruxsati borlarga ko'rinadi.
   *
   * Rollar kirish tokenidan olinadi, ya'ni qo'shimcha so'rov kerak emas.
   * Bu — qulaylik: havolani yashirish himoya emas, haqiqiy tekshiruv
   * serverda (`requirePermission`).
   */
  const isAdmin = hasPermission(user?.roles ?? [], Permission.PLATFORM_ADMIN_ACCESS);
  const isMerchant = hasPermission(user?.roles ?? [], Permission.MERCHANT_DASHBOARD_ACCESS);
  const isSeller = hasPermission(user?.roles ?? [], Permission.SELLER_DASHBOARD_ACCESS);
  const isCourier = hasPermission(user?.roles ?? [], Permission.COURIER_DASHBOARD_ACCESS);
  const isEmployer = hasPermission(user?.roles ?? [], Permission.EMPLOYER_DASHBOARD_ACCESS);

  const { data, isLoading, error } = useApiQuery<ProfileResponse>('/api/v1/profile');
  const wallet = useApiQuery<WalletSummary>('/api/v1/wallet');

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
                  {/*
                    Ommaviy profilga havola.
                    Bu YAGONA joy: foydalanuvchi o'zini boshqalar
                    qanday ko'rishini shu yerdan ochadi.
                  */}
                  {data?.username && (
                    <Link
                      href={`/u/${data.username}`}
                      className="text-primary-foreground/90 mt-1 inline-flex items-center gap-1 text-sm hover:underline"
                    >
                      {`@${data.username}`}
                      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                    </Link>
                  )}
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
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400">
            <Wallet className="size-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs">Mening hamyonim</p>

            {wallet.isLoading ? (
              <Skeleton className="mt-1 h-6 w-28" />
            ) : (
              <p className="text-lg font-semibold tabular-nums">{formatTiyin(wallet.data?.balance ?? 0)}</p>
            )}
          </div>

          <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
        </Link>

        {/* Admin panel — faqat ruxsati borlarga */}
        {isAdmin && (
          <Link
            href="/admin"
            className="bg-card border-border flex items-center gap-3 rounded-2xl border p-4 transition-transform active:scale-[0.99]"
          >
            <span className="bg-primary/10 text-primary inline-flex size-11 items-center justify-center rounded-xl">
              <LayoutGrid className="size-5" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Admin panel</p>
              <p className="text-muted-foreground text-xs">Xizmatlar, foydalanuvchilar va statistika</p>
            </div>

            <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
          </Link>
        )}

        {/* Restoran kabineti — faqat restoran egalariga */}
        {isMerchant && (
          <Link
            href="/merchant"
            className="bg-card border-border flex items-center gap-3 rounded-2xl border p-4 transition-transform active:scale-[0.99]"
          >
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-400/15 dark:text-orange-400">
              <Store className="size-5" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Restoran kabineti</p>
              <p className="text-muted-foreground text-xs">Buyurtmalar, menyu va tushum</p>
            </div>

            <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
          </Link>
        )}

        {/* Sotuvchi kabineti — faqat do'kon egalariga */}
        {isSeller && (
          <Link
            href="/seller"
            className="bg-card border-border flex items-center gap-3 rounded-2xl border p-4 transition-transform active:scale-[0.99]"
          >
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-400">
              <ShoppingBag className="size-5" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Sotuvchi kabineti</p>
              <p className="text-muted-foreground text-xs">Buyurtmalar, ombor va tushum</p>
            </div>

            <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
          </Link>
        )}

        {/* Kuryer kabineti — faqat kuryerlarga */}
        {isCourier && (
          <Link
            href="/courier"
            className="bg-card border-border flex items-center gap-3 rounded-2xl border p-4 transition-transform active:scale-[0.99]"
          >
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400">
              <Bike className="size-5" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Kuryer kabineti</p>
              <p className="text-muted-foreground text-xs">Topshiriqlar va kunlik daromad</p>
            </div>

            <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
          </Link>
        )}

        {/* Ish beruvchi kabineti — faqat kompaniya egalariga */}
        {isEmployer && (
          <Link
            href="/employer"
            className="bg-card border-border flex items-center gap-3 rounded-2xl border p-4 transition-transform active:scale-[0.99]"
          >
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-400/15 dark:text-sky-400">
              <Briefcase className="size-5" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Ish beruvchi kabineti</p>
              <p className="text-muted-foreground text-xs">E&apos;lonlar va nomzodlar</p>
            </div>

            <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
          </Link>
        )}

        {/* Menyu */}
        <nav className="bg-card border-border divide-border divide-y overflow-hidden rounded-2xl border">
          {PROFILE_MENU.map((item) => {
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
