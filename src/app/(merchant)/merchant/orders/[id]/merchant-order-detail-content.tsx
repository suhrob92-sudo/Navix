'use client';

import { MapPin, MessageSquare, Phone, User } from 'lucide-react';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDateTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import {
  FOOD_ORDER_ACTION_LABELS,
  FOOD_ORDER_STATUS_LABELS,
  FOOD_ORDER_STATUS_VARIANTS,
  canRestaurantReject,
  nextStatus,
} from '@/modules/food/food.types';
import type { MerchantOrderResponse } from '@/modules/merchant/merchant.types';
import { RequireMerchant } from '@/modules/merchant/require-merchant';

export interface MerchantOrderDetailContentProps {
  orderId: string;
}

/**
 * Buyurtma kartochkasi — restoran xodimi uchun.
 *
 * ── Nima uchun bitta katta tugma ──────────────────────────────────────
 * Oshxonada telefon bilan ishlash qulay emas: qo'l band, ekran yog'li.
 * Shuning uchun KEYINGI qadam bitta katta tugma bilan bajariladi va
 * uning yozuvi holatga qarab o'zgaradi ("Tayyorlashni boshlash" →
 * "Yo'lga chiqarish" → "Yetkazildi deb belgilash").
 *
 * Qaysi tugma ko'rinishi `food.types.ts` dagi holatlar avtomatidan
 * kelib chiqadi — server ham xuddi shu jadvalga tayanadi.
 */
export function MerchantOrderDetailContent({ orderId }: MerchantOrderDetailContentProps) {
  return (
    <RequireMerchant>
      <OrderBody orderId={orderId} />
    </RequireMerchant>
  );
}

function OrderBody({ orderId }: MerchantOrderDetailContentProps) {
  const request = useApiClient();

  const { data, isLoading, error, setData } = useApiQuery<MerchantOrderResponse>(
    `/api/v1/merchant/orders/${orderId}`,
    { refreshIntervalMs: 25_000 },
  );

  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const order = data?.order ?? null;
  const next = order ? nextStatus(order.status) : null;
  const canReject = order ? canRestaurantReject(order.status) : false;

  async function changeStatus(status: string, reason?: string) {
    setIsSaving(true);
    setActionError(null);

    try {
      const response = await request<MerchantOrderResponse>(`/api/v1/merchant/orders/${orderId}`, {
        method: 'PATCH',
        body: { status, ...(reason ? { reason } : {}) },
      });

      setData(response);
      setIsAdvanceOpen(false);
      setIsRejectOpen(false);
      setRejectReason('');
    } catch (caught) {
      setActionError(toUserMessage(caught));
      setIsAdvanceOpen(false);
      setIsRejectOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <AdminHeader title={order?.orderNumber ?? 'Buyurtma'} showBack backHref="/merchant/orders" />

      <div className="space-y-5 px-4 pt-4">
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
            {/* Holat va summa */}
            <div className="bg-card border-border animate-fade-up rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant={FOOD_ORDER_STATUS_VARIANTS[order.status]}>
                  {FOOD_ORDER_STATUS_LABELS[order.status]}
                </Badge>
                <p className="text-lg font-semibold tabular-nums">{formatTiyin(order.total)}</p>
              </div>

              <p className="text-muted-foreground mt-2 text-xs">
                {`${order.restaurant.name} · ${formatUzDateTime(order.createdAt, 'long')}`}
              </p>

              {order.cancelReason && (
                <p className="text-muted-foreground mt-2 text-xs">{`Bekor qilish sababi: ${order.cancelReason}`}</p>
              )}
            </div>

            {/* Tarkib — oshxona uchun eng muhim blok */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <h2 className="text-sm font-semibold">Tayyorlanadigan taomlar</h2>

              <ul className="mt-3 space-y-3">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      {/* Son KATTA yozilgan: oshxonada eng ko'p shu o'qiladi */}
                      <span className="text-base font-semibold tabular-nums">{`${item.quantity} × `}</span>
                      <span className="text-base">{item.name}</span>
                    </span>
                    <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                      {formatTiyin(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="border-border/60 mt-4 space-y-1.5 border-t pt-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <dt className="text-muted-foreground">Taomlar</dt>
                  <dd className="tabular-nums">{formatTiyin(order.subtotal)}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-muted-foreground">Yetkazish</dt>
                  <dd className="tabular-nums">{formatTiyin(order.deliveryFee)}</dd>
                </div>
              </dl>
            </section>

            {/* Mijoz va manzil */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <h2 className="text-sm font-semibold">Yetkazish</h2>

              <p className="mt-3 flex items-start gap-2 text-sm">
                <User className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {order.customer.name ?? 'Ism kiritilmagan'}
              </p>

              <a
                href={`tel:${order.customer.phone}`}
                className="text-primary mt-2 flex items-start gap-2 text-sm font-medium"
              >
                <Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {formatUzPhone(order.customer.phone)}
              </a>

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

            {/* Amallar */}
            {(next || canReject) && (
              <div className="space-y-2">
                {next && (
                  <Button fullWidth size="lg" onClick={() => setIsAdvanceOpen(true)} disabled={isSaving}>
                    {FOOD_ORDER_ACTION_LABELS[order.status]}
                  </Button>
                )}

                {canReject && (
                  <Button variant="outline" fullWidth onClick={() => setIsRejectOpen(true)} disabled={isSaving}>
                    Buyurtmani rad etish
                  </Button>
                )}

                {canReject && (
                  <p className="text-muted-foreground pt-1 text-center text-xs leading-relaxed">
                    {`Rad etilsa, mijozga ${formatTiyin(order.total)} to'liq qaytariladi.`}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={isAdvanceOpen}
        title={order ? FOOD_ORDER_ACTION_LABELS[order.status] : ''}
        description={
          next ? `Buyurtma "${FOOD_ORDER_STATUS_LABELS[next]}" holatiga o'tadi va mijozga xabar yuboriladi.` : ''
        }
        confirmLabel="Tasdiqlash"
        isLoading={isSaving}
        onConfirm={() => next && changeStatus(next)}
        onCancel={() => setIsAdvanceOpen(false)}
      />

      {/*
        Rad etish — pul harakati, shuning uchun sabab so'raladi.
        Mijoz nima uchun bekor bo'lganini bilishi kerak.
      */}
      {isRejectOpen && order && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="bg-card animate-scale-in w-full max-w-md rounded-2xl p-6">
            <h2 className="text-lg font-semibold tracking-tight">Buyurtmani rad etish</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {`${formatTiyin(order.total)} mijozning hamyoniga qaytariladi. Amalni bekor qilib bo'lmaydi.`}
            </p>

            <Field id="reject-reason" label="Sabab" required hint="Mijoz shu matnni ko'radi" className="mt-4">
              <Input
                id="reject-reason"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Masalan: mahsulot tugadi"
                disabled={isSaving}
              />
            </Field>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsRejectOpen(false)} disabled={isSaving}>
                Bekor qilish
              </Button>
              <Button
                variant="destructive"
                isLoading={isSaving}
                loadingText="Yuborilmoqda..."
                disabled={rejectReason.trim().length < 3}
                onClick={() => changeStatus('CANCELLED', rejectReason.trim())}
              >
                Rad etish
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
