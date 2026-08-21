'use client';

import { ChevronRight, Receipt } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app/app-header';
import { BalanceCard } from '@/components/wallet/balance-card';
import { TransactionRow } from '@/components/wallet/transaction-row';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import type { WalletSummary } from '@/modules/wallet/wallet.types';

/**
 * Hamyon bosh sahifasi — balans, tez amallar va oxirgi harakatlar.
 *
 * Bitta so'rov bilan hammasi olinadi: `/api/v1/wallet` javobida oxirgi
 * 5 ta amal ham bor. Telefon internetida har bir qo'shimcha so'rov
 * sezilarli kechikish demak.
 */
export function WalletContent() {
  const { data, isLoading, error } = useApiQuery<WalletSummary>('/api/v1/wallet');

  return (
    <>
      <AppHeader title="Hamyon" showBack backHref="/profile" />

      <div className="px-4 pt-4">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Hamyonni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && data && (
          <>
            {data.status === 'FROZEN' && (
              <Alert variant="warning" className="mb-4" title="Hamyon muzlatilgan">
                Amallar vaqtincha to&apos;xtatilgan. Qo&apos;llab-quvvatlash xizmatiga murojaat qiling.
              </Alert>
            )}

            <BalanceCard balance={data.balance} reserved={data.reserved} />

            <Card variant="glass" padding="none" className="animate-fade-up mt-4">
              <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Oxirgi amallar</h2>

                {data.recentTransactions.length > 0 && (
                  <Link
                    href="/wallet/history"
                    className="tap-target text-primary inline-flex items-center gap-0.5 text-sm font-medium"
                  >
                    Barchasi
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                )}
              </div>

              {data.recentTransactions.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="Hali amallar yo'q"
                  description="Hisobingizni to'ldiring — barcha to'lovlar shu yerda ko'rinadi."
                />
              ) : (
                <ul className="divide-border/60 divide-y px-4">
                  {data.recentTransactions.map((transaction) => (
                    <li key={transaction.id}>
                      <TransactionRow transaction={transaction} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </>
  );
}
