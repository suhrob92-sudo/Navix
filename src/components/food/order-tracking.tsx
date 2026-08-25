'use client';

import { Check, Clock, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { estimateArrival } from '@/config/delivery-eta';
import { buildFoodTimeline, minutesInStep, stepDurationText } from '@/config/food-timeline';
import { formatUzTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { FoodOrderView } from '@/modules/food/food.types';

/**
 * Buyurtma kuzatuvi — bosqichlar, xarita va yetib kelish vaqti.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Ilgari bu yerda faqat bosqichlar ro'yxati turardi va u ikkita
 * savolga javob bermasdi: "qachon bo'ldi?" va "yana qancha
 * kutaman?".
 *
 * Javobsiz kutish uzoq tuyuladi. Odam har besh daqiqada sahifani
 * yangilaydi, keyin restoranga qo'ng'iroq qiladi — ikkalasi ham
 * keraksiz ish va ikkalasi ham asabiylashtiradi.
 *
 * ── Xarita bu yerda EMAS ──────────────────────────────────────────────
 * Kuryerning xaritasi `order-courier-card.tsx` ichida: u kuryer
 * haqidagi ma'lumot va Marketplace sahifasida ham xuddi shunday
 * ishlaydi.
 */

/** Vaqt shuncha soniyada bir qayta hisoblanadi. */
const TICK_MS = 30_000;

export interface OrderTrackingProps {
  order: FoodOrderView;
  className?: string;
}

export function OrderTracking({ order, className }: OrderTrackingProps) {
  /*
    Vaqt o'tishi bilan "yana 12 daqiqa" o'zgarishi kerak. Sahifa
    ma'lumotni 20 soniyada bir yangilaydi, lekin holat o'zgarmasa
    ham vaqt o'zgaradi — shuning uchun o'z sanog'i bor.
  */
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);

    return () => clearInterval(timer);
  }, []);

  const steps = buildFoodTimeline(order);
  const duration = stepDurationText(minutesInStep(steps, now));

  const courier = order.courier;

  const eta = estimateArrival({
    status: order.status,
    deliveryMinutes: order.restaurant.deliveryMinutes,
    createdAt: order.createdAt,
    courierPoint: courier?.point ?? null,
    courierReportedAt: courier?.reportedAt ?? null,
    destination: order.destination,
    now,
  });

  return (
    <section className={cn('bg-card border-border rounded-2xl border p-4', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">Buyurtma holati</h2>

        {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{eta.text}</span>
        )}
      </div>

      {duration && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
        <p className="text-muted-foreground mt-1 text-xs">{duration}</p>
      )}

      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.status} className="flex items-start gap-3">
            <span
              className={cn(
                'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                step.status === 'CANCELLED'
                  ? 'border-destructive bg-destructive text-white'
                  : step.isDone
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border',
              )}
              aria-hidden="true"
            >
              {step.status === 'CANCELLED' ? (
                <X className="size-3.5" />
              ) : step.isDone ? (
                <Check className="size-3.5" />
              ) : null}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block text-sm',
                  step.isCurrent ? 'font-semibold' : step.isDone ? '' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>

              {/*
                ── Vaqt YO'Q bo'lsa nima bo'ladi ────────────────────
                Bo'sh qoladi. Bu ustunlar 48-bosqichda qo'shilgan va
                eski buyurtmalarda vaqt hech qayerda yozilmagan.

                Taxminiy vaqt yozish mumkin edi, lekin uning
                haqiqatdan farqini hech kim sezmasdi — bu esa eng
                yomon turdagi xato.
              */}
              {step.at && (
                <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs tabular-nums">
                  <Clock className="size-3" aria-hidden="true" />
                  {formatUzTime(step.at)}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
