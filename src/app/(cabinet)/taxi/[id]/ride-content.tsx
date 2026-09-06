'use client';

import { Phone, Route, Star, Timer, Wallet } from 'lucide-react';
import { useCallback, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { RideMap } from '@/components/map/ride-map';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistance } from '@/config/delivery-eta';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzPhone } from '@/lib/phone';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
  RIDE_STATUS_LABEL,
  canCancelRide,
  canRateRide,
  isRideActive,
  type RideResponse,
  type RideView,
} from '@/modules/taxi/taxi.types';

/**
 * Safarni kuzatish ekrani.
 *
 * ── Nima uchun sahifa O'ZI yangilanadi ────────────────────────────────
 * Safar holati BOSHQA odam tomonidan o'zgaradi: haydovchi qabul
 * qiladi, yetib keladi, boshlaydi. Foydalanuvchi esa telefonni
 * qo'lida ushlab, ekranga qarab turadi.
 *
 * Agar sahifa o'zi yangilanmasa, u "haydovchi qidirilmoqda" deb
 * turaverardi — holbuki mashina allaqachon eshik oldida.
 *
 * ── Nima uchun 5 soniya ───────────────────────────────────────────────
 * Haydovchi joylashuvi 8 soniyada bir yuboriladi. Undan tez
 * so'rash yangi ma'lumot bermaydi, sekinroq so'rash esa xaritadagi
 * mashinani sezilarli darajada orqada qoldiradi.
 *
 * Safar tugagach so'rov TO'XTAYDI: tugagan safar o'zgarmaydi.
 */
const REFRESH_MS = 5_000;

export function RideContent({ rideId }: { rideId: string }) {
  const request = useApiClient();

  const query = useApiQuery<RideResponse>(`/api/v1/taxi/rides/${rideId}`, {
    refreshIntervalMs: REFRESH_MS,
  });

  const ride = query.data?.ride ?? null;

  const [actionError, setActionError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [askCancel, setAskCancel] = useState(false);

  const act = useCallback(
    async (path: string, body: unknown) => {
      setIsWorking(true);
      setActionError(null);

      try {
        const result = await request<RideResponse>(path, { method: 'POST', body });

        query.setData({ ride: result.ride });
      } catch (error) {
        setActionError(toUserMessage(error));
      } finally {
        setIsWorking(false);
      }
    },
    [query, request],
  );

  if (query.isLoading) {
    return (
      <>
        <AppHeader title="Safar" showBack backHref="/taxi" />
        <div className="space-y-3 px-4">
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </>
    );
  }

  if (query.error || !ride) {
    return (
      <>
        <AppHeader title="Safar" showBack backHref="/taxi" />
        <div className="px-4">
          <Alert variant="error">{query.error ? toUserMessage(query.error) : 'Safar topilmadi'}</Alert>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Safar" showBack backHref="/taxi" />

      <div className="space-y-4 px-4 pb-6">
        <section className="border-border overflow-hidden rounded-3xl border shadow-sm">
          <RideMap
            from={ride.from}
            to={ride.to}
            driver={ride.driverLocation}
            height={240}
            label={`Xarita: ${RIDE_STATUS_LABEL[ride.status]}`}
          />
        </section>

        <StatusBanner ride={ride} />

        {ride.driver ? (
          <DriverCard ride={ride} />
        ) : (
          isRideActive(ride.status) && (
            <section className="bg-card border-border rounded-3xl border p-5 text-center shadow-sm">
              <span className="bg-primary/12 text-primary mx-auto flex size-12 animate-pulse items-center justify-center rounded-2xl">
                <Timer className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-semibold">Haydovchi qidirilmoqda</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Yaqin atrofdagi haydovchilarga buyurtmangiz ko&apos;rsatildi. Odatda bu bir necha
                daqiqa oladi.
              </p>
            </section>
          )
        )}

        <RideFacts ride={ride} />

        {ride.cancelReason && (
          <Alert variant="warning">Bekor qilish sababi: {ride.cancelReason}</Alert>
        )}

        {actionError && <Alert variant="error">{actionError}</Alert>}

        {canRateRide(ride) && (
          <RateBox
            disabled={isWorking}
            onRate={(rating) => act(`/api/v1/taxi/rides/${ride.id}/rate`, { rating })}
          />
        )}

        {ride.rating !== null && (
          <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-sm">
            <Star className="fill-primary text-primary size-4" aria-hidden="true" />
            Bahoyingiz: {ride.rating} / 5
          </p>
        )}

        {canCancelRide(ride.status) && (
          <Button
            fullWidth
            size="lg"
            variant="outline"
            disabled={isWorking}
            onClick={() => setAskCancel(true)}
          >
            Safarni bekor qilish
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={askCancel}
        title="Safarni bekor qilamizmi?"
        description="To'langan pul hamyoningizga to'liq qaytariladi."
        confirmLabel="Ha, bekor qilish"
        cancelLabel="Yo'q"
        isDestructive
        onCancel={() => setAskCancel(false)}
        onConfirm={async () => {
          setAskCancel(false);
          await act(`/api/v1/taxi/rides/${ride.id}/cancel`, {});
        }}
      />
    </>
  );
}

/**
 * Holat lentasi.
 *
 * Rang holatga qarab o'zgaradi: kutish — betaraf, harakat — asosiy
 * rang, tugash — muvaffaqiyat, bekor — ogohlantirish. Odam rangdan
 * ham, matndan ham bir xil xabarni oladi.
 */
function StatusBanner({ ride }: { ride: RideView }) {
  const tone =
    ride.status === 'COMPLETED'
      ? 'bg-success/12 text-success'
      : ride.status === 'CANCELLED'
        ? 'bg-muted text-muted-foreground'
        : 'bg-primary/12 text-primary';

  return (
    <div className={cn('flex items-center justify-center rounded-2xl px-4 py-3', tone)}>
      <p className="text-sm font-semibold">{RIDE_STATUS_LABEL[ride.status]}</p>
    </div>
  );
}

/** Haydovchi kartochkasi — mashina, reyting va qo'ng'iroq tugmasi. */
function DriverCard({ ride }: { ride: RideView }) {
  const driver = ride.driver;

  if (!driver) return null;

  return (
    <section className="bg-card border-border rounded-3xl border p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="bg-primary/12 text-primary flex size-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold">
          {(driver.name ?? 'H').slice(0, 1).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{driver.name ?? 'Haydovchi'}</p>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
            {driver.rating === null ? (
              'Yangi haydovchi'
            ) : (
              <>
                <Star className="fill-primary text-primary size-3.5" aria-hidden="true" />
                {driver.rating} · {driver.ratingCount} ta baho
              </>
            )}
          </p>
        </div>

        {/*
          Qo'ng'iroq tugmasi faqat safar DAVOM etayotganda.
          Tugagach haydovchining raqami kerak emas va uni ko'rsatib
          turish — uning shaxsiy ma'lumotini keraksiz ochish.
        */}
        {isRideActive(ride.status) && (
          <a
            href={`tel:${driver.phone}`}
            aria-label={`Haydovchiga qo'ng'iroq: ${formatUzPhone(driver.phone)}`}
            className="bg-primary text-primary-foreground shadow-primary/25 flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-lg transition-transform active:scale-95"
          >
            <Phone className="size-5" aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="bg-secondary/60 mt-3 flex items-center gap-3 rounded-2xl px-3.5 py-3">
        <span className="text-muted-foreground text-xs">Mashina</span>
        <span className="ml-auto text-right">
          <span className="block text-sm font-semibold">
            {driver.carColor} {driver.carModel}
          </span>
          <span className="text-muted-foreground mt-0.5 block font-mono text-xs tracking-wider">
            {driver.plateNumber}
          </span>
        </span>
      </div>
    </section>
  );
}

/**
 * Safar raqamlari — masofa, narx, manzillar.
 *
 * Uchta ustunda: bir qarashda o'qiladi va qo'shimcha bosish
 * talab qilmaydi (namunadagi dizayndagi kabi).
 */
function RideFacts({ ride }: { ride: RideView }) {
  return (
    <section className="bg-card border-border rounded-3xl border p-4 shadow-sm">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Fact icon={Route} label="Masofa" value={formatDistance(ride.distanceKm)} />
        <Fact icon={Wallet} label="Narx" value={formatTiyin(ride.priceTiyin)} />
        <Fact icon={Timer} label="Tarif" value={ride.tariff === 'ECONOM' ? 'Ekonom' : 'Komfort'} />
      </div>

      <div className="border-border mt-4 space-y-2.5 border-t pt-3.5">
        <Place label="Qayerdan" text={ride.from.address} />
        <Place label="Qayerga" text={ride.to.address} accent />
      </div>
    </section>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Route;
  label: string;
  value: string;
}) {
  return (
    <div>
      <Icon className="text-muted-foreground mx-auto size-4" aria-hidden="true" />
      <p className="text-muted-foreground mt-1.5 text-[11px] tracking-wide uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Place({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-full',
          accent ? 'bg-primary' : 'bg-muted-foreground/50',
        )}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="text-muted-foreground block text-[11px] tracking-wide uppercase">
          {label}
        </span>
        <span className="block text-sm">{text}</span>
      </span>
    </div>
  );
}

/**
 * Baholash.
 *
 * Beshta yulduz — eng tanish shakl. Izoh maydoni ATAYLAB yo'q:
 * u ekranda joy egallaydi va odamlarning ko'pchiligi baribir
 * yozmaydi. Yulduz esa bir bosishda qo'yiladi.
 */
function RateBox({ disabled, onRate }: { disabled: boolean; onRate: (rating: number) => void }) {
  const [hovered, setHovered] = useState(0);

  return (
    <section className="bg-card border-border rounded-3xl border p-4 text-center shadow-sm">
      <p className="text-sm font-semibold">Safar qanday o&apos;tdi?</p>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            disabled={disabled}
            aria-label={`${value} yulduz`}
            onPointerEnter={() => setHovered(value)}
            onPointerLeave={() => setHovered(0)}
            onClick={() => onRate(value)}
            className="tap-target rounded-xl p-1 transition-transform active:scale-90 disabled:opacity-50"
          >
            <Star
              className={cn(
                'size-8 transition-colors',
                value <= hovered ? 'fill-primary text-primary' : 'text-muted-foreground/40',
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
