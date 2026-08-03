'use client';

import { Check, CircleX, Clock, RotateCcw } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app/app-header';
import { ProviderIcon } from '@/components/payments/provider-icon';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzDateTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { PAYMENT_STATUS_LABELS, type ServicePaymentItem } from '@/modules/payment/payment.types';

/** Holatga mos ikonka va rang. */
const STATUS_STYLES = {
  COMPLETED: { icon: Check, className: 'bg-success/12 text-success' },
  PENDING: { icon: Clock, className: 'bg-secondary text-muted-foreground' },
  FAILED: { icon: CircleX, className: 'bg-destructive/12 text-destructive' },
  REFUNDED: { icon: RotateCcw, className: 'bg-secondary text-muted-foreground' },
} as const;

export interface ReceiptContentProps {
  paymentId: string;
}

/**
 * To'lov cheki.
 *
 * Nima uchun alohida sahifa: nizo chiqqanda foydalanuvchi aynan shu
 * ekranni ko'rsatadi. Shuning uchun unda chek raqami, aniq sana va
 * summa to'liq ko'rinadi — hech narsa qisqartirilmaydi.
 */
export function ReceiptContent({ paymentId }: ReceiptContentProps) {
  const { data, isLoading, error } = useApiQuery<ServicePaymentItem>(`/api/v1/payments/${paymentId}`);

  return (
    <>
      <AppHeader title="Chek" showBack backHref="/payments/history" />

      <div className="px-4 pt-4">
        {isLoading && <Skeleton className="h-96 rounded-2xl" />}

        {!isLoading && (error || !data) && (
          <Alert variant="error" title="Chekni yuklab bo'lmadi">
            {error ?? "To'lov topilmadi"}
          </Alert>
        )}

        {!isLoading && data && (
          <>
            <Card variant="glass" className="animate-fade-up text-center">
              <span
                className={`mx-auto inline-flex size-16 items-center justify-center rounded-full ${STATUS_STYLES[data.status].className}`}
              >
                {(() => {
                  const Icon = STATUS_STYLES[data.status].icon;
                  return <Icon className="size-8" aria-hidden="true" />;
                })()}
              </span>

              <p className="text-muted-foreground mt-3 text-sm">{PAYMENT_STATUS_LABELS[data.status]}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{formatTiyin(data.amount)}</p>

              {data.failureReason && (
                <Alert variant="error" className="mt-4 text-left">
                  {data.failureReason}
                </Alert>
              )}

              <div className="border-border/60 mt-6 flex items-center gap-3 border-t pt-5 text-left">
                <ProviderIcon provider={data.provider} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{data.provider.name}</p>
                  <p className="text-muted-foreground truncate text-xs">{data.provider.description}</p>
                </div>
              </div>

              <dl className="mt-5 space-y-3 text-left text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">{data.provider.accountLabel}</dt>
                  <dd className="truncate font-medium">{data.accountNumber}</dd>
                </div>

                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">Chek raqami</dt>
                  <dd className="truncate font-mono text-xs">{data.receiptNumber}</dd>
                </div>

                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">Sana va vaqt</dt>
                  <dd className="text-right">{formatUzDateTime(data.createdAt, 'long')}</dd>
                </div>

                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">To&apos;lov usuli</dt>
                  <dd>Navix hamyoni</dd>
                </div>
              </dl>
            </Card>

            <div className="mt-5 flex flex-col gap-2">
              <Button asChild>
                <Link href={`/payments/${data.provider.id}?account=${encodeURIComponent(data.accountNumber)}`}>
                  Yana to&apos;lash
                </Link>
              </Button>

              <Button variant="ghost" asChild>
                <Link href="/payments/history">Tarixga qaytish</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
