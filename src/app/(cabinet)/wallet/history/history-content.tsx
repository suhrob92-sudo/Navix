'use client';

import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { TransactionRow } from '@/components/wallet/transaction-row';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { TRANSACTION_TYPE_FILTERS } from '@/modules/wallet/wallet.schemas';
import type { TransactionsResponse } from '@/modules/wallet/wallet.types';

const PAGE_SIZE = 20;

/** Hamyon amallarining to'liq tarixi — turi bo'yicha filtrlash bilan. */
export function WalletHistoryContent() {
  const [filter, setFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useApiQuery<TransactionsResponse>(
    `/api/v1/wallet/transactions?page=${page}&pageSize=${PAGE_SIZE}&type=${filter}`,
  );

  const transactions = data?.transactions ?? [];

  /** Filtr almashganda birinchi sahifaga qaytamiz — aks holda bo'sh ro'yxat chiqadi. */
  function changeFilter(value: string) {
    setFilter(value);
    setPage(1);
  }

  return (
    <>
      <AppHeader title="Amallar tarixi" showBack backHref="/wallet" />

      <div className="px-4 pt-4">
        {/* Filtr tugmalari */}
        <div className="-mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {TRANSACTION_TYPE_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => changeFilter(option.value)}
              aria-pressed={filter === option.value}
              className={cn(
                'shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                filter === option.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-secondary',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-16 rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Tarixni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && transactions.length === 0 && (
          <Card variant="glass" padding="none" className="animate-fade-up">
            <EmptyState
              icon={Receipt}
              title="Amallar topilmadi"
              description={
                filter === 'ALL'
                  ? "Hisobingizni to'ldiring — barcha to'lovlar shu yerda ko'rinadi."
                  : "Bu turdagi amallar hali yo'q. Boshqa filtrni tanlab ko'ring."
              }
            />
          </Card>
        )}

        {!isLoading && !error && transactions.length > 0 && (
          <>
            <Card variant="glass" padding="none" className="animate-fade-up">
              <ul className="divide-border/60 divide-y px-4">
                {transactions.map((transaction) => (
                  <li key={transaction.id}>
                    <TransactionRow transaction={transaction} />
                  </li>
                ))}
              </ul>
            </Card>

            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                <ChevronLeft aria-hidden="true" />
                Oldingi
              </Button>

              <span className="text-muted-foreground text-sm tabular-nums">{page}-sahifa</span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => current + 1)}
                disabled={transactions.length < PAGE_SIZE}
              >
                Keyingi
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
