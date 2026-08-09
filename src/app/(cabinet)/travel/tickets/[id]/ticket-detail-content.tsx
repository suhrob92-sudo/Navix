'use client';

import { ArrowRight, Bus, Phone, Plane, TrainFront, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
import { formatUzDate, formatUzTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import {
  calculateRefundTiyin,
  canCancelTicket,
  formatDuration,
  formatSeats,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_VARIANTS,
  transportColor,
  transportLabel,
  type TicketResponse,
  type TransportName,
} from '@/modules/travel/travel.types';

const TRANSPORT_ICONS: Record<TransportName, LucideIcon> = {
  PLANE: Plane,
  TRAIN: TrainFront,
  BUS: Bus,
};

export interface TicketDetailContentProps {
  ticketId: string;
}

/**
 * Bitta chipta.
 *
 * ── Nima uchun bu sahifa kerak ────────────────────────────────────────
 * Bildirishnoma "Chipta olindi" deb aynan shu manzilga yuboradi. Sahifa
 * bo'lmasa, odam bosgan joyidan "sahifa topilmadi" degan javob olardi —
 * pul to'lagandan keyin bu eng yomon taassurot.
 *
 * ── Nima uchun ro'yxatda emas, ALOHIDA ────────────────────────────────
 * Bu sahifani stansiyada yoki aeroportda ochadilar: chipta raqami va
 * jo'nash vaqti darhol, aylantirmasdan ko'rinishi kerak.
 */
export function TicketDetailContent({ ticketId }: TicketDetailContentProps) {
  const request = useApiClient();

  const { data, isLoading, error, reload } = useApiQuery<TicketResponse>(`/api/v1/travel/tickets/${ticketId}`);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const ticket = data?.ticket ?? null;
  const Icon = ticket ? TRANSPORT_ICONS[ticket.trip.transport] : Plane;

  async function cancel() {
    if (!ticket) return;

    setIsSaving(true);
    setActionError(null);

    try {
      await request(`/api/v1/travel/tickets/${ticket.id}/cancel`, { method: 'POST', body: {} });

      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
      setIsConfirmOpen(false);
    }
  }

  /**
   * Bekor qilinsa qancha qaytishi.
   *
   * Hisob serverdagi bilan BIR XIL funksiyadan — ekranda bitta summa
   * turib, hamyonga boshqasi tushmasligi uchun.
   */
  const refundText = ticket ? formatTiyin(calculateRefundTiyin(BigInt(ticket.totalTiyin), ticket.departAt)) : '';

  return (
    <>
      <AppHeader title="Chipta" showBack backHref="/travel/tickets" />

      <div className="space-y-4 px-4 pt-4">
        {isLoading && (
          <>
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Chiptani yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {actionError && <Alert variant="error">{actionError}</Alert>}

        {ticket && (
          <>
            <section className="bg-card border-border animate-fade-up overflow-hidden rounded-2xl border">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <ServiceIcon icon={Icon} color={transportColor(ticket.trip.transport)} size="md" />

                  <div className="min-w-0 flex-1">
                    <h1 className="text-base leading-snug font-semibold">
                      {`${ticket.trip.fromCity} → ${ticket.trip.toCity}`}
                    </h1>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {`${ticket.trip.carrier} · ${ticket.trip.code}`}
                    </p>
                  </div>

                  <Badge variant={TICKET_STATUS_VARIANTS[ticket.status]} className="shrink-0">
                    {TICKET_STATUS_LABELS[ticket.status]}
                  </Badge>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-2xl leading-none font-semibold tabular-nums">
                      {formatUzTime(ticket.departAt)}
                    </p>
                    <p className="text-muted-foreground mt-1.5 text-xs">{formatUzDate(ticket.departAt)}</p>
                  </div>

                  <div className="min-w-0 flex-1 text-center">
                    <p className="text-muted-foreground text-xs leading-none">
                      {formatDuration(
                        Math.round((Date.parse(ticket.arriveAt) - Date.parse(ticket.departAt)) / 60_000),
                      )}
                    </p>
                    <div className="bg-border relative mt-2 h-px w-full">
                      <ArrowRight
                        className="text-muted-foreground absolute top-1/2 right-0 size-3.5 -translate-y-1/2"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs">{transportLabel(ticket.trip.transport)}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-2xl leading-none font-semibold tabular-nums">
                      {formatUzTime(ticket.arriveAt)}
                    </p>
                    <p className="text-muted-foreground mt-1.5 text-xs">{formatUzDate(ticket.arriveAt)}</p>
                  </div>
                </div>
              </div>

              {/*
                Chipta uzilmasi — qog'oz chiptadagi teshikli chiziqqa
                o'xshatilgan. Bezak emas: ko'z darhol "bu chipta" deb
                tanib oladi va pastdagi raqamni izlaydi.
              */}
              <div className="relative">
                <span className="bg-background absolute -left-2.5 size-5 -translate-y-1/2 rounded-full" />
                <span className="bg-background absolute -right-2.5 size-5 -translate-y-1/2 rounded-full" />
                <div className="border-border border-t border-dashed" />
              </div>

              <div className="p-4">
                <p className="text-muted-foreground text-xs">Chipta raqami</p>
                <p className="mt-0.5 font-mono text-lg font-semibold tracking-wider">{ticket.ticketNumber}</p>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs">O&apos;rinlar</p>
                    <p className="mt-0.5 font-medium">{formatSeats(ticket.seats)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Bir o&apos;rin</p>
                    <p className="mt-0.5 font-medium tabular-nums">{formatTiyin(ticket.pricePerSeat)}</p>
                  </div>
                </div>

                <div className="border-border/60 mt-4 space-y-1.5 border-t pt-4">
                  <p className="flex items-center gap-2 text-sm">
                    <User className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    {ticket.passengerName}
                  </p>
                  <p className="flex items-center gap-2 text-sm tabular-nums">
                    <Phone className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    {formatUzPhone(ticket.passengerPhone)}
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-card border-border rounded-2xl border p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground text-sm">To&apos;langan</span>
                <span className="text-xl font-semibold tabular-nums">{formatTiyin(ticket.totalTiyin)}</span>
              </div>

              {ticket.refundTiyin !== null && (
                <div className="border-border/60 mt-3 flex items-baseline justify-between gap-3 border-t pt-3">
                  <span className="text-muted-foreground text-sm">Qaytarildi</span>
                  <span className="text-success text-xl font-semibold tabular-nums">
                    {formatTiyin(ticket.refundTiyin)}
                  </span>
                </div>
              )}

              {/*
                Jarima ushlangan bo'lsa sababi yoziladi — "qolgan pulim
                qani?" degan savol javobsiz qolmasligi kerak.
              */}
              {ticket.refundTiyin !== null && ticket.refundTiyin < ticket.totalTiyin && (
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  Chipta jo&apos;nashga yaqin bekor qilingani uchun jarima ushlandi.
                </p>
              )}

              {ticket.cancelReason && (
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  {`Sabab: ${ticket.cancelReason}`}
                </p>
              )}

              {canCancelTicket(ticket) && (
                <Button
                  variant="outline"
                  fullWidth
                  className="mt-4"
                  disabled={isSaving}
                  onClick={() => setIsConfirmOpen(true)}
                >
                  Chiptani bekor qilish
                </Button>
              )}
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        title="Chiptani bekor qilish"
        description={`Chipta bekor qilinadi va hamyoningizga ${refundText} qaytariladi.`}
        confirmLabel="Bekor qilaman"
        isDestructive
        isLoading={isSaving}
        onConfirm={() => void cancel()}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}
