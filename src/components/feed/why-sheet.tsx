'use client';

import { EyeOff, Settings2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { REASON_PRESENTATION, buildReasonText } from '@/config/feed-reasons';
import { useApiQuery } from '@/hooks/use-api';
import { dialogCancelHandler } from '@/lib/dialog';
import { POST_CATEGORY_LABELS } from '@/modules/feed/feed.types';
import type { PostReasonResponse } from '@/modules/feed/reason.types';

export interface WhySheetProps {
  postId: string;
  onClose: () => void;
  /**
   * "Bu qiziq emas" bosildi. Berilmasa tugma ko'rinmaydi.
   *
   * O'z postida berilmaydi: uni yashirishning ma'nosi yo'q.
   */
  onHide?: () => void;
}

/**
 * "Nima uchun buni ko'ryapman?"
 *
 * ── Nima uchun bu KERAK ───────────────────────────────────────────────
 * Lenta tartibi odamning xatti-harakatidan o'rganadi va bu jarayon
 * ko'rinmas. Ko'rinmas tizim esa ishonchsizlik tug'diradi: "nega
 * menga aynan shu ko'rsatilyapti?" degan savolga javob bo'lmasa,
 * odam eng yomonini o'ylaydi ("meni kuzatishyaptimi?").
 *
 * ── Nima uchun javob HAQIQIY ──────────────────────────────────────────
 * Sabab lentani tartiblaydigan AYNAN o'sha formuladan olinadi. Ya'ni
 * bu chiroyli yozuv emas — bu tizimning haqiqiy ishi.
 *
 * ── Nima uchun har javobda "nima qilsam bo'ladi" bor ──────────────────
 * "Nega?" degan savolning ortida ikkinchi savol turadi: "buni qanday
 * o'zgartiraman?" Javob faqat birinchisiga berilsa, odam baribir
 * noqulaylikda qoladi.
 */
export function WhySheet({ postId, onClose, onHide }: WhySheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const { data, isLoading, error } = useApiQuery<PostReasonResponse>(`/api/v1/posts/${postId}/why`);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const reason = data?.reason ?? null;

  const values = {
    category: reason?.category ? POST_CATEGORY_LABELS[reason.category] : null,
    author: reason?.authorName ?? null,
  };

  const primary = reason ? REASON_PRESENTATION[reason.primary] : null;
  const PrimaryIcon = primary?.icon;

  return (
    <dialog
      ref={dialogRef}
      onCancel={dialogCancelHandler(onClose)}
      className="text-foreground bg-card animate-fade-up mt-auto mb-0 w-full max-w-lg rounded-t-2xl p-5 backdrop:bg-black/50"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Nima uchun buni ko&apos;ryapman?</h2>

        <Button type="button" variant="ghost" size="icon" aria-label="Yopish" onClick={onClose}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {reason && primary && PrimaryIcon && (
        <>
          {/* Asosiy sabab — KATTA va birinchi. */}
          <div className="border-border flex items-start gap-3 rounded-2xl border p-4">
            <span className="bg-secondary text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
              <PrimaryIcon className="size-5" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{buildReasonText(primary.template, values)}</p>

              {primary.hint && (
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{primary.hint}</p>
              )}
            </div>
          </div>

          {/*
            Qo'shimcha sabablar — KICHIK va ikkitagacha.

            Beshtasini ko'rsatsak, javob ro'yxatga aylanardi va odam
            asosiy sababni topa olmasdi.
          */}
          {reason.others.length > 0 && (
            <div className="mt-3">
              <p className="text-muted-foreground mb-2 text-xs">Qo&apos;shimcha sabablar</p>

              <ul className="space-y-2">
                {reason.others.map((code) => {
                  const item = REASON_PRESENTATION[code];
                  const Icon = item.icon;

                  return (
                    <li key={code} className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                      <span>{buildReasonText(item.template, values)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/*
            Sozlamalarga HAVOLA.

            Tushuntirish o'zi yetarli emas: odam nimanidir o'zgartira
            olishi kerak, aks holda javob "shunday, chidang" degan
            ma'noni beradi.
          */}
          {/*
            "Bu qiziq emas" — javobga BERILGAN javob.

            Sabab o'qilgach, tabiiy keyingi qadam "unda boshqa
            ko'rsatma" bo'ladi. Uni menyuga qaytarib yuborsak, odam
            oynani yopib, uch nuqtani qayta topishi kerak bo'lardi.

            Tugma sozlamalar havolasidan YUQORIDA: u aniq shu postga
            tegishli, sozlamalar esa umumiy.
          */}
          {onHide && (
            <Button variant="outline" fullWidth className="mt-4" onClick={onHide}>
              <EyeOff className="size-4" aria-hidden="true" />
              Bu qiziq emas
            </Button>
          )}

          <Button variant="ghost" fullWidth className="mt-2" asChild>
            <Link href="/feed/settings/content" onClick={onClose}>
              <Settings2 className="size-4" aria-hidden="true" />
              Lenta sozlamalari
            </Link>
          </Button>
        </>
      )}
    </dialog>
  );
}
