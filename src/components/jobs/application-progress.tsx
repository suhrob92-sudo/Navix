'use client';

import { Check, Clock, X } from 'lucide-react';

import { buildApplicationTimeline, waitingText, type ApplicationTimes } from '@/config/application-timeline';
import { formatUzDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';

/**
 * Ariza qayerda — bosqichma-bosqich.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Ilgari faqat holat yorlig'i turardi: "Yuborildi". Nomzodning
 * savoli esa boshqacha: "qachon yuborgandim, ko'rishdimi?".
 *
 * Javobsiz kutish uzoq tuyuladi. Nomzod har kuni arizani qayta ochib
 * qaraydi, keyin kompaniyaga qo'ng'iroq qiladi — ikkalasi ham
 * foydasiz.
 *
 * ── Nima uchun KUTISH MUDDATI ham aytiladi ────────────────────────────
 * Eng og'ir holat — javob umuman kelmasligi. Ko'p platformalar buni
 * yashiradi va ariza abadiy "Yuborildi" bo'lib qoladi.
 *
 * "Yuborilganiga 12 kun bo'ldi" degan yozuv esa nomzodga qaror
 * qabul qilishga yordam beradi: u boshqa joyga ariza yuboradi.
 */

export interface ApplicationProgressProps {
  application: ApplicationTimes;
  className?: string;
}

export function ApplicationProgress({ application, className }: ApplicationProgressProps) {
  const steps = buildApplicationTimeline(application);
  const waiting = waitingText(application);

  return (
    <div className={className}>
      <ol className="space-y-2">
        {steps.map((step) => {
          const isBad = step.status === 'REJECTED' || step.status === 'WITHDRAWN';

          return (
            <li key={step.status} className="flex items-start gap-2.5">
              <span
                className={cn(
                  'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  isBad
                    ? 'border-muted-foreground/40 bg-muted-foreground/20 text-muted-foreground'
                    : step.isDone
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border',
                )}
                aria-hidden="true"
              >
                {isBad ? <X className="size-3" /> : step.isDone ? <Check className="size-3" /> : null}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-xs',
                    step.isCurrent ? 'font-semibold' : step.isDone ? '' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>

                {/*
                  ── Vaqt YO'Q bo'lsa bo'sh qoladi ──────────────────
                  Ish beruvchi arizani ochmasdan turib taklif qilishi
                  mumkin — o'shanda "Ko'rildi" bosqichining vaqti
                  yo'q. Taxminiy vaqt yozish yolg'on bo'lardi.
                */}
                {step.at && (
                  <span className="text-muted-foreground mt-0.5 block text-[0.6875rem] tabular-nums">
                    {formatUzDateTime(step.at)}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      {waiting && (
        <p className="text-muted-foreground mt-2.5 flex items-center gap-1.5 text-xs">
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          {waiting}
        </p>
      )}
    </div>
  );
}
