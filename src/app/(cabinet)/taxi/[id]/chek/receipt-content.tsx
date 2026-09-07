'use client';

import { Car, CircleX, RotateCcw, Star } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistance } from '@/config/delivery-eta';
import { TAXI_TARIFFS } from '@/config/taxi';
import { useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDateTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { rebookHref } from '@/modules/taxi/taxi.types';
import type { RideResponse, RideView } from '@/modules/taxi/taxi.types';

/**
 * Safar cheki.
 *
 * ── Nima uchun alohida sahifa ─────────────────────────────────────────
 * `payments/receipt` dagi bilan bir xil sabab: nizo chiqqanda
 * foydalanuvchi AYNAN shu ekranni ko'rsatadi yoki uning rasmini
 * yuboradi.
 *
 * Shuning uchun bu yerda hech narsa qisqartirilmaydi: safar raqami,
 * aniq sana, to'liq manzillar, masofa va summa ochiq turadi.
 *
 * ── Nima uchun safar ekranidan ALOHIDA ────────────────────────────────
 * Safar ekrani KUZATISH uchun: u o'zi yangilanadi, xarita chizadi va
 * bekor qilish tugmasi bor. Chek esa QOTIB turgan hujjat.
 *
 * Ularni birlashtirsak, tugagan safarda ham har besh soniyada
 * so'rov ketardi va ekranda ma'nosiz tugmalar qolardi.
 */
export function TaxiReceiptContent({ rideId }: { rideId: string }) {
  /*
    Chek YANGILANMAYDI: tugagan safar o'zgarmaydi.

    `refreshIntervalMs` berilmagani ataylab — bu qotib turgan hujjat.
  */
  const { data, isLoading, error } = useApiQuery<RideResponse>(`/api/v1/taxi/rides/${rideId}`);

  const ride = data?.ride ?? null;

  return (
    <>
      <AppHeader title="Chek" showBack backHref="/taxi/tarix" />

      <div className="space-y-4 px-4 pb-6">
        {isLoading && <Skeleton className="h-96 rounded-3xl" />}

        {!isLoading && (error || !ride) && (
          <Alert variant="error">{error ? toUserMessage(error) : 'Safar topilmadi'}</Alert>
        )}

        {ride && <Receipt ride={ride} />}
      </div>
    </>
  );
}

function Receipt({ ride }: { ride: RideView }) {
  const cancelled = ride.status === 'CANCELLED';

  return (
    <>
      <section className="bg-card border-border rounded-3xl border p-5 text-center shadow-sm">
        <span
          className={
            cancelled
              ? 'bg-secondary text-muted-foreground mx-auto flex size-14 items-center justify-center rounded-2xl'
              : 'bg-success/12 text-success mx-auto flex size-14 items-center justify-center rounded-2xl'
          }
        >
          {cancelled ? (
            <CircleX className="size-7" aria-hidden="true" />
          ) : (
            <Car className="size-7" aria-hidden="true" />
          )}
        </span>

        <p className="text-muted-foreground mt-3 text-sm">
          {cancelled ? 'Safar bekor qilindi' : 'Safar yakunlandi'}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{formatTiyin(ride.priceTiyin)}</p>

        {/*
          Bekor qilingan safarda pul QAYTARILGAN — buni aytmasak,
          chekdagi summa "yechilgan" deb tushunilardi.
        */}
        {cancelled && (
          <p className="text-muted-foreground mt-1 text-xs">Summa hamyoningizga qaytarildi</p>
        )}

        <dl className="border-border mt-5 space-y-3 border-t pt-4 text-left text-sm">
          <Row label="Safar raqami" value={ride.rideNumber} mono />
          <Row label="Sana va vaqt" value={formatUzDateTime(ride.createdAt, 'long')} />
          <Row label="Tarif" value={TAXI_TARIFFS[ride.tariff].label} />
          <Row label="Masofa" value={formatDistance(ride.distanceKm)} />
          <Row label="To'lov usuli" value="Navix hamyoni" />
          {ride.driver && (
            <>
              <Row label="Haydovchi" value={ride.driver.name ?? 'Haydovchi'} />
              <Row
                label="Mashina"
                value={`${ride.driver.carColor} ${ride.driver.carModel}, ${ride.driver.plateNumber}`}
              />
            </>
          )}
          {ride.rating !== null && <Row label="Bahoyingiz" value={`${ride.rating} / 5`} />}
        </dl>
      </section>

      <section className="bg-card border-border space-y-2.5 rounded-3xl border p-4 shadow-sm">
        <Place label="Qayerdan" text={ride.from.address} />
        <Place label="Qayerga" text={ride.to.address} accent />
      </section>

      {ride.cancelReason && <Alert variant="warning">Sabab: {ride.cancelReason}</Alert>}

      {/*
        ── Qayta buyurtma ────────────────────────────────────────────
        Odam bir marta borgan joyga yana boradi: ishga, uyga,
        shifokorga. Manzillarni qaytadan tanlash — o'sha ishni
        takrorlash.

        Havola manzillarni chaqirish ekraniga OLIB O'TADI, lekin
        buyurtmani O'ZI bermaydi: narx o'zgargan bo'lishi mumkin va
        odam uni ko'rib tasdiqlashi kerak.
      */}
      <Link
        href={rebookHref(ride)}
        className="bg-primary text-primary-foreground shadow-primary/25 flex h-13 w-full items-center justify-center gap-2 rounded-xl text-base font-medium shadow-lg transition-transform active:scale-[0.98]"
      >
        <RotateCcw className="size-5" aria-hidden="true" />
        Shu yo&apos;nalishga yana
      </Link>

      {ride.status === 'COMPLETED' && ride.rating === null && (
        <Link
          href={`/taxi/${ride.id}`}
          className="border-border hover:bg-secondary/50 flex h-13 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors"
        >
          <Star className="size-4" aria-hidden="true" />
          Haydovchini baholash
        </Link>
      )}
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className={mono ? 'truncate text-right font-mono text-xs' : 'text-right font-medium'}>
        {value}
      </dd>
    </div>
  );
}

function Place({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={
          accent
            ? 'bg-primary mt-1.5 size-2 shrink-0 rounded-full'
            : 'bg-muted-foreground/50 mt-1.5 size-2 shrink-0 rounded-full'
        }
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
