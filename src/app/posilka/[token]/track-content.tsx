'use client';

import { Check, Package, Truck, UserCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';
import { formatUzDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { DELIVERY_STATUS_LABELS, type DeliveryStatusName } from '@/modules/courier/courier.types';
import { formatWeight, type SharedParcelView } from '@/modules/parcel/parcel.types';

/**
 * Posilkani kuzatish — KIRMASDAN.
 *
 * ── Nima uchun `useApiQuery` ishlatilmaydi ────────────────────────────
 * O'sha hook token bilan ishlaydi va kirmagan foydalanuvchida u yo'q.
 * Bu sahifa esa aynan KIRMAGAN odam uchun.
 *
 * ── Nima uchun sahifa OZ ma'lumot ko'rsatadi ──────────────────────────
 * Havolani olgan odam begona bo'lishi mumkin: u WhatsApp'da
 * yuborilgan, guruhga ko'chgan va ekran suratiga tushgan bo'lishi
 * mumkin. Telefon raqami, narx va aniq manzil YO'Q — sabab
 * `parcel.types.ts` da yozilgan.
 */

/**
 * Har necha soniyada yangilanadi.
 *
 * Taksidan (8 soniya) SEKINROQ: posilka holati soatlab
 * o'zgarmaydi va tez-tez so'rash mobil trafikni behuda sarflardi.
 */
const REFRESH_MS = 30_000;

/** Yetkazish bosqichlari — TARTIB bo'yicha. */
const STEPS: { status: DeliveryStatusName; icon: typeof Package }[] = [
  { status: 'OFFERED', icon: Package },
  { status: 'ACCEPTED', icon: UserCheck },
  { status: 'PICKED_UP', icon: Truck },
  { status: 'DELIVERED', icon: Check },
];

export function TrackContent({ token }: { token: string }) {
  const [parcel, setParcel] = useState<SharedParcelView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let stopped = false;

    async function load() {
      try {
        const result = await apiRequest<{ parcel: SharedParcelView }>(`/api/v1/parcels/track/${token}`, {});

        if (stopped) return;

        setParcel(result.parcel);
        setError(null);
      } catch {
        if (stopped) return;

        /*
          Xato matni UMUMIY: "topilmadi" deyish kalitni saralab
          topishga urinayotgan odamga foydali ma'lumot berardi.
        */
        setError("Havola ishlamayapti. U eskirgan yoki noto'g'ri bo'lishi mumkin.");
      } finally {
        if (!stopped) setIsLoading(false);
      }
    }

    void load();

    const timer = setInterval(() => void load(), REFRESH_MS);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [token]);

  const isCancelled = parcel?.status === 'CANCELLED';
  const currentStep = parcel ? STEPS.findIndex((step) => step.status === parcel.status) : -1;

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Posilkani kuzatish</h1>

      {isLoading && (
        <div className="mt-5 space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      )}

      {!isLoading && error && (
        <Alert variant="error" className="mt-5" title="Ochib bo'lmadi">
          {error}
        </Alert>
      )}

      {!isLoading && !error && parcel && (
        <>
          <div className="border-border bg-card mt-5 rounded-2xl border p-4">
            <p className="text-muted-foreground text-xs">Jo&apos;natma raqami</p>
            <p className="font-mono text-sm font-semibold">{parcel.parcelNumber}</p>

            <p className="mt-3 text-sm font-medium">
              {parcel.fromRegion} &rarr; {parcel.toRegion}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {parcel.description} &middot; {formatWeight(parcel.weightGrams)}
            </p>
          </div>

          {isCancelled ? (
            /*
              Bekor qilingan posilkada BOSQICHLAR ko'rsatilmaydi.

              Ular "yetkazilmoqda" degan yolg'on taassurot berardi.
              Sabab esa ko'rsatilmaydi: u shaxsiy izoh bo'lishi
              mumkin.
            */
            <div className="border-destructive/30 bg-destructive/5 mt-3 flex items-center gap-3 rounded-2xl border p-4">
              <X className="text-destructive size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Jo&apos;natma bekor qilingan</p>
                {parcel.cancelledAt && (
                  <p className="text-muted-foreground text-xs">{formatUzDateTime(parcel.cancelledAt)}</p>
                )}
              </div>
            </div>
          ) : (
            <ol className="border-border bg-card mt-3 rounded-2xl border p-4">
              {STEPS.map((step, index) => {
                const isDone = index <= currentStep;
                const isNow = index === currentStep;
                const Icon = step.icon;

                return (
                  <li key={step.status} className="flex gap-3">
                    {/* Chiziq va nuqta — bosqichlarni bog'laydi. */}
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'inline-flex size-8 shrink-0 items-center justify-center rounded-full',
                          isDone ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </span>

                      {index < STEPS.length - 1 && (
                        <span
                          className={cn('w-0.5 flex-1', isDone ? 'bg-primary' : 'bg-border')}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <div className={cn('pb-5', index === STEPS.length - 1 && 'pb-0')}>
                      <p className={cn('text-sm', isNow ? 'font-semibold' : 'font-medium')}>
                        {DELIVERY_STATUS_LABELS[step.status]}
                      </p>

                      {step.status === 'ACCEPTED' && isDone && parcel.courierName && (
                        <p className="text-muted-foreground text-xs">Kuryer: {parcel.courierName}</p>
                      )}

                      {step.status === 'DELIVERED' && parcel.deliveredAt && (
                        <p className="text-muted-foreground text-xs">{formatUzDateTime(parcel.deliveredAt)}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <p className="text-muted-foreground mt-4 text-center text-xs">
            Jo&apos;natildi: {formatUzDateTime(parcel.createdAt)}
          </p>
        </>
      )}
    </main>
  );
}
