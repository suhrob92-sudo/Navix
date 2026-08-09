'use client';

import { ArrowRight, Bus, Plane, Phone, Ticket, TrainFront, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
import { formatUzDate, formatUzTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import {
  calculateRefundTiyin,
  canCancelTicket,
  formatSeats,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_VARIANTS,
  transportColor,
  type TicketView,
  type TicketsResponse,
  type TransportName,
} from '@/modules/travel/travel.types';

const TRANSPORT_ICONS: Record<TransportName, LucideIcon> = {
  PLANE: Plane,
  TRAIN: TrainFront,
  BUS: Bus,
};

const FILTERS = [
  { value: 'ALL', label: 'Barchasi' },
  { value: 'UPCOMING', label: 'Kelgusi' },
  { value: 'COMPLETED', label: "O'tgan" },
  { value: 'CANCELLED', label: 'Bekor qilingan' },
] as const;

/**
 * Mening chiptalarim.
 *
 * ── Nima uchun bekor qilishdan OLDIN summa ko'rsatiladi ───────────────
 * Kech bekor qilinganda pulning bir qismi ushlanadi. Foydalanuvchi buni
 * tugmani bosgandan KEYIN bilib qolsa, bu aldov bo'lardi. Shuning uchun
 * tasdiqlash oynasida aynan qancha qaytishi yoziladi — hisob
 * `travel.types.ts` dagi bitta funksiyadan, ya'ni server bilan bir xil.
 */
export function TicketsContent() {
  const request = useApiClient();

  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('ALL');
  const [cancelTarget, setCancelTarget] = useState<TicketView | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error, reload } = useApiQuery<TicketsResponse>(
    `/api/v1/travel/tickets?status=${filter}&pageSize=50`,
  );

  const tickets = data?.tickets ?? [];

  async function cancel(ticketId: string) {
    setIsSaving(true);
    setActionError(null);

    try {
      await request(`/api/v1/travel/tickets/${ticketId}/cancel`, { method: 'POST', body: {} });

      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
      setCancelTarget(null);
    }
  }

  const refundText = cancelTarget
    ? formatTiyin(calculateRefundTiyin(BigInt(cancelTarget.totalTiyin), cancelTarget.departAt))
    : '';

  return (
    <>
      <AppHeader title="Chiptalarim" showBack backHref="/travel" />

      <div className="px-4 pt-4">
        <div className="-mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={cn(
                'shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium transition-colors',
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
              <Skeleton key={index} className="h-52 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Chiptalarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && tickets.length === 0 && (
          <EmptyState
            icon={Ticket}
            title={filter === 'ALL' ? "Hali chipta yo'q" : "Bu bo'limda chipta yo'q"}
            description="Reyslarni qidiring va chipta oling."
            action={
              <Button asChild variant="outline">
                <Link href="/travel">Reyslarni ochish</Link>
              </Button>
            }
          />
        )}

        <ul className="space-y-2">
          {tickets.map((ticket, index) => {
            const Icon = TRANSPORT_ICONS[ticket.trip.transport];

            return (
              <li
                key={ticket.id}
                className="bg-card border-border animate-fade-up rounded-2xl border p-4"
                style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
              >
                <div className="flex items-start gap-3">
                  <ServiceIcon icon={Icon} color={transportColor(ticket.trip.transport)} size="md" />

                  <div className="min-w-0 flex-1">
                    <p className="text-base leading-snug font-semibold">
                      {`${ticket.trip.fromCity} → ${ticket.trip.toCity}`}
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {`${ticket.trip.carrier} · ${ticket.trip.code}`}
                    </p>
                  </div>

                  <Badge variant={TICKET_STATUS_VARIANTS[ticket.status]} className="shrink-0">
                    {TICKET_STATUS_LABELS[ticket.status]}
                  </Badge>
                </div>

                <div className="bg-secondary/50 mt-3 flex items-center gap-3 rounded-xl p-3">
                  <div className="text-center">
                    <p className="text-lg leading-none font-semibold tabular-nums">
                      {formatUzTime(ticket.departAt)}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[0.6875rem]">
                      {formatUzDate(ticket.departAt)}
                    </p>
                  </div>

                  <ArrowRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />

                  <div className="text-center">
                    <p className="text-lg leading-none font-semibold tabular-nums">
                      {formatUzTime(ticket.arriveAt)}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[0.6875rem]">
                      {formatUzDate(ticket.arriveAt)}
                    </p>
                  </div>

                  <span className="text-muted-foreground ml-auto text-xs">{formatSeats(ticket.seats)}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Users className="size-3.5 shrink-0" aria-hidden="true" />
                    {ticket.passengerName}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1 text-xs tabular-nums">
                    <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                    {formatUzPhone(ticket.passengerPhone)}
                  </span>
                </div>

                <div className="border-border/60 mt-3 flex items-center justify-between gap-3 border-t pt-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold tabular-nums">{formatTiyin(ticket.totalTiyin)}</p>
                    <p className="text-muted-foreground font-mono text-xs">{ticket.ticketNumber}</p>

                    {/*
                      Qaytarilgan summa to'langanidan kam bo'lsa, buni
                      ochiq yozamiz — "qolgan puli qani?" degan savol
                      javobsiz qolmasligi kerak.
                    */}
                    {ticket.refundTiyin !== null && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {ticket.refundTiyin >= ticket.totalTiyin
                          ? `${formatTiyin(ticket.refundTiyin)} qaytarildi`
                          : `${formatTiyin(ticket.refundTiyin)} qaytarildi (jarima ushlandi)`}
                      </p>
                    )}
                  </div>

                  {canCancelTicket(ticket) && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => setCancelTarget(ticket)}
                    >
                      Bekor qilish
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Chiptani bekor qilish"
        description={`Chipta bekor qilinadi va hamyoningizga ${refundText} qaytariladi.`}
        confirmLabel="Bekor qilaman"
        isDestructive
        isLoading={isSaving}
        onConfirm={() => {
          if (cancelTarget) void cancel(cancelTarget.id);
        }}
        onCancel={() => setCancelTarget(null)}
      />
    </>
  );
}
