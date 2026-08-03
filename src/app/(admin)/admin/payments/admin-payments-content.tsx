'use client';

import { Receipt, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { RefundDialog } from '@/components/admin/refund-dialog';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Permission, hasPermission } from '@/config/rbac';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzDateTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import type { AdminPaymentItem, AdminPaymentsResponse } from '@/modules/admin/admin.types';
import { RequireAdmin } from '@/modules/admin/require-admin';
import { useAuth } from '@/modules/auth/auth-context';
import { PAYMENT_STATUS_LABELS } from '@/modules/payment/payment.types';

const STATUS_TABS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'COMPLETED', label: "To'langan" },
  { value: 'REFUNDED', label: 'Qaytarilgan' },
  { value: 'FAILED', label: 'Bajarilmadi' },
] as const;

const STATUS_VARIANTS = {
  COMPLETED: 'success',
  REFUNDED: 'warning',
  FAILED: 'destructive',
  PENDING: 'secondary',
} as const;

const PAGE_SIZE = 20;

/**
 * Xizmat to'lovlari — qo'llab-quvvatlash uchun asosiy ish ekrani.
 *
 * Murojaat oqimi: mijoz qo'ng'iroq qiladi → xodim chek raqami yoki
 * telefon bo'yicha qidiradi → to'lovni topadi → kerak bo'lsa pulni
 * qaytaradi. Hammasi bitta ekranda.
 */
export function AdminPaymentsContent() {
  return (
    <RequireAdmin permission={Permission.PLATFORM_TRANSACTION_READ}>
      {/*
        `useSearchParams` Next.js'da Suspense chegarasini talab qiladi —
        aks holda butun sahifa server tomonda chizilmaydi.
      */}
      <Suspense fallback={<PaymentsSkeleton />}>
        <PaymentsBody />
      </Suspense>
    </RequireAdmin>
  );
}

function PaymentsSkeleton() {
  return (
    <div className="space-y-2 px-4 pt-20">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

function PaymentsBody() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canRefund = hasPermission(user?.roles ?? [], Permission.PAYMENT_REFUND);

  // Foydalanuvchi sahifasidan "?search=+998..." bilan kelish mumkin.
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [refundTarget, setRefundTarget] = useState<AdminPaymentItem | null>(null);

  const query = new URLSearchParams({ status, page: String(page), pageSize: String(PAGE_SIZE) });
  if (search.trim()) query.set('search', search.trim());

  const { data, isLoading, error, reload } = useApiQuery<AdminPaymentsResponse>(
    `/api/v1/admin/payments?${query.toString()}`,
  );

  const payments = data?.payments ?? [];
  const hasMore = payments.length === PAGE_SIZE;

  return (
    <>
      <AdminHeader title="To'lovlar" showBack backHref="/admin" />

      <div className="px-4 pt-4">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Chek raqami, hisob yoki telefon"
          aria-label="To'lov qidirish"
        />

        <div className="-mx-4 mt-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              aria-pressed={status === tab.value}
              className={cn(
                'shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                status === tab.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-secondary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="To'lovlarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && payments.length === 0 && (
          <EmptyState
            icon={Receipt}
            title="To'lov topilmadi"
            description="Chek raqami yoki telefon raqamini tekshirib qayta urinib ko'ring."
          />
        )}

        <ul className="space-y-2">
          {payments.map((payment, index) => (
            <li
              key={payment.id}
              className="bg-card border-border animate-fade-up rounded-2xl border p-3"
              style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{payment.providerName}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {`${payment.accountNumber} · ${payment.receiptNumber}`}
                  </p>

                  <Link
                    href={`/admin/users/${payment.user.id}`}
                    className="text-muted-foreground hover:text-foreground truncate text-xs transition-colors"
                  >
                    {payment.user.fullName ?? formatUzPhone(payment.user.phone)}
                  </Link>
                </div>

                <p className="shrink-0 text-sm font-semibold tabular-nums">{formatTiyin(payment.amount)}</p>
              </div>

              <div className="border-border/60 mt-2.5 flex flex-wrap items-center gap-2 border-t pt-2.5">
                <Badge variant={STATUS_VARIANTS[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status]}</Badge>

                <span className="text-muted-foreground text-xs">{formatUzDateTime(payment.createdAt)}</span>

                {canRefund && payment.status === 'COMPLETED' && (
                  <Button variant="outline" size="sm" className="ml-auto" onClick={() => setRefundTarget(payment)}>
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Qaytarish
                  </Button>
                )}
              </div>

              {payment.refundedAt && (
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  {`Qaytarilgan: ${formatUzDateTime(payment.refundedAt)}`}
                  {payment.refundReason ? ` — ${payment.refundReason}` : ''}
                </p>
              )}
            </li>
          ))}
        </ul>

        {!isLoading && !error && (page > 1 || hasMore) && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
              Oldingi
            </Button>

            <span className="text-muted-foreground text-sm tabular-nums">{`${page}-sahifa`}</span>

            <Button variant="outline" disabled={!hasMore} onClick={() => setPage((current) => current + 1)}>
              Keyingi
            </Button>
          </div>
        )}
      </div>

      <RefundDialog
        payment={refundTarget}
        onClose={() => setRefundTarget(null)}
        onRefunded={() => {
          setRefundTarget(null);
          reload();
        }}
      />
    </>
  );
}
