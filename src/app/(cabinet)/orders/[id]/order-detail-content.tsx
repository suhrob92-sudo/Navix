'use client';

import { Check, MapPin, MessageSquare, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { OrderCourierCard } from '@/components/app/order-courier-card';
import { ServiceIcon } from '@/components/app/service-icon';
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
  FOOD_ORDER_FLOW,
  FOOD_ORDER_STATUS_LABELS,
  FOOD_ORDER_STATUS_VARIANTS,
  isCancellable,
  type FoodOrderResponse,
  type FoodOrderStatusName,
} from '@/modules/food/food.types';

export interface OrderDetailContentProps {
  orderId: string;
}

/**
 * Bitta buyurtma: holat, tarkib va bekor qilish.
 *
 * Faol buyurtma har 20 soniyada yangilanadi — foydalanuvchi ovqat
 * qayerdaligini kuzatib turadi.
 */
export function OrderDetailContent({ orderId }: OrderDetailContentProps) {
  const request = useApiClient();

  const { data, isLoading, error, setData } = useApiQuery<FoodOrderResponse>(`/api/v1/food/orders/${orderId}`, {
    refreshIntervalMs: 20_000,
  });

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const order = data?.order ?? null;

  async function cancel() {
    setIsCancelling(true);
    setActionError(null);

    try {
      const response = await request<FoodOrderResponse>(`/api/v1/food/orders/${orderId}/cancel`, {
        method: 'POST',
        body: {},
      });

      setData(response);
      setIsCancelOpen(false);
    } catch (caught) {
      setActionError(toUserMessage(caught));
      setIsCancelOpen(false);
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <>
      <AppHeader title="Buyurtma" showBack backHref="/orders" />

      <div className="space-y-5 px-4 pt-4">
        {isLoading && (
          <>
            <Skeleton className="h-28 rounded-2xl" />
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
            {/* Sarlavha */}
            <div className="bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-4">
              <ServiceIcon icon={UtensilsCrossed} color={order.restaurant.color} size="lg" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{order.restaurant.name}</p>
                <p className="text-muted-foreground truncate text-xs">{order.orderNumber}</p>
                <Badge variant={FOOD_ORDER_STATUS_VARIANTS[order.status]} className="mt-2">
                  {FOOD_ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </div>
            </div>

            {/* Holat chizig'i */}
            {order.status === 'CANCELLED' ? (
              <Alert variant="warning" title="Buyurtma bekor qilindi">
                {`${formatTiyin(order.total)} hamyoningizga qaytarildi.`}
                {order.cancelReason ? ` Sabab: ${order.cancelReason}.` : ''}
              </Alert>
            ) : (
              <OrderProgress status={order.status} deliveryMinutes={order.restaurant.deliveryMinutes} />
            )}

            {/* Tarkib */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <h2 className="text-sm font-semibold">Buyurtma tarkibi</h2>

              <ul className="mt-3 space-y-2.5">
                {order.items.map((item) => (
                  <li key={item.id} className="text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate">{item.name}</span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {`${formatTiyin(item.unitPrice)} × ${item.quantity}`}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums">{formatTiyin(item.lineTotal)}</span>
                    </div>

                    {/*
                      Baho aynan SHU YERDA so'raladi: odam taomni
                      yegandan keyin uni menyudan qidirib topib
                      baho qo'yishga bormaydi.

                      Menyudan o'chirilgan taomga (`menuItemId`
                      bo'sh) baho qo'yib bo'lmaydi.
                    */}
                    {item.menuItemId && (
                      <InlineReview
                        target="MENU_ITEM"
                        targetId={item.menuItemId}
                        name={item.name}
                        className="mt-1"
                      />
                    )}
                  </li>
                ))}
              </ul>

              <dl className="border-border/60 mt-4 space-y-2 border-t pt-3 text-sm">
                <Row label="Taomlar" value={formatTiyin(order.subtotal)} />
                <Row label="Yetkazish" value={formatTiyin(order.deliveryFee)} />
                <div className="flex items-baseline justify-between text-base font-semibold">
                  <dt>Jami</dt>
                  <dd className="tabular-nums">{formatTiyin(order.total)}</dd>
                </div>
              </dl>
            </section>

            {/* Kuryer — topshiriq olingandan keyin paydo bo'ladi */}
            {order.courier && <OrderCourierCard courier={order.courier} />}

            {/* Manzil */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <MapPin className="size-4" aria-hidden="true" />
                Yetkazish manzili
              </h2>

              <p className="mt-2 text-sm leading-relaxed">{order.deliveryAddress}</p>

              {order.deliveryNote && (
                <p className="text-muted-foreground mt-2 flex items-start gap-1.5 text-xs leading-relaxed">
                  <MessageSquare className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {order.deliveryNote}
                </p>
              )}

              <p className="text-muted-foreground mt-3 text-xs">
                {`Buyurtma berilgan: ${formatUzDateTime(order.createdAt, 'long')}`}
              </p>
            </section>

            {/* Bekor qilish */}
            {isCancellable(order.status) && (
              <div>
                <Button variant="outline" fullWidth onClick={() => setIsCancelOpen(true)}>
                  Buyurtmani bekor qilish
                </Button>
                <p className="text-muted-foreground mt-2 text-center text-xs leading-relaxed">
                  Oshxona tayyorlashni boshlagunicha bekor qilish mumkin — pul to&apos;liq qaytariladi.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={isCancelOpen}
        title="Buyurtmani bekor qilamizmi?"
        description={
          order
            ? `${order.restaurant.name} buyurtmasi bekor qilinadi va ${formatTiyin(order.total)} hamyoningizga qaytariladi.`
            : ''
        }
        confirmLabel="Ha, bekor qilish"
        cancelLabel="Yo'q"
        isDestructive
        isLoading={isCancelling}
        onConfirm={cancel}
        onCancel={() => setIsCancelOpen(false)}
      />
    </>
  );
}

/**
 * Buyurtma qayerda — bosqichma-bosqich.
 *
 * Nima uchun kerak: ovqat kutayotgan odam eng ko'p "qachon keladi?"
 * deb o'ylaydi. Aniq bosqich ko'rsatilsa, u qo'llab-quvvatlashga
 * yozmaydi va sahifani qayta-qayta yangilamaydi.
 */
function OrderProgress({ status, deliveryMinutes }: { status: FoodOrderStatusName; deliveryMinutes: number }) {
  const currentIndex = FOOD_ORDER_FLOW.indexOf(status);

  return (
    <section className="bg-card border-border rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Buyurtma holati</h2>
        {status !== 'DELIVERED' && (
          <span className="text-muted-foreground text-xs">{`~${deliveryMinutes} daqiqa`}</span>
        )}
      </div>

      <ol className="mt-4 space-y-3">
        {FOOD_ORDER_FLOW.map((step, index) => {
          const isDone = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li key={step} className="flex items-center gap-3">
              <span
                className={cn(
                  'inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  isDone ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                )}
                aria-hidden="true"
              >
                {isDone && <Check className="size-3.5" />}
              </span>

              <span className={cn('text-sm', isCurrent ? 'font-semibold' : isDone ? '' : 'text-muted-foreground')}>
                {FOOD_ORDER_STATUS_LABELS[step]}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
