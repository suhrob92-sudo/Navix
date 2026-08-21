'use client';

import { MapPin, Package, Phone, User } from 'lucide-react';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDateTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { DELIVERY_FLOW, DELIVERY_STATUS_LABELS, DELIVERY_STATUS_VARIANTS } from '@/modules/courier/courier.types';
import { canCancelParcel, formatWeight, type ParcelResponse } from '@/modules/parcel/parcel.types';

export interface ParcelContentProps {
  id: string;
}

/**
 * Jo'natmani kuzatish sahifasi.
 *
 * ── Nima uchun bosqichlar chizig'i ────────────────────────────────────
 * Posilka kunlab yo'lda bo'ladi. "Hozir qayerda?" degan savolga
 * javob bir qarashda ko'rinishi kerak — aks holda foydalanuvchi
 * qo'llab-quvvatlashga yozadi.
 */
export function ParcelContent({ id }: ParcelContentProps) {
  const request = useApiClient();

  /** Har 30 soniyada yangilanadi — kuryer olgani o'zi ko'rinsin. */
  const { data, isLoading, error, reload } = useApiQuery<ParcelResponse>(`/api/v1/parcels/${id}`, {
    refreshIntervalMs: 30_000,
  });

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const parcel = data?.parcel ?? null;

  async function cancel() {
    setIsCancelling(true);
    setActionError(null);

    try {
      await request(`/api/v1/parcels/${id}/cancel`, { method: 'POST', body: {} });

      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsCancelling(false);
      setIsCancelOpen(false);
    }
  }

  const currentStep = parcel ? DELIVERY_FLOW.indexOf(parcel.status) : -1;
  const isCancelled = parcel?.status === 'CANCELLED';

  return (
    <>
      <AppHeader title="Jo'natma" showBack backHref="/delivery" />

      <div className="space-y-5 px-4 pt-4">
        {isLoading && (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Jo'natmani yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {actionError && <Alert variant="error">{actionError}</Alert>}

        {parcel && (
          <>
            <section className="bg-card border-border animate-fade-up rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm">{parcel.parcelNumber}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{formatUzDateTime(parcel.createdAt)}</p>
                </div>

                <Badge variant={DELIVERY_STATUS_VARIANTS[parcel.status]}>
                  {DELIVERY_STATUS_LABELS[parcel.status]}
                </Badge>
              </div>

              <p className="mt-3 text-xl font-semibold tabular-nums">{formatTiyin(parcel.priceTiyin)}</p>
            </section>

            {/* Bosqichlar */}
            {!isCancelled && (
              <section className="bg-card border-border rounded-2xl border p-4">
                <ol className="space-y-3">
                  {DELIVERY_FLOW.map((step, index) => {
                    const isDone = index <= currentStep;

                    return (
                      <li key={step} className="flex items-center gap-3">
                        <span
                          className={cn(
                            'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                            isDone ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                          )}
                        >
                          {index + 1}
                        </span>
                        <span className={cn('text-sm', isDone ? 'font-medium' : 'text-muted-foreground')}>
                          {DELIVERY_STATUS_LABELS[step]}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {isCancelled && (
              <Alert variant="warning" title="Bekor qilindi">
                {parcel.cancelReason ?? "Jo'natma bekor qilindi va pul hamyoningizga qaytarildi."}
              </Alert>
            )}

            {/* Yo'nalish */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <h2 className="text-sm font-semibold">Yo&apos;nalish</h2>

              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">Qayerdan</p>
                    <p className="text-sm">{`${parcel.fromRegion}, ${parcel.fromAddress}`}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">Qayerga</p>
                    <p className="text-sm">{`${parcel.toRegion}, ${parcel.toAddress}`}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Posilka va qabul qiluvchi */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <div className="flex items-start gap-2">
                <Package className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p className="text-sm">{`${parcel.description} · ${formatWeight(parcel.weightGrams)}`}</p>
              </div>

              <div className="border-border/60 mt-3 flex items-start gap-2 border-t pt-3">
                <User className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{parcel.recipientName}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {formatUzPhone(parcel.recipientPhone)}
                  </p>
                </div>
              </div>
            </section>

            {/* Kuryer */}
            {parcel.courier && (
              <section className="bg-card border-border rounded-2xl border p-4">
                <h2 className="text-sm font-semibold">Kuryer</h2>

                <a
                  href={`tel:${parcel.courier.phone}`}
                  className="bg-secondary/60 mt-3 flex items-center gap-2 rounded-xl p-3 text-sm font-medium tabular-nums transition-transform active:scale-[0.99]"
                >
                  <Phone className="size-4 shrink-0" aria-hidden="true" />
                  {parcel.courier.name ? `${parcel.courier.name} · ` : ''}
                  {formatUzPhone(parcel.courier.phone)}
                </a>
              </section>
            )}

            {canCancelParcel(parcel.status) && (
              <Button variant="outline" fullWidth onClick={() => setIsCancelOpen(true)} disabled={isCancelling}>
                Bekor qilish va pulni qaytarish
              </Button>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={isCancelOpen}
        title="Jo'natmani bekor qilish"
        description="Jo'natma bekor qilinadi va to'langan pul hamyoningizga to'liq qaytariladi."
        confirmLabel="Bekor qilaman"
        isDestructive
        isLoading={isCancelling}
        onConfirm={() => {
          void cancel();
        }}
        onCancel={() => setIsCancelOpen(false)}
      />
    </>
  );
}
