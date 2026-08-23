'use client';

import { Check, MapPin, MessageSquare, Store } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { OrderCourierCard } from '@/components/app/order-courier-card';
import { InlineReview } from '@/components/review/inline-review';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDateTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
  MARKET_ORDER_FLOW,
  MARKET_ORDER_STATUS_LABELS,
  MARKET_ORDER_STATUS_VARIANTS,
  isCancellable,
  type MarketOrderResponse,
} from '@/modules/market/market.types';

export interface MarketOrderDetailContentProps {
  orderId: string;
}

/**
 * Buyurtma kartochkasi — xaridor uchun.
 *
 * ── Nima uchun bosqichlar chizig'i ────────────────────────────────────
 * Ovqat 45 daqiqada keladi — odam kutib turadi. Mahsulot esa kunlab
 * yo'lda bo'ladi va foydalanuvchi "qayerda?" deb o'ylaydi. Bosqichlar
 * chizig'i "hozir qaysi bosqichdamiz" degan savolga bir qarashda
 * javob beradi.
 */
export function MarketOrderDetailContent({ orderId }: MarketOrderDetailContentProps) {
  const request = useApiClient();

  const { data, isLoading, error, setData } = useApiQuery<MarketOrderResponse>(
    `/api/v1/market/orders/${orderId}`,
    { refreshIntervalMs: 30_000 },
  );

  const [isCancelling, setIsCancelling] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const order = data?.order ?? null;

  async function cancel() {
    setIsCancelling(true);
    setActionError(null);

    try {
      const response = await request<MarketOrderResponse>(`/api/v1/market/orders/${orderId}/cancel`, {
        method: 'POST',
        body: {},
      });

      setData(response);
      setIsDialogOpen(false);
    } catch (caught) {
      setActionError(toUserMessage(caught));
      setIsDialogOpen(false);
    } finally {
      setIsCancelling(false);
    }
  }

  const currentStep = order ? MARKET_ORDER_FLOW.indexOf(order.status) : -1;

  return (
    <>
      <AppHeader title={order?.orderNumber ?? 'Buyurtma'} showBack backHref="/marketplace/orders" />

      <div className="space-y-5 px-4 pt-4 pb-4">
        {isLoading && (
          <>
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Buyurtmani yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {actionError && <Alert variant="error">{actionError}</Alert>}

        {order && (
          <>
            <div className="bg-card border-border animate-fade-up rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant={MARKET_ORDER_STATUS_VARIANTS[order.status]}>
                  {MARKET_ORDER_STATUS_LABELS[order.status]}
                </Badge>
                <p className="text-lg font-semibold tabular-nums">{formatTiyin(order.total)}</p>
              </div>

              <p className="text-muted-foreground mt-2 text-xs">{formatUzDateTime(order.createdAt, 'long')}</p>

              {order.cancelReason && (
                <p className="text-muted-foreground mt-2 text-xs">
                  {`Bekor qilish sababi: ${order.cancelReason}`}
                </p>
              )}
            </div>

            {/* Bosqichlar */}
            {order.status !== 'CANCELLED' && (
              <section className="bg-card border-border rounded-2xl border p-4">
                <ol className="space-y-3">
                  {MARKET_ORDER_FLOW.map((step, index) => {
                    const isDone = index <= currentStep;

                    return (
                      <li key={step} className="flex items-center gap-3">
                        <span
                          className={cn(
                            'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs',
                            isDone ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                          )}
                        >
                          {isDone ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                        </span>
                        <span className={cn('text-sm', isDone ? 'font-medium' : 'text-muted-foreground')}>
                          {MARKET_ORDER_STATUS_LABELS[step]}
                        </span>
                      </li>
                    );
                  })}
                </ol>

                <p className="text-muted-foreground mt-3 text-xs">
                  {`Taxminan ${order.shop.deliveryDays} kunda yetkaziladi`}
                </p>
              </section>
            )}

            {/* Tarkib */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <h2 className="text-sm font-semibold">Mahsulotlar</h2>

              <ul className="mt-3 space-y-3">
                {order.items.map((item) => (
                  <li key={item.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0">
                        <span className="text-sm font-medium tabular-nums">{`${item.quantity} × `}</span>
                        <span className="text-sm">{item.name}</span>
                      </span>
                      <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                        {formatTiyin(item.lineTotal)}
                      </span>
                    </div>

                    {/* Baho buyurtma sahifasida so'raladi — sabab `InlineReview` da. */}
                    {item.productId && (
                      <InlineReview
                        target="PRODUCT"
                        targetId={item.productId}
                        name={item.name}
                        className="mt-1"
                      />
                    )}
                  </li>
                ))}
              </ul>

              <dl className="border-border/60 mt-4 space-y-1.5 border-t pt-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <dt className="text-muted-foreground">Mahsulotlar</dt>
                  <dd className="tabular-nums">{formatTiyin(order.subtotal)}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-muted-foreground">Yetkazish</dt>
                  <dd className="tabular-nums">{formatTiyin(order.deliveryFee)}</dd>
                </div>
              </dl>
            </section>

            {/* Kuryer — topshiriq olingandan keyin paydo bo'ladi */}
            {order.courier && <OrderCourierCard courier={order.courier} />}

            {/* Do'kon va manzil */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <Link href={`/marketplace/s/${order.shop.slug}`} className="flex items-center gap-2 text-sm">
                <Store className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                {order.shop.name}
              </Link>

              <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed">
                <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {order.deliveryAddress}
              </p>

              {order.deliveryNote && (
                <p className="text-muted-foreground mt-2 flex items-start gap-2 text-xs leading-relaxed">
                  <MessageSquare className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {order.deliveryNote}
                </p>
              )}
            </section>

            {isCancellable(order.status) && (
              <>
                <Button variant="outline" fullWidth onClick={() => setIsDialogOpen(true)} disabled={isCancelling}>
                  Buyurtmani bekor qilish
                </Button>

                <p className="text-muted-foreground text-center text-xs leading-relaxed">
                  {`Bekor qilinsa ${formatTiyin(order.total)} to'liq qaytariladi.`}
                </p>
              </>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={isDialogOpen}
        title="Buyurtmani bekor qilamizmi?"
        description={
          order ? `${formatTiyin(order.total)} hamyoningizga qaytariladi. Amalni orqaga qaytarib bo'lmaydi.` : ''
        }
        confirmLabel="Bekor qilish"
        isLoading={isCancelling}
        onConfirm={cancel}
        onCancel={() => setIsDialogOpen(false)}
      />
    </>
  );
}
