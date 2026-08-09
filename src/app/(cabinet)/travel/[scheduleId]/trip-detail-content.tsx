'use client';

import { ArrowRight, Bus, Check, Clock, Plane, TrainFront, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ServiceIcon } from '@/components/app/service-icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TRIP_RULES } from '@/config/travel';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { ApiClientError, toUserMessage } from '@/lib/api-client';
import { formatUzDate, formatUzTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import type { FieldErrors } from '@/lib/api/errors';
import {
  dateKeyFromToday,
  formatDuration,
  formatSeats,
  refundPolicyText,
  transportColor,
  transportLabel,
  type TransportName,
  type TripResponse,
} from '@/modules/travel/travel.types';

const TRANSPORT_ICONS: Record<TransportName, LucideIcon> = {
  PLANE: Plane,
  TRAIN: TrainFront,
  BUS: Bus,
};

export interface TripDetailContentProps {
  scheduleId: string;
}

/**
 * Reys sahifasi va chipta olish.
 *
 * ── Nima uchun sana MANZILDAN olinadi ─────────────────────────────────
 * Reys bazada alohida yozuv emas — u "jadval + sana". Sana manzilda
 * (`?date=...`) ketadi, shuning uchun havolani saqlab qo'yish yoki
 * do'stga yuborish mumkin va u aynan o'sha kunni ochadi.
 */
export function TripDetailContent({ scheduleId }: TripDetailContentProps) {
  const request = useApiClient();
  const searchParams = useSearchParams();

  const date = searchParams.get('date') ?? dateKeyFromToday(1);

  const { data, isLoading, error, reload } = useApiQuery<TripResponse>(
    `/api/v1/travel/trips/${scheduleId}?date=${date}`,
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [seats, setSeats] = useState('1');
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [boughtNumber, setBoughtNumber] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const trip = data?.trip ?? null;

  /**
   * Tanlangan o'rinlar soni — summani ko'rsatish uchun.
   *
   * Bo'sh maydon `1` deb hisoblanadi: foydalanuvchi raqamni o'chirib
   * turgan onda summa nolga tushib ketmasligi kerak.
   */
  const seatCount = useMemo(() => {
    const parsed = Number.parseInt(seats, 10);

    return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
  }, [seats]);

  const isSoldOut = trip !== null && trip.availableSeats === 0;

  async function buy() {
    if (!trip) return;

    setIsSaving(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await request<{ ticket: { ticketNumber: string } }>('/api/v1/travel/tickets', {
        method: 'POST',
        body: {
          scheduleId: trip.scheduleId,
          departDate: trip.departDate,
          seats: seatCount,
          passengerName: passengerName.trim(),
          passengerPhone: passengerPhone.trim(),
          idempotencyKey,
        },
      });

      setBoughtNumber(response.ticket.ticketNumber);
      setIsFormOpen(false);
      setPassengerName('');
      setPassengerPhone('');
      setIdempotencyKey(crypto.randomUUID());
      reload();
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.details) {
        setFieldErrors(caught.details);
      }

      setFormError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  const Icon = trip ? TRANSPORT_ICONS[trip.transport] : Plane;

  return (
    <>
      <AppHeader title="Reys" showBack backHref="/travel" />

      <div className="space-y-5 px-4 pt-4">
        {isLoading && (
          <>
            <Skeleton className="h-52 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Reysni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {boughtNumber && (
          <Alert variant="success" title="Chipta olindi">
            {`Raqam: ${boughtNumber}. Tafsilotlarni "Chiptalarim" bo'limida ko'ring.`}
          </Alert>
        )}

        {formError && <Alert variant="error">{formError}</Alert>}

        {trip && (
          <>
            <section className="bg-card border-border animate-fade-up rounded-2xl border p-4">
              <div className="flex items-start gap-3">
                <ServiceIcon icon={Icon} color={transportColor(trip.transport)} size="md" />

                <div className="min-w-0 flex-1">
                  <h1 className="text-base leading-snug font-semibold">{`${trip.fromCity} → ${trip.toCity}`}</h1>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {`${trip.carrier} · ${trip.code}`}
                  </p>
                </div>

                <Badge variant="secondary" className="shrink-0">
                  {transportLabel(trip.transport)}
                </Badge>
              </div>

              {/* Vaqtlar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="text-center">
                  <p className="text-2xl leading-none font-semibold tabular-nums">{formatUzTime(trip.departAt)}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{formatUzDate(trip.departAt)}</p>
                </div>

                <div className="min-w-0 flex-1 text-center">
                  <p className="text-muted-foreground text-xs leading-none">
                    {formatDuration(trip.durationMinutes)}
                  </p>
                  <div className="bg-border relative mt-2 h-px w-full">
                    <ArrowRight
                      className="text-muted-foreground absolute top-1/2 right-0 size-3.5 -translate-y-1/2"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-2xl leading-none font-semibold tabular-nums">{formatUzTime(trip.arriveAt)}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{formatUzDate(trip.arriveAt)}</p>
                </div>
              </div>

              <div className="border-border/60 mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3">
                {/*
                  Jo'nash soati yuqorida katta yozilgan — bu yerda uni
                  takrorlash o'rniga qatnov kuni ko'rsatiladi: chipta
                  olishdan oldin "aynan shu kunmi?" degan savol tug'iladi.
                */}
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                  {formatUzDate(trip.departAt, 'long')}
                </span>
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Users className="size-3.5 shrink-0" aria-hidden="true" />
                  {isSoldOut ? "Bo'sh o'rin yo'q" : `${trip.availableSeats} ta bo'sh o'rin`}
                </span>
              </div>
            </section>

            <section className="bg-card border-border rounded-2xl border p-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums">{formatTiyin(trip.priceTiyin)}</span>
                <span className="text-muted-foreground text-sm">/ o&apos;rin</span>
              </div>

              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{refundPolicyText()}</p>

              <Button
                fullWidth
                className="mt-4"
                disabled={isSoldOut}
                onClick={() => {
                  setIsFormOpen(true);
                  setBoughtNumber(null);
                }}
              >
                {isSoldOut ? "Bo'sh o'rin yo'q" : 'Chipta olish'}
              </Button>
            </section>
          </>
        )}
      </div>

      {/* Chipta olish oynasi */}
      {isFormOpen && trip && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="bg-card animate-scale-in max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl p-6 sm:rounded-2xl">
            <h2 className="text-lg font-semibold tracking-tight">Chipta olish</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {`${trip.fromCity} → ${trip.toCity}, ${formatUzDate(trip.departAt, 'long')}, ${formatUzTime(trip.departAt)}.`}
            </p>

            <p className="mt-3 text-2xl font-semibold tabular-nums">{formatTiyin(trip.priceTiyin * seatCount)}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {`${formatSeats(seatCount)} × ${formatTiyin(trip.priceTiyin)}`}
            </p>

            <div className="mt-4 space-y-4">
              <Field
                id="seats"
                label="Nechta o'rin"
                hint={`Eng ko'pi ${TRIP_RULES.maxSeats} ta`}
                errors={fieldErrors.seats}
              >
                <Input
                  id="seats"
                  inputMode="numeric"
                  value={seats}
                  onChange={(event) => setSeats(event.target.value.replace(/\D/g, ''))}
                  hasError={Boolean(fieldErrors.seats)}
                  disabled={isSaving}
                />
              </Field>

              <Field
                id="passengerName"
                label="Kim ketadi"
                required
                hint="Chipta boshqa odam uchun ham bo'lishi mumkin"
                errors={fieldErrors.passengerName}
              >
                <Input
                  id="passengerName"
                  value={passengerName}
                  onChange={(event) => setPassengerName(event.target.value)}
                  placeholder="Masalan: Aziz Karimov"
                  hasError={Boolean(fieldErrors.passengerName)}
                  disabled={isSaving}
                />
              </Field>

              <Field id="passengerPhone" label="Telefon raqami" required errors={fieldErrors.passengerPhone}>
                <Input
                  id="passengerPhone"
                  inputMode="tel"
                  value={passengerPhone}
                  onChange={(event) => setPassengerPhone(event.target.value)}
                  placeholder="90 123 45 67"
                  hasError={Boolean(fieldErrors.passengerPhone)}
                  disabled={isSaving}
                />
              </Field>
            </div>

            <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
              {`To'lov hamyoningizdan yechiladi. ${refundPolicyText()}`}
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                Bekor qilish
              </Button>
              <Button onClick={buy} isLoading={isSaving} loadingText="Olinmoqda...">
                <Check className="size-4" aria-hidden="true" />
                Tasdiqlash
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
