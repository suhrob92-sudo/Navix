import { Check, X } from 'lucide-react';

import { buildTimeline, sinceText, type OrderEventView } from '@/config/order-timeline';
import { formatUzDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { MarketOrderStatusName } from '@/modules/market/market.types';

/**
 * Buyurtma yo'li — sanalar bilan.
 *
 * ── Nima uchun eski ro'yxat yetmadi ───────────────────────────────────
 * Ilgari bu yerda oddiy bosqichlar ro'yxati turardi: "Qabul qilindi",
 * "Yig'ilmoqda", "Yo'lga chiqarildi". U faqat QAYSI bosqichdaligini
 * aytardi.
 *
 * Mahsulot esa kunlab yo'lda bo'ladi va xaridorning asosiy savoli
 * vaqt haqida: "uch kun oldin yo'lga chiqqan edi, hali ham
 * kelmadi". Sanasiz ro'yxat bu savolga javob bermasdi.
 *
 * ── Nima uchun CHIZIQ chiziladi ───────────────────────────────────────
 * Nuqtalarni bog'lovchi vertikal chiziq bosqichlarni bir-biriga
 * ulaydi va ular ALOHIDA voqealar emas, BITTA yo'l ekanini
 * ko'rsatadi.
 *
 * Chiziqning yonib turgan qismi "qancha yurildi" ni bir qarashda
 * aytadi — bu sonlardan tezroq o'qiladi.
 */

export interface OrderTimelineProps {
  events: readonly OrderEventView[];
  status: MarketOrderStatusName;
  /** Do'kon va'da qilgan muddat — pastdagi eslatma uchun. */
  deliveryDays?: number;
  className?: string;
}

export function OrderTimeline({ events, status, deliveryDays, className }: OrderTimelineProps) {
  const steps = buildTimeline(events, status);

  return (
    <section className={cn('bg-card border-border rounded-2xl border p-4', className)}>
      <h2 className="mb-4 text-sm font-semibold">Buyurtma yo&apos;li</h2>

      <ol className="relative">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isCancelled = step.status === 'CANCELLED';

          return (
            <li key={step.status} className={cn('relative flex gap-3', !isLast && 'pb-5')}>
              {/*
                Bog'lovchi chiziq.

                Oxirgi qadamdan keyin chizilmaydi — aks holda u
                bo'shliqqa osilib qolardi.
              */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-6 left-[11px] w-0.5',
                    'h-[calc(100%-1.5rem)]',
                    steps[index + 1].isDone
                      ? isCancelled
                        ? 'bg-destructive/40'
                        : 'bg-primary/40'
                      : 'bg-border',
                  )}
                />
              )}

              <span
                className={cn(
                  'relative z-10 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold',
                  !step.isDone && 'bg-secondary text-muted-foreground',
                  step.isDone && isCancelled && 'bg-destructive text-white',
                  step.isDone && !isCancelled && 'bg-primary text-primary-foreground',
                )}
              >
                {step.isDone ? (
                  isCancelled ? (
                    <X className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Check className="size-3.5" aria-hidden="true" />
                  )
                ) : (
                  index + 1
                )}
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    'text-sm leading-tight',
                    step.isCurrent && 'font-semibold',
                    step.isDone && !step.isCurrent && 'font-medium',
                    !step.isDone && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>

                {/*
                  Sana FAQAT yozuv bo'lsa ko'rsatiladi.

                  Eski buyurtmalarda `PACKING` bosqichining yozuvi
                  yo'q. Sanani o'ylab topish yolg'on ma'lumot
                  yozish bo'lardi.
                */}
                {step.at && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {`${formatUzDateTime(step.at, 'short')} · ${sinceText(step.at)}`}
                    {step.actor && ` · ${step.actor}`}
                  </p>
                )}

                {step.note && <p className="text-destructive mt-1 text-xs">{step.note}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {/*
        Va'da qilingan muddat faqat buyurtma YO'LDA bo'lganda
        kerak: yetkazilgandan keyin u ma'nosiz, bekor qilingandan
        keyin esa xafa qiladi.
      */}
      {deliveryDays !== undefined && status !== 'DELIVERED' && status !== 'CANCELLED' && (
        <p className="text-muted-foreground border-border/60 mt-4 border-t pt-3 text-xs">
          {`Taxminan ${deliveryDays} kunda yetkaziladi`}
        </p>
      )}
    </section>
  );
}
