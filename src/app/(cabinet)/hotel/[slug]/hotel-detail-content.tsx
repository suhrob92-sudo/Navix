'use client';

import { Building2, CalendarDays, Check, MapPin, Star, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { LinkedPosts } from '@/components/feed/linked-posts';
import { ServiceIcon } from '@/components/app/service-icon';
import { CatalogGallery } from '@/components/catalog/catalog-gallery';
import { RecentTracker } from '@/components/recent/recent-tracker';
import { ReviewSection } from '@/components/review/review-section';
import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { ApiClientError, toUserMessage } from '@/lib/api-client';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { FieldErrors } from '@/lib/api/errors';
import {
  countNights,
  dateKeyFromToday,
  formatNights,
  formatStars,
  type HotelResponse,
  type HotelRoomView,
} from '@/modules/hotel/hotel.types';

export interface HotelDetailContentProps {
  slug: string;
}

/**
 * Mehmonxona sahifasi va bandlov.
 *
 * ── Nima uchun bo'sh joy XONA yonida ──────────────────────────────────
 * "Bo'sh xona yo'q" degan xabarni bandlov tugmasini bosgandan keyin
 * ko'rsatish — eng yomon yo'l: odam formani to'ldirib, keyin rad
 * javobini oladi.
 *
 * Shuning uchun har bir xona yonida darhol yoziladi: nechta qolgan
 * yoki umuman yo'q.
 */
export function HotelDetailContent({ slug }: HotelDetailContentProps) {
  const request = useApiClient();
  const searchParams = useSearchParams();

  const [checkIn, setCheckIn] = useState(() => searchParams.get('checkIn') ?? dateKeyFromToday(1));
  const [checkOut, setCheckOut] = useState(() => searchParams.get('checkOut') ?? dateKeyFromToday(2));

  const nights = countNights(checkIn, checkOut);
  const hasValidDates = nights > 0;

  const url = useMemo(() => {
    const params = new URLSearchParams();

    if (hasValidDates) {
      params.set('checkIn', checkIn);
      params.set('checkOut', checkOut);
    }

    const search = params.toString();

    return `/api/v1/hotels/${slug}${search ? `?${search}` : ''}`;
  }, [slug, checkIn, checkOut, hasValidDates]);

  const { data, isLoading, error, reload } = useApiQuery<HotelResponse>(url);

  const [selectedRoom, setSelectedRoom] = useState<HotelRoomView | null>(null);
  const [guests, setGuests] = useState('1');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [bookedNumber, setBookedNumber] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const hotel = data?.hotel ?? null;

  async function book() {
    if (!selectedRoom) return;

    setIsSaving(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await request<{ booking: { bookingNumber: string } }>('/api/v1/hotels/bookings', {
        method: 'POST',
        body: {
          roomId: selectedRoom.id,
          checkIn,
          checkOut,
          guests: Number.parseInt(guests, 10) || 1,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          idempotencyKey,
        },
      });

      setBookedNumber(response.booking.bookingNumber);
      setSelectedRoom(null);
      setGuestName('');
      setGuestPhone('');
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

  return (
    <>
      <AppHeader title="Mehmonxona" showBack backHref="/hotel" />

      <div className="space-y-5 px-4 pt-4">
        {isLoading && (
          <>
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Mehmonxonani yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {bookedNumber && (
          <Alert variant="success" title="Xona band qilindi">
            {`Raqam: ${bookedNumber}. Tafsilotlarni "Bandlovlarim" bo'limida ko'ring.`}
          </Alert>
        )}

        {formError && <Alert variant="error">{formError}</Alert>}

        {hotel && (
          <>
            {/*
              Mehmonxonada rasm — asosiy qaror omili. Odam avval
              xonani KO'RADI, keyin narxga qaraydi.
            */}
            <CatalogGallery images={hotel.images} name={hotel.name} enableFullscreen className="animate-fade-up" />

            <section className="bg-card border-border animate-fade-up rounded-2xl border p-4">
              <div className="flex items-start gap-3">
                <ServiceIcon icon={Building2} color={hotel.color} size="md" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg leading-snug font-semibold text-balance">{hotel.name}</h1>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                    <MapPin className="size-3 shrink-0" aria-hidden="true" />
                    {`${hotel.city}, ${hotel.address}`}
                  </p>
                </div>

                {hotel.ratingCount > 0 && (
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <Star className="size-3 fill-current" aria-hidden="true" />
                    {hotel.rating.toFixed(1)}
                  </Badge>
                )}
              </div>

              <p className="mt-3 text-sm text-amber-500">{formatStars(hotel.stars)}</p>
              <p className="mt-2 text-sm leading-relaxed">{hotel.description}</p>

              <div className="border-border/60 mt-3 flex flex-wrap gap-2 border-t pt-3">
                {hotel.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </section>

            {/* Sanalar */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <h2 className="text-sm font-semibold">Sanalar</h2>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field id="checkIn" label="Kirish">
                  <Input
                    id="checkIn"
                    type="date"
                    value={checkIn}
                    min={dateKeyFromToday(0)}
                    onChange={(event) => setCheckIn(event.target.value)}
                  />
                </Field>

                <Field id="checkOut" label="Chiqish">
                  <Input
                    id="checkOut"
                    type="date"
                    value={checkOut}
                    min={checkIn}
                    onChange={(event) => setCheckOut(event.target.value)}
                    hasError={!hasValidDates}
                  />
                </Field>
              </div>

              <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                {hasValidDates ? formatNights(nights) : "Chiqish sanasi kirishdan keyin bo'lishi kerak"}
              </p>
            </section>

            {/* Xonalar */}
            <section>
              <h2 className="mb-3 text-sm font-semibold">Xonalar</h2>

              <ul className="space-y-2">
                {hotel.rooms.map((room) => {
                  const isSoldOut = room.availableRooms === 0;
                  const total = hasValidDates ? room.pricePerNight * nights : null;

                  return (
                    <li
                      key={room.id}
                      className={cn('bg-card border-border rounded-2xl border p-4', isSoldOut && 'opacity-60')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {room.image && (
                          <CatalogThumb
                            image={room.image}
                            name={room.name}
                            className="size-16 shrink-0 rounded-xl"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold">{room.name}</p>
                          {room.description && (
                            <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                              {room.description}
                            </p>
                          )}
                        </div>

                        <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                          <Users className="size-3.5" aria-hidden="true" />
                          {room.capacity}
                        </span>
                      </div>

                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-lg font-semibold tabular-nums">
                          {formatTiyin(room.pricePerNight)}
                        </span>
                        <span className="text-muted-foreground text-xs">/ kecha</span>
                      </div>

                      {total !== null && (
                        <p className="text-muted-foreground mt-1 text-sm">
                          {`${formatNights(nights)} uchun ${formatTiyin(total)}`}
                        </p>
                      )}

                      <div className="border-border/60 mt-3 flex items-center justify-between gap-3 border-t pt-3">
                        <span className="text-xs">
                          {room.availableRooms === null ? (
                            <span className="text-muted-foreground">Sana tanlang</span>
                          ) : isSoldOut ? (
                            <span className="text-destructive font-medium">Bo&apos;sh xona yo&apos;q</span>
                          ) : (
                            <span className="text-muted-foreground">{`${room.availableRooms} ta bo'sh`}</span>
                          )}
                        </span>

                        <Button
                          size="sm"
                          disabled={!hasValidDates || isSoldOut || room.availableRooms === null}
                          onClick={() => {
                            setSelectedRoom(room);
                            setBookedNumber(null);
                          }}
                        >
                          Band qilish
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <RecentTracker target="HOTEL" targetId={hotel.id} />

            <ReviewSection target="HOTEL" targetId={hotel.id} title="Mehmonlar bahosi" />

            <LinkedPosts kind="HOTEL" targetId={hotel.id} />
          </>
        )}
      </div>

      {/* Bandlov oynasi */}
      {selectedRoom && hotel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="bg-card animate-scale-in max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl p-6 sm:rounded-2xl">
            <h2 className="text-lg font-semibold tracking-tight">Xonani band qilish</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {`${hotel.name} — ${selectedRoom.name}. ${checkIn} dan ${formatNights(nights)}.`}
            </p>

            <p className="mt-3 text-2xl font-semibold tabular-nums">
              {formatTiyin(selectedRoom.pricePerNight * nights)}
            </p>

            <div className="mt-4 space-y-4">
              <Field id="guests" label="Nechta mehmon" errors={fieldErrors.guests}>
                <Input
                  id="guests"
                  inputMode="numeric"
                  value={guests}
                  onChange={(event) => setGuests(event.target.value.replace(/\D/g, ''))}
                  hasError={Boolean(fieldErrors.guests)}
                  disabled={isSaving}
                />
              </Field>

              <Field
                id="guestName"
                label="Kim yashaydi"
                required
                hint="Bandlov boshqa odam uchun ham bo'lishi mumkin"
                errors={fieldErrors.guestName}
              >
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Masalan: Aziz Karimov"
                  hasError={Boolean(fieldErrors.guestName)}
                  disabled={isSaving}
                />
              </Field>

              <Field id="guestPhone" label="Telefon raqami" required errors={fieldErrors.guestPhone}>
                <Input
                  id="guestPhone"
                  inputMode="tel"
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value)}
                  placeholder="90 123 45 67"
                  hasError={Boolean(fieldErrors.guestPhone)}
                  disabled={isSaving}
                />
              </Field>
            </div>

            <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
              To&apos;lov hamyoningizdan yechiladi. Kirish kunigacha bekor qilib, pulni qaytarib olishingiz mumkin.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setSelectedRoom(null)} disabled={isSaving}>
                Bekor qilish
              </Button>
              <Button onClick={book} isLoading={isSaving} loadingText="Band qilinmoqda...">
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
