'use client';

import { ChevronRight, Car } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistance } from '@/config/delivery-eta';
import { useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatRelativeUz } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import {
  RIDE_STATUS_LABEL,
  isRideActive,
  type RideView,
  type RidesResponse,
  type TaxiRideStatusName,
} from '@/modules/taxi/taxi.types';

/**
 * Safarlar tarixi.
 *
 * ── Nima uchun alohida sahifa ─────────────────────────────────────────
 * Chaqirish ekranida faqat oxirgi to'rtta manzil ko'rinadi va u
 * yetarli: odam u yerga qaytadan borish uchun keladi.
 *
 * Tarix esa boshqa savolga javob beradi: "o'tgan oyda taksiga qancha
 * ketdi?", "o'sha safar qanchaga tushdi?". Uni chaqirish ekraniga
 * qo'shsak, eng ko'p ishlatiladigan ekran uzun ro'yxat ostida qolib
 * ketardi.
 */

/** Holat rangi — bir qarashda tushunish uchun. */
function statusVariant(status: TaxiRideStatusName) {
  if (status === 'COMPLETED') return 'success' as const;
  if (status === 'CANCELLED') return 'secondary' as const;

  return 'default' as const;
}

export function TaxiHistoryContent() {
  const query = useApiQuery<RidesResponse>('/api/v1/taxi/rides?pageSize=50');

  const rides = query.data?.rides ?? [];

  return (
    <>
      <AppHeader title="Safarlar tarixi" showBack backHref="/taxi" />

      <div className="space-y-3 px-4 pb-6">
        {query.isLoading && (
          <>
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
          </>
        )}

        {query.error && <Alert variant="error">{toUserMessage(query.error)}</Alert>}

        {!query.isLoading && !query.error && rides.length === 0 && (
          <EmptyState
            icon={Car}
            title="Hali safar qilmagansiz"
            description="Birinchi safaringizdan keyin u shu yerda ko'rinadi."
            action={
              <Link
                href="/taxi"
                className="bg-primary text-primary-foreground shadow-primary/25 inline-flex h-11 items-center rounded-xl px-5 text-sm font-medium shadow-lg transition-transform active:scale-[0.98]"
              >
                Taksi chaqirish
              </Link>
            }
          />
        )}

        {rides.map((ride) => (
          <RideRow key={ride.id} ride={ride} />
        ))}
      </div>
    </>
  );
}

/**
 * Bitta safar qatori.
 *
 * ── Nima uchun ikkala manzil ham ko'rsatiladi ─────────────────────────
 * Faqat borilgan joyni yozsak, "Chorsu" degan qator ikki xil safarni
 * anglatishi mumkin: uydan Chorsuga va ishdan Chorsuga. Ular boshqa
 * narxda va odam ularni ajrata olishi kerak.
 */
function RideRow({ ride }: { ride: RideView }) {
  return (
    <Link
      href={`/taxi/${ride.id}`}
      className="bg-card border-border hover:bg-secondary/40 block rounded-3xl border p-4 shadow-sm transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="bg-secondary text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl">
          <Car className="size-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-semibold">{ride.to.address}</p>
            <p className="shrink-0 text-sm font-bold tabular-nums">{formatTiyin(ride.priceTiyin)}</p>
          </div>

          <p className="text-muted-foreground mt-0.5 truncate text-xs">{ride.from.address}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(ride.status)}>{RIDE_STATUS_LABEL[ride.status]}</Badge>

            <span className="text-muted-foreground text-xs">
              {formatRelativeUz(ride.createdAt)} · {formatDistance(ride.distanceKm)}
            </span>
          </div>
        </div>

        {/*
          Ko'rsatkich faqat FAOL safarda yorqin: odam uni bosib
          kuzatuvga o'tishi kerak. Tugagan safarni ochish ham
          mumkin, lekin u shoshilinch emas.
        */}
        <ChevronRight
          className={
            isRideActive(ride.status)
              ? 'text-primary mt-3 size-4 shrink-0'
              : 'text-muted-foreground/50 mt-3 size-4 shrink-0'
          }
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
