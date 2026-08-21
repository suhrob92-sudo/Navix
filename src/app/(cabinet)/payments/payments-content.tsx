'use client';

import { ChevronRight, Receipt, Star } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ProviderIcon } from '@/components/payments/provider-icon';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SERVICE_CATEGORIES } from '@/config/service-providers';
import { useApiQuery } from '@/hooks/use-api';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { ProvidersResponse, SavedAccountsResponse } from '@/modules/payment/payment.types';
import type { WalletSummary } from '@/modules/wallet/wallet.types';

/** Toifa tugmalari — "Hammasi" birinchi turadi. */
const CATEGORY_TABS = [{ value: 'ALL', label: 'Hammasi' }, ...SERVICE_CATEGORIES] as const;

/**
 * To'lovlar bosh sahifasi.
 *
 * Tuzilishi ataylab shunday: avval SAQLANGAN hisoblar, keyin barcha
 * xizmatlar. Kommunal to'lov har oy takrorlanadi — foydalanuvchi ko'pincha
 * o'sha-o'sha hisobni to'laydi, shuning uchun u eng yuqorida turishi kerak.
 */
export function PaymentsContent() {
  const [category, setCategory] = useState<string>('ALL');

  const wallet = useApiQuery<WalletSummary>('/api/v1/wallet');
  const saved = useApiQuery<SavedAccountsResponse>('/api/v1/payments/accounts');
  const providers = useApiQuery<ProvidersResponse>(`/api/v1/payments/providers?category=${category}`);

  const savedAccounts = saved.data?.accounts ?? [];
  const providerList = providers.data?.providers ?? [];

  return (
    <>
      <AppHeader title="To'lovlar" showBack backHref="/dashboard" />

      <div className="px-4 pt-4">
        {/* Balans — to'lashdan oldin ko'rish kerak */}
        <Link
          href="/wallet"
          className="from-primary to-accent text-primary-foreground animate-fade-up flex items-center justify-between rounded-2xl bg-gradient-to-br p-4 transition-transform active:scale-[0.99]"
        >
          <div>
            <p className="text-xs opacity-90">Hamyon balansi</p>
            {wallet.isLoading ? (
              <Skeleton className="mt-1 h-7 w-32 bg-white/20" />
            ) : (
              <p className="mt-0.5 text-xl font-semibold tabular-nums">{formatTiyin(wallet.data?.balance ?? 0)}</p>
            )}
          </div>

          <ChevronRight className="size-5 shrink-0 opacity-80" aria-hidden="true" />
        </Link>

        {/* Saqlangan hisoblar */}
        {savedAccounts.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Star className="size-4" aria-hidden="true" />
              Saqlangan hisoblar
            </h2>

            <ul className="space-y-2">
              {savedAccounts.map((account, index) => (
                <li key={account.id}>
                  <Link
                    href={`/payments/${account.provider.id}?account=${encodeURIComponent(account.accountNumber)}`}
                    className="bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-3 transition-transform active:scale-[0.99]"
                    style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
                  >
                    <ProviderIcon provider={account.provider} size="sm" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{account.label}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {account.provider.name} · {account.accountNumber}
                      </p>
                    </div>

                    <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Toifa tugmalari */}
        <div className="-mx-4 mt-6 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setCategory(tab.value)}
              aria-pressed={category === tab.value}
              className={cn(
                'inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                category === tab.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-secondary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {providers.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        )}

        {!providers.isLoading && providers.error && (
          <Alert variant="error" title="Xizmatlarni yuklab bo'lmadi">
            {providers.error}
          </Alert>
        )}

        {!providers.isLoading && !providers.error && (
          <ul className="space-y-2">
            {providerList.map((provider, index) => (
              <li key={provider.id}>
                <Link
                  href={`/payments/${provider.id}`}
                  className="bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-3 transition-transform active:scale-[0.99]"
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  <ProviderIcon provider={provider} size="sm" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{provider.name}</p>
                    {provider.description && (
                      <p className="text-muted-foreground truncate text-xs">{provider.description}</p>
                    )}
                  </div>

                  <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Tarixga o'tish */}
        <Card variant="glass" padding="none" className="animate-fade-up mt-4">
          <Link href="/payments/history" className="flex items-center gap-3 p-4">
            <span className="bg-secondary text-muted-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Receipt className="size-4.5" aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">To&apos;lovlar tarixi</span>
              <span className="text-muted-foreground block text-xs">Cheklar va holatlar</span>
            </span>

            <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          </Link>
        </Card>
      </div>
    </>
  );
}
