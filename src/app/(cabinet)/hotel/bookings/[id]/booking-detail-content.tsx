'use client';

import { Building2, CalendarDays, MapPin, Phone, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ServiceIcon } from '@/components/app/service-icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANTS,
  canCancelBooking,
  formatNights,
  type BookingResponse,
} from '@/modules/hotel/hotel.types';

export interface BookingDetailContentProps {
  bookingId: string;
}

/**
 * Bitta bandlov.
 *
 * ── Nima uchun bu sahifa kerak ────────────────────────────────────────
 * "Xona band qilindi" bildirishnomasi aynan shu manzilga yuboradi.
 * Sahifa bo'lmagani uchun odam bosgan joyidan "topilmadi" degan javob
 * olardi — pul to'lagandan keyin bu eng yomon taassurot.
 */
export function BookingDetailContent({ bookingId }: BookingDetailContentProps) {
  const request = useApiClient();

  const { data, isLoading, error, reload } = useApiQuery<BookingResponse>(`/api/v1/hotels/bookings/${bookingId}`);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const booking = data?.booking ?? null;

  async function cancel() {
    if (!booking) return;

    setIsSaving(true);
    setActionError(null);

    try {
      await request(`/api/v1/hotels/bookings/${booking.id}/cancel`, { method: 'POST', body: {} });

      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
      setIsConfirmOpen(false);
    }
  }

  return (
    <>
      <AppHeader title="Bandlov" showBack backHref="/hotel/bookings" />

      <div className="space-y-4 px-4 pt-4">
        {isLoading && (
          <>
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Bandlovni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {actionError && <Alert variant="error">{actionError}</Alert>}

        {booking && (
          <>
            <section className="bg-card border-border animate-fade-up overflow-hidden rounded-2xl border">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <ServiceIcon icon={Building2} color={booking.hotel.color} size="md" />

                  <div className="min-w-0 flex-1">
                    <h1 className="text-base leading-snug font-semibold text-balance">{booking.hotel.name}</h1>
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                      <MapPin className="size-3 shrink-0" aria-hidden="true" />
                      {`${booking.hotel.city}, ${booking.hotel.address}`}
                    </p>
                  </div>

                  <Badge variant={BOOKING_STATUS_VARIANTS[booking.status]} className="shrink-0">
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </Badge>
                </div>

                <div className="bg-secondary/50 mt-4 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                    <span className="tabular-nums">{`${booking.checkIn} → ${booking.checkOut}`}</span>
                    <span className="text-muted-foreground ml-auto text-xs">{formatNights(booking.nights)}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Xona</p>
                    <p className="mt-0.5 font-medium">{booking.room.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Bir kecha</p>
                    <p className="mt-0.5 font-medium tabular-nums">{formatTiyin(booking.pricePerNight)}</p>
                  </div>
                </div>
              </div>

              {/* Chipta uzilmasi — qog'oz kvitansiyaga o'xshatilgan. */}
              <div className="relative">
                <span className="bg-background absolute -left-2.5 size-5 -translate-y-1/2 rounded-full" />
                <span className="bg-background absolute -right-2.5 size-5 -translate-y-1/2 rounded-full" />
                <div className="border-border border-t border-dashed" />
              </div>

              <div className="p-4">
                <p className="text-muted-foreground text-xs">Bandlov raqami</p>
                <p className="mt-0.5 font-mono text-lg font-semibold tracking-wider">{booking.bookingNumber}</p>

                <div className="border-border/60 mt-4 space-y-1.5 border-t pt-4">
                  <p className="flex items-center gap-2 text-sm">
                    <User className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    {`${booking.guestName} · ${booking.guests} mehmon`}
                  </p>
                  <p className="flex items-center gap-2 text-sm tabular-nums">
                    <Phone className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    {formatUzPhone(booking.guestPhone)}
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-card border-border rounded-2xl border p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground text-sm">To&apos;langan</span>
                <span className="text-xl font-semibold tabular-nums">{formatTiyin(booking.totalTiyin)}</span>
              </div>

              {booking.cancelReason && (
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  {`Sabab: ${booking.cancelReason}`}
                </p>
              )}

              {canCancelBooking(booking) ? (
                <Button
                  variant="outline"
                  fullWidth
                  className="mt-4"
                  disabled={isSaving}
                  onClick={() => setIsConfirmOpen(true)}
                >
                  Bandlovni bekor qilish
                </Button>
              ) : (
                <Button variant="outline" fullWidth className="mt-4" asChild>
                  <Link href={`/hotel/${booking.hotel.slug}`}>Mehmonxonani ochish</Link>
                </Button>
              )}
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        title="Bandlovni bekor qilish"
        description="Bandlov bekor qilinadi va to'langan pul hamyoningizga to'liq qaytariladi."
        confirmLabel="Bekor qilaman"
        isDestructive
        isLoading={isSaving}
        onConfirm={() => void cancel()}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}
