'use client';

import { Car, MapPin, ShieldCheck } from 'lucide-react';

import { RideMap } from '@/components/map/ride-map';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import { RIDE_STATUS_LABEL, isRideActive, type SharedRideView } from '@/modules/taxi/taxi.types';

/**
 * Ulashilgan safarni kuzatish — KIRMASDAN.
 *
 * ── Nima uchun `useApiQuery` ishlatilmaydi ────────────────────────────
 * O'sha hook token bilan ishlaydi va kirmagan foydalanuvchida u yo'q.
 * Bu sahifa esa aynan KIRMAGAN odam uchun: safarni kuzatayotgan
 * qarindosh ilovadan foydalanmasligi mumkin.
 *
 * Shuning uchun so'rov to'g'ridan-to'g'ri yuboriladi.
 *
 * ── Nima uchun sahifa OZ ma'lumot ko'rsatadi ──────────────────────────
 * Havolani olgan odam begona. Unga faqat kuzatish uchun zarur narsa
 * ko'rsatiladi: mashina, yo'l va harakat. Telefon raqami, narx va
 * yo'lovchining ismi YO'Q — sabab `taxi.types.ts` da yozilgan.
 */

/** Har necha soniyada yangilanadi. */
const REFRESH_MS = 8_000;

export function ShareContent({ token }: { token: string }) {
  const [ride, setRide] = useState<SharedRideView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /*
    So'rov intervalda takrorlanadi.

    `useApiQuery` dagi `refreshIntervalMs` bilan bir xil g'oya, lekin
    tokensiz: bu sahifa kirmagan odam uchun.
  */
  useEffect(() => {
    let stopped = false;

    async function load() {
      try {
        const result = await apiRequest<{ ride: SharedRideView }>(`/api/v1/taxi/share/${token}`, {});

        if (stopped) return;

        setRide(result.ride);
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

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <header className="mb-5 flex items-center gap-2.5">
        <span className="bg-primary/12 text-primary flex size-10 shrink-0 items-center justify-center rounded-2xl">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-base font-bold">Navix — safarni kuzatish</h1>
          <p className="text-muted-foreground text-xs">Havola egasi sizga ruxsat bergan</p>
        </div>
      </header>

      {isLoading && <Skeleton className="h-72 rounded-3xl" />}

      {error && <Alert variant="error">{error}</Alert>}

      {ride && (
        <div className="space-y-4">
          <section className="border-border overflow-hidden rounded-3xl border shadow-sm">
            <RideMap
              from={ride.from}
              to={ride.to}
              driver={ride.driverLocation}
              height={260}
              label={`Xarita: ${RIDE_STATUS_LABEL[ride.status]}`}
            />
          </section>

          <div
            className={
              isRideActive(ride.status)
                ? 'bg-primary/12 text-primary rounded-2xl px-4 py-3 text-center text-sm font-semibold'
                : 'bg-success/12 text-success rounded-2xl px-4 py-3 text-center text-sm font-semibold'
            }
          >
            {RIDE_STATUS_LABEL[ride.status]}
          </div>

          {ride.driver && (
            <section className="bg-card border-border rounded-3xl border p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="bg-secondary text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl">
                  <Car className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{ride.driver.name ?? 'Haydovchi'}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {ride.driver.carColor} {ride.driver.carModel} ·{' '}
                    <span className="font-mono tracking-wider">{ride.driver.plateNumber}</span>
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="bg-card border-border space-y-2.5 rounded-3xl border p-4 shadow-sm">
            <Place label="Qayerdan" text={ride.from.address} />
            <Place label="Qayerga" text={ride.to.address} accent />
          </section>

          {!isRideActive(ride.status) && (
            <p className="text-muted-foreground text-center text-xs leading-relaxed">
              Safar yakunlandi — joylashuv kuzatuvi to&apos;xtatildi.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

function Place({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <MapPin
        className={accent ? 'text-primary mt-0.5 size-4 shrink-0' : 'text-muted-foreground mt-0.5 size-4 shrink-0'}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="text-muted-foreground block text-[11px] tracking-wide uppercase">{label}</span>
        <span className="block text-sm">{text}</span>
      </span>
    </div>
  );
}
