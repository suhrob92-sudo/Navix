'use client';

import { CalendarRange, ChevronLeft, ChevronRight, Receipt, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { MonthPicker } from '@/components/finance/month-picker';
import { TransactionRow } from '@/components/wallet/transaction-row';
import { FilterChip } from '@/components/ui/filter-chip';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { isValidMonth, monthKey } from '@/modules/finance/finance.calc';
import { TRANSACTION_TYPE_FILTERS } from '@/modules/wallet/wallet.schemas';
import type { TransactionsResponse } from '@/modules/wallet/wallet.types';

const PAGE_SIZE = 20;

/**
 * Hamyon amallarining to'liq tarixi — turi va OYI bo'yicha filtrlash bilan.
 *
 * ── Oy filtri qayerdan keladi ─────────────────────────────────────────
 * Moliya markazidagi "sentabr 2026 amallari" havolasi shu ekranni
 * `?month=2026-09` bilan ochadi. Odam hisobotda ko'rgan raqamning
 * ORQASIDAGI to'lovlarni ko'rmoqchi bo'ladi va oyni qayta izlashi
 * shart emas.
 *
 * Filtr ekranning o'zida ham yoqiladi — aks holda bu yerga
 * to'g'ridan-to'g'ri kirgan odam undan foydalana olmasdi.
 */
export function WalletHistoryContent() {
  const search = useSearchParams();

  const [filter, setFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  /*
    Joriy oy BIR MARTA hisoblanadi: har chizishda `new Date()`
    chaqirilsa, yarim tunda ochiq turgan ekran o'zi sakrardi.
  */
  const [latestMonth] = useState(() => monthKey(new Date()));

  /*
    Manzildagi qiymat TEKSHIRILADI.

    Uni odam qo'lda yozishi mumkin (`?month=hello`) va o'shanda
    server 422 xato qaytarardi — ekranda esa "Tarixni yuklab
    bo'lmadi" degan tushunarsiz yozuv chiqardi.
  */
  const [month, setMonth] = useState<string | null>(() => {
    const raw = search.get('month');

    return raw && isValidMonth(raw) ? raw : null;
  });

  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), type: filter });

  if (month) query.set('month', month);

  const { data, isLoading, error } = useApiQuery<TransactionsResponse>(
    `/api/v1/wallet/transactions?${query.toString()}`,
  );

  const transactions = data?.transactions ?? [];

  /** Filtr almashganda birinchi sahifaga qaytamiz — aks holda bo'sh ro'yxat chiqadi. */
  function changeFilter(value: string) {
    setFilter(value);
    setPage(1);
  }

  /** Oy almashganda ham birinchi sahifaga qaytamiz — sabab yuqoridagidek. */
  function changeMonth(value: string | null) {
    setMonth(value);
    setPage(1);
  }

  return (
    <>
      <AppHeader title="Amallar tarixi" showBack backHref="/wallet" />

      <div className="px-4 pt-4">
        {/* Filtr tugmalari */}
        <div className="-mx-4 mb-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {TRANSACTION_TYPE_FILTERS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={filter === option.value}
              onClick={() => changeFilter(option.value)}
            />
          ))}
        </div>

        {/* Oy filtri — yoqilmagan bo'lsa faqat bitta tugma. */}
        {month === null ? (
          <button
            type="button"
            onClick={() => changeMonth(latestMonth)}
            className="tap-target border-border text-muted-foreground mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
          >
            <CalendarRange className="size-3.5" aria-hidden="true" />
            Oy bo&apos;yicha
          </button>
        ) : (
          <div className="border-border bg-card mb-4 flex items-center gap-2 rounded-xl border p-2">
            <MonthPicker value={month} latest={latestMonth} onChange={changeMonth} className="flex-1" />

            <button
              type="button"
              onClick={() => changeMonth(null)}
              aria-label="Oy filtrini olib tashlash"
              className="tap-target text-muted-foreground hover:text-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-full"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

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
                month !== null
                  ? "Bu oyda amal bo'lmagan. Boshqa oyni tanlab ko'ring."
                  : filter === 'ALL'
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
