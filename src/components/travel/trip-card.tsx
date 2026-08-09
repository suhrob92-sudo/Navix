'use client';

import { ArrowRight, Bus, Plane, TrainFront } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { ServiceIcon } from '@/components/app/service-icon';
import { formatUzTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import {
  formatDuration,
  transportColor,
  transportLabel,
  type TransportName,
  type TripView,
} from '@/modules/travel/travel.types';

/** Har bir transport turining ikonkasi. */
const TRANSPORT_ICONS: Record<TransportName, LucideIcon> = {
  PLANE: Plane,
  TRAIN: TrainFront,
  BUS: Bus,
};

export interface TripCardProps {
  trip: TripView;
  index?: number;
}

/**
 * Reys kartochkasi.
 *
 * ── Nima uchun VAQTLAR eng katta ──────────────────────────────────────
 * Reys tanlashda birinchi savol "soat nechada?" — narx keyin keladi.
 * Shuning uchun jo'nash va yetib borish vaqtlari kartochkaning
 * markazida, yo'l davomiyligi esa ular orasida turadi.
 *
 * ── Nima uchun sana HAVOLAGA qo'shiladi ───────────────────────────────
 * Reys bazada alohida yozuv emas — u "jadval + sana". Sana manzilda
 * ketmasa, ochilgan sahifa qaysi kun haqida ekanini bilmasdi.
 */
export function TripCard({ trip, index = 0 }: TripCardProps) {
  const Icon = TRANSPORT_ICONS[trip.transport];
  const isSoldOut = trip.availableSeats === 0;

  return (
    <Link
      href={`/travel/${trip.scheduleId}?date=${trip.departDate}`}
      className="bg-card border-border animate-fade-up block rounded-2xl border p-4 transition-transform active:scale-[0.99]"
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      <div className="flex items-start gap-3">
        <ServiceIcon icon={Icon} color={transportColor(trip.transport)} size="md" />

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-semibold">{transportLabel(trip.transport)}</p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">{`${trip.carrier} · ${trip.code}`}</p>
        </div>
      </div>

      {/* Vaqtlar — eng muhim ma'lumot */}
      <div className="mt-3 flex items-center gap-3">
        <div className="text-center">
          <p className="text-xl leading-none font-semibold tabular-nums">{formatUzTime(trip.departAt)}</p>
          <p className="text-muted-foreground mt-1 truncate text-xs">{trip.fromCity}</p>
        </div>

        <div className="min-w-0 flex-1 text-center">
          <p className="text-muted-foreground text-[0.6875rem] leading-none">
            {formatDuration(trip.durationMinutes)}
          </p>
          <div className="bg-border relative mt-1.5 h-px w-full">
            <ArrowRight
              className="text-muted-foreground absolute top-1/2 right-0 size-3 -translate-y-1/2"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="text-center">
          <p className="text-xl leading-none font-semibold tabular-nums">{formatUzTime(trip.arriveAt)}</p>
          <p className="text-muted-foreground mt-1 truncate text-xs">{trip.toCity}</p>
        </div>
      </div>

      <div className="border-border/60 mt-3 flex items-center justify-between gap-3 border-t pt-3">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-semibold tabular-nums">{formatTiyin(trip.priceTiyin)}</span>
          <span className="text-muted-foreground text-xs">/ o&apos;rin</span>
        </div>

        {isSoldOut ? (
          <span className="text-destructive text-xs font-medium">Joy qolmadi</span>
        ) : (
          <span className="text-muted-foreground text-xs">{`${trip.availableSeats} ta bo'sh`}</span>
        )}
      </div>
    </Link>
  );
}
