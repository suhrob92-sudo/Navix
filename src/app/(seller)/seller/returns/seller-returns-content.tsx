'use client';

import { PackageOpen } from 'lucide-react';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterChip } from '@/components/ui/filter-chip';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RETURN_REASON_LABELS,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_VARIANTS,
} from '@/config/order-return';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatRelativeUz } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { RequireSeller } from '@/modules/seller/require-seller';
import type { ReturnRequestView, ReturnsResponse } from '@/modules/market/return.types';

const FILTERS = [
  { id: 'PENDING', label: "Ko'rilmagan" },
  { id: 'APPROVED', label: 'Qabul qilingan' },
  { id: 'REJECTED', label: 'Rad etilgan' },
  { id: 'ALL', label: 'Barchasi' },
] as const;

/**
 * Do'konga kelgan qaytarish so'rovlari.
 *
 * ── Nima uchun "ko'rilmagan" BIRINCHI ─────────────────────────────────
 * Sotuvchining ishi aynan javob kutayotgan so'rovlar bilan.
 * Yakunlanganlari tarix uchun kerak, lekin ular birinchi
 * ochilganda ko'rinmasligi kerak.
 */
export function SellerReturnsContent() {
  return (
    <RequireSeller>
      <ReturnsBody />
    </RequireSeller>
  );
}

function ReturnsBody() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('PENDING');

  const { data, isLoading, error, setData } = useApiQuery<ReturnsResponse>(
    filter === 'ALL' ? '/api/v1/seller/returns' : `/api/v1/seller/returns?status=${filter}`,
  );

  const requests = data?.requests ?? [];

  return (
    <>
      <AdminHeader title="Qaytarish so'rovlari" showBack backHref="/seller" />

      <div className="px-4 pt-4 pb-4">
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((option) => (
            <FilterChip
              key={option.id}
              label={option.label}
              active={filter === option.id}
              onClick={() => setFilter(option.id)}
            />
          ))}
        </div>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && requests.length === 0 && (
          <EmptyState
            icon={PackageOpen}
            title="So'rov yo'q"
            description={
              filter === 'PENDING'
                ? "Javob kutayotgan so'rov yo'q. Hammasi hal qilingan."
                : "Bu bo'limda hozircha so'rov yo'q."
            }
          />
        )}

        <ul className="space-y-3">
          {requests.map((request) => (
            <ReturnCard
              key={request.id}
              request={request}
              onDecided={(updated) =>
                setData({
                  requests: requests.map((row) => (row.id === updated.id ? updated : row)),
                })
              }
            />
          ))}
        </ul>
      </div>
    </>
  );
}

function ReturnCard({
  request,
  onDecided,
}: {
  request: ReturnRequestView;
  onDecided: (updated: ReturnRequestView) => void;
}) {
  const client = useApiClient();

  const [note, setNote] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Rad etish sababini so'rash uchun ochiladi. */
  const [isRejecting, setIsRejecting] = useState(false);

  async function decide(approve: boolean) {
    setIsBusy(true);
    setError(null);

    try {
      const response = await client<{ request: ReturnRequestView }>(
        `/api/v1/seller/returns/${request.id}`,
        {
          method: 'PATCH',
          body: { approve, ...(note.trim() ? { note: note.trim() } : {}) },
        },
      );

      onDecided(response.request);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsBusy(false);
    }
  }

  const isPending = request.status === 'PENDING';

  return (
    <li className="bg-card border-border rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{request.orderNumber}</p>
          <p className="text-muted-foreground text-xs">
            {`${request.customerName ?? 'Xaridor'} · ${formatRelativeUz(request.createdAt)}`}
          </p>
        </div>

        <Badge variant={RETURN_STATUS_VARIANTS[request.status]}>
          {RETURN_STATUS_LABELS[request.status]}
        </Badge>
      </div>

      <p className="mt-3 text-sm font-medium">{RETURN_REASON_LABELS[request.reason]}</p>

      {request.comment && (
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{request.comment}</p>
      )}

      <ul className="mt-3 space-y-1.5">
        {request.items.map((item) => (
          <li key={item.orderItemId} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="tabular-nums">{`${item.quantity} × `}</span>
              {item.name}
              {item.variantLabel && (
                <span className="text-muted-foreground block text-xs">{item.variantLabel}</span>
              )}
            </span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {formatTiyin(item.unitPrice * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-border/60 mt-3 flex items-baseline justify-between border-t pt-3">
        <span className="text-sm font-medium">Qaytariladi</span>
        <span className="text-base font-semibold tabular-nums">{formatTiyin(request.amount)}</span>
      </div>

      {request.includesDeliveryFee && (
        <p className="text-muted-foreground mt-1 text-xs">Yetkazish haqi ham kiritilgan.</p>
      )}

      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}

      {isPending && (
        <>
          {/*
            ── Zaxira haqida ESLATMA ──────────────────────────────
            Qaytarilgan mahsulot avtomatik ravishda sotuvga
            qaytarilmaydi: uning holatini faqat sotuvchi ko'rib
            baholay oladi.

            Buzilgan telefonni jimgina sotuvga qaytarish keyingi
            xaridorga o'sha buzuq telefonni jo'natish bo'lardi.
          */}
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Tasdiqlasangiz pul darhol xaridorga qaytadi. Mahsulot zaxirasini
            o&apos;zingiz qo&apos;shasiz — uning holatini faqat siz ko&apos;rasiz.
          </p>

          {isRejecting && (
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Rad etish sababi"
              maxLength={255}
              className="mt-3"
              aria-label="Rad etish sababi"
            />
          )}

          <div className="mt-3 flex gap-2">
            {isRejecting ? (
              <>
                <Button
                  variant="outline"
                  fullWidth
                  disabled={isBusy}
                  onClick={() => {
                    setIsRejecting(false);
                    setNote('');
                  }}
                >
                  Orqaga
                </Button>

                <Button
                  variant="destructive"
                  fullWidth
                  /* Sababsiz rad etib bo'lmaydi — server ham buni talab qiladi. */
                  disabled={note.trim().length === 0}
                  isLoading={isBusy}
                  onClick={() => decide(false)}
                >
                  Rad etish
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" fullWidth disabled={isBusy} onClick={() => setIsRejecting(true)}>
                  Rad etish
                </Button>

                <Button fullWidth isLoading={isBusy} loadingText="Qaytarilmoqda..." onClick={() => decide(true)}>
                  Tasdiqlash
                </Button>
              </>
            )}
          </div>
        </>
      )}

      {!isPending && request.decisionNote && (
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          <span className="font-medium">Javobingiz: </span>
          {request.decisionNote}
        </p>
      )}
    </li>
  );
}
