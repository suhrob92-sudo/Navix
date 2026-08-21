'use client';

import { Building2, CalendarDays, Phone, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ServiceIcon } from '@/components/app/service-icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANTS,
  canCancelBooking,
  formatNights,
  type BookingsResponse,
} from '@/modules/hotel/hotel.types';

const FILTERS = [
  { value: 'ALL', label: 'Barchasi' },
  { value: 'UPCOMING', label: 'Kelgusi' },
  { value: 'COMPLETED', label: "O'tgan" },
  { value: 'CANCELLED', label: 'Bekor qilingan' },
] as const;

/**
 * Mening bandlovlarim.
 *
 * ── Nima uchun "kelgusi" alohida filtr ────────────────────────────────
 * Foydalanuvchini qiziqtiradigan asosiy savol bitta: "yaqin kunlarda
 * qayerga borishim kerak?". Shuning uchun bu holat alohida tugmaga
 * chiqarilgan.
 */
export function BookingsContent() {
  const request = useApiClient();

  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('ALL');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error, reload } = useApiQuery<BookingsResponse>(
    `/api/v1/hotels/bookings?status=${filter}&pageSize=50`,
  );

  const bookings = data?.bookings ?? [];

  async function cancel(bookingId: string) {
    setIsSaving(true);
    setActionError(null);

    try {
      await request(`/api/v1/hotels/bookings/${bookingId}/cancel`, { method: 'POST', body: {} });

      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
      setCancelId(null);
    }
  }

  return (
    <>
      <AppHeader title="Bandlovlarim" showBack backHref="/hotel" />

      <div className="px-4 pt-4">
        <div className="-mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={cn(
                'inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                filter === item.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-secondary',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {actionError && (
          <Alert variant="error" className="mb-4">
            {actionError}
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-44 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Bandlovlarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && bookings.length === 0 && (
          <EmptyState
            icon={CalendarDays}
            title={filter === 'ALL' ? "Hali bandlov yo'q" : "Bu bo'limda bandlov yo'q"}
            description="Mehmonxonalarni ko'rib chiqing va xona band qiling."
            action={
              <Button asChild variant="outline">
                <Link href="/hotel">Mehmonxonalarni ochish</Link>
              </Button>
            }
          />
        )}

        <ul className="space-y-2">
          {bookings.map((booking, index) => (
            <li
              key={booking.id}
              className="bg-card border-border animate-fade-up rounded-2xl border p-4"
              style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
            >
              <div className="flex items-start gap-3">
                <ServiceIcon icon={Building2} color={booking.hotel.color} size="md" />

                <div className="min-w-0 flex-1">
                  <p className="text-base leading-snug font-semibold text-balance">{booking.hotel.name}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {`${booking.room.name} · ${booking.hotel.city}`}
                  </p>
                </div>

                <Badge variant={BOOKING_STATUS_VARIANTS[booking.status]} className="shrink-0">
                  {BOOKING_STATUS_LABELS[booking.status]}
                </Badge>
              </div>

              <div className="bg-secondary/50 mt-3 flex items-center gap-2 rounded-xl p-3 text-sm">
                <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                <span className="tabular-nums">{`${booking.checkIn} → ${booking.checkOut}`}</span>
                <span className="text-muted-foreground ml-auto text-xs">{formatNights(booking.nights)}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Users className="size-3.5 shrink-0" aria-hidden="true" />
                  {`${booking.guests} mehmon · ${booking.guestName}`}
                </span>
                <span className="text-muted-foreground flex items-center gap-1 text-xs tabular-nums">
                  <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                  {formatUzPhone(booking.guestPhone)}
                </span>
              </div>

              <div className="border-border/60 mt-3 flex items-center justify-between gap-3 border-t pt-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold tabular-nums">{formatTiyin(booking.totalTiyin)}</p>
                  <p className="text-muted-foreground font-mono text-xs">{booking.bookingNumber}</p>
                </div>

                {/*
                  Kartochkaning O'ZI havola emas: ichida "Bekor qilish"
                  tugmasi bor va tugmani bosgan barmoq havolani ham
                  bosib yuborardi. Shuning uchun alohida tugma.
                */}
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/hotel/bookings/${booking.id}`}>Batafsil</Link>
                  </Button>

                  {canCancelBooking(booking) && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => setCancelId(booking.id)}
                    >
                      Bekor qilish
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={cancelId !== null}
        title="Bandlovni bekor qilish"
        description="Bandlov bekor qilinadi va to'langan pul hamyoningizga to'liq qaytariladi."
        confirmLabel="Bekor qilaman"
        isDestructive
        isLoading={isSaving}
        onConfirm={() => {
          if (cancelId) void cancel(cancelId);
        }}
        onCancel={() => setCancelId(null)}
      />
    </>
  );
}
