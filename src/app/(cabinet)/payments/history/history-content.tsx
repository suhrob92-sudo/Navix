'use client';

import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ProviderIcon } from '@/components/payments/provider-icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzDateTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import { PAYMENT_STATUS_LABELS, type PaymentsResponse } from '@/modules/payment/payment.types';

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'COMPLETED', label: "To'langan" },
  { value: 'PENDING', label: 'Kutilmoqda' },
  { value: 'FAILED', label: 'Bajarilmadi' },
] as const;

/** To'lovlar tarixi — chekka o'tish bilan. */
export function PaymentHistoryContent() {
  const [status, setStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useApiQuery<PaymentsResponse>(
    `/api/v1/payments?page=${page}&pageSize=${PAGE_SIZE}&status=${status}`,
  );

  const payments = data?.payments ?? [];

  function changeStatus(value: string) {
    setStatus(value);
    setPage(1);
  }

  return (
    <>
      <AppHeader title="To'lovlar tarixi" showBack backHref="/payments" />

      <div className="px-4 pt-4">
        <div className="-mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => changeStatus(option.value)}
              aria-pressed={status === option.value}
              className={cn(
                'inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                status === option.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-secondary',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-18 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Tarixni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && payments.length === 0 && (
          <Card variant="glass" padding="none" className="animate-fade-up">
            <EmptyState
              icon={Receipt}
              title="To'lovlar topilmadi"
              description={
                status === 'ALL'
                  ? "Birinchi to'lovingizni qiling — u shu yerda saqlanadi."
                  : "Bu holatdagi to'lovlar yo'q. Boshqa filtrni tanlab ko'ring."
              }
            />
          </Card>
        )}

        {!isLoading && !error && payments.length > 0 && (
          <>
            <ul className="space-y-2">
              {payments.map((payment, index) => (
                <li key={payment.id}>
                  <Link
                    href={`/payments/receipt/${payment.id}`}
                    className="bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-3 transition-transform active:scale-[0.99]"
                    style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  >
                    <ProviderIcon provider={payment.provider} size="sm" />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{payment.provider.name}</p>
                        {payment.status !== 'COMPLETED' && (
                          <Badge variant={payment.status === 'FAILED' ? 'destructive' : 'secondary'}>
                            {PAYMENT_STATUS_LABELS[payment.status]}
                          </Badge>
                        )}
                      </div>

                      <p className="text-muted-foreground truncate text-xs">
                        {payment.accountNumber} · {formatUzDateTime(payment.createdAt)}
                      </p>
                    </div>

                    <p
                      className={cn(
                        'shrink-0 text-sm font-semibold tabular-nums',
                        payment.status === 'FAILED' && 'text-muted-foreground line-through',
                      )}
                    >
                      −{formatTiyin(payment.amount)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

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
                disabled={payments.length < PAGE_SIZE}
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
