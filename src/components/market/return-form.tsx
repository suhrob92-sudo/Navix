'use client';

import { useMemo, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { QuantityStepper } from '@/components/market/quantity-stepper';
import {
  RETURN_COMMENT_MAX_LENGTH,
  RETURN_REASONS,
  calculateRefund,
  refundsDeliveryFee,
  type ReturnReasonName,
} from '@/config/order-return';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { MarketOrderItemView } from '@/modules/market/market.types';

/**
 * Qaytarish so'rovi oynasi.
 *
 * ── Nima uchun summa DARHOL ko'rsatiladi ──────────────────────────────
 * Xaridor "Yuborish" tugmasini bosishdan OLDIN qancha pul
 * qaytishini bilishi kerak.
 *
 * Aks holda u so'rov yuborib, kutib o'tirardi va oxirida
 * kutilmagan raqamni ko'rardi — bu ishonchni yo'qotadigan eng
 * tez yo'l.
 *
 * Hisob `calculateRefund` bilan qilinadi — server ham AYNAN
 * shu funksiyani ishlatadi, ya'ni ikki xil natija chiqishi
 * mumkin emas.
 */

export interface ReturnFormProps {
  items: readonly MarketOrderItemView[];
  /** Yetkazish haqi TIYINDA. */
  deliveryFee: number;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (input: {
    reason: ReturnReasonName;
    comment?: string;
    items: { orderItemId: string; quantity: number }[];
  }) => void;
  onCancel: () => void;
}

export function ReturnForm({
  items,
  deliveryFee,
  isSubmitting,
  error,
  onSubmit,
  onCancel,
}: ReturnFormProps) {
  const [reason, setReason] = useState<ReturnReasonName>('DAMAGED');
  const [comment, setComment] = useState('');

  /**
   * Har bir qator uchun QAYTARILADIGAN son.
   *
   * Boshida NOL: odam nimani qaytarayotganini o'zi tanlashi kerak.
   * Hammasini oldindan belgilab qo'ysak, u e'tibor bermay
   * yuborib, keyin "men faqat bittasini demoqchi edim" derdi.
   */
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const selected = useMemo(
    () =>
      items
        .map((item) => ({ item, quantity: quantities[item.id] ?? 0 }))
        .filter((row) => row.quantity > 0),
    [items, quantities],
  );

  const orderedTotal = items.reduce((sum, item) => sum + item.quantity, 0);
  const selectedTotal = selected.reduce((sum, row) => sum + row.quantity, 0);

  const isFullReturn = selectedTotal > 0 && selectedTotal === orderedTotal;

  const refund = calculateRefund(
    selected.map((row) => ({ unitPrice: row.item.unitPrice, quantity: row.quantity })),
    { deliveryFee, reason, isFullReturn },
  );

  const withDelivery = refundsDeliveryFee(reason, isFullReturn);

  return (
    <section className="bg-card border-border animate-slide-up rounded-2xl border p-4">
      <h2 className="text-sm font-semibold">Mahsulotni qaytarish</h2>

      {/* ── Nimani qaytarish ── */}
      <p className="text-muted-foreground mt-3 mb-2 text-xs">Nimani qaytarasiz?</p>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="border-border flex items-center gap-3 rounded-xl border p-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm">{item.name}</p>

              {item.variantLabel && (
                <p className="text-muted-foreground text-xs">{item.variantLabel}</p>
              )}

              <p className="text-muted-foreground text-xs tabular-nums">
                {`${formatTiyin(item.unitPrice)} · ${item.quantity} ta olingan`}
              </p>
            </div>

            <QuantityStepper
              value={quantities[item.id] ?? 0}
              max={item.quantity}
              onChange={(next) => setQuantities((current) => ({ ...current, [item.id]: next }))}
              label={item.name}
            />
          </li>
        ))}
      </ul>

      {/* ── Sabab ── */}
      <p className="text-muted-foreground mt-4 mb-2 text-xs">Sababi</p>

      <div className="flex flex-wrap gap-2">
        {RETURN_REASONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setReason(option.value)}
            aria-pressed={reason === option.value}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              reason === option.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-secondary',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Field
        id="return-comment"
        label="Qo'shimcha izoh"
        hint="Ixtiyoriy"
        className="mt-4"
      >
        <Textarea
          id="return-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Masalan: qutisi ezilgan, ekranida chizilgan joyi bor"
          maxLength={RETURN_COMMENT_MAX_LENGTH}
          rows={3}
        />
      </Field>

      {/* ── Qancha qaytadi ── */}
      <div className="bg-secondary/60 mt-4 rounded-xl p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Qaytariladi</span>
          <span className="text-base font-semibold tabular-nums">{formatTiyin(refund)}</span>
        </div>

        {/*
          Yetkazish haqi qoidasi OLDINDAN aytiladi.

          Uni yashirib, keyin kam pul qaytarish aldash bo'lardi.
        */}
        <p className="text-muted-foreground mt-1 text-xs">
          {withDelivery
            ? "Yetkazish haqi ham qaytariladi — mahsulotdagi nuqson uchun."
            : "Yetkazish haqi qaytarilmaydi."}
        </p>
      </div>

      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}

      <div className="mt-4 flex gap-2">
        <Button variant="outline" fullWidth onClick={onCancel} disabled={isSubmitting}>
          Bekor qilish
        </Button>

        <Button
          fullWidth
          /* Hech narsa tanlanmasa yuborib bo'lmaydi. */
          disabled={selected.length === 0}
          isLoading={isSubmitting}
          loadingText="Yuborilmoqda..."
          onClick={() =>
            onSubmit({
              reason,
              ...(comment.trim() ? { comment: comment.trim() } : {}),
              items: selected.map((row) => ({
                orderItemId: row.item.id,
                quantity: row.quantity,
              })),
            })
          }
        >
          So&apos;rov yuborish
        </Button>
      </div>
    </section>
  );
}
