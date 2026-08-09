'use client';

import { ArrowUpDown, Plane, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { TripCard } from '@/components/travel/trip-card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TRAVEL_CITIES } from '@/config/travel';
import { useApiQuery } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { dateKeyFromToday, type TripsResponse } from '@/modules/travel/travel.types';

const TRANSPORTS = [
  { value: '', label: 'Barchasi' },
  { value: 'PLANE', label: 'Samolyot' },
  { value: 'TRAIN', label: 'Poyezd' },
  { value: 'BUS', label: 'Avtobus' },
] as const;

const SORTS = [
  { value: 'time', label: 'Vaqt' },
  { value: 'price', label: 'Narx' },
] as const;

const CITY_OPTIONS = TRAVEL_CITIES.map((city) => ({ value: city, label: city }));

/**
 * Reys qidirish.
 *
 * ── Nima uchun "qayerdan / qayerga / qachon" MAJBURIY ─────────────────
 * Mehmonxonada butun ro'yxatni ko'rsatish mumkin edi. Reyslarda esa
 * bunday ro'yxatning ma'nosi yo'q: jadvalda o'nlab yo'nalish bor va
 * ularning aksariyati foydalanuvchiga aloqasiz.
 *
 * Shuning uchun uchta maydon boshidanoq to'ldirilgan holda keladi va
 * sahifa ochilishi bilan natija ko'rsatadi — bo'sh ekran emas.
 */
export function TravelContent() {
  const [from, setFrom] = useState<string>(TRAVEL_CITIES[0]);
  const [to, setTo] = useState<string>(TRAVEL_CITIES[1]);
  const [date, setDate] = useState(() => dateKeyFromToday(1));
  const [transport, setTransport] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('time');

  const isSameCity = from.toLowerCase() === to.toLowerCase();

  const url = useMemo(() => {
    if (isSameCity) return null;

    const params = new URLSearchParams({ from, to, date, sort });

    if (transport) params.set('transport', transport);

    return `/api/v1/travel/trips?${params.toString()}`;
  }, [from, to, date, transport, sort, isSameCity]);

  const { data, isLoading, error } = useApiQuery<TripsResponse>(url);

  /**
   * Shaharlar bir xil bo'lsa so'rov yuborilmaydi, lekin OLDINGI javob
   * xotirada qoladi. Uni ekranda qoldirish yolg'on manzara berardi:
   * yuqorida "shahar bir xil" deb qizil yozuv turib, pastda hamon eski
   * yo'nalish reyslari ko'rinardi.
   */
  const trips = isSameCity ? [] : (data?.trips ?? []);

  /** Shaharlarni almashtirish — qaytish yo'nalishini qidirishning eng tez yo'li. */
  function swapCities() {
    setFrom(to);
    setTo(from);
  }

  return (
    <>
      <AppHeader title="Sayohat" />

      <div className="px-4 pt-4">
        <section className="bg-card border-border animate-fade-up rounded-2xl border p-4">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field id="from" label="Qayerdan">
                <Select
                  id="from"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  options={CITY_OPTIONS}
                />
              </Field>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={swapCities}
              aria-label="Shaharlarni almashtirish"
              className="mb-0.5 shrink-0"
            >
              <ArrowUpDown className="size-4 rotate-90" aria-hidden="true" />
            </Button>

            <div className="min-w-0 flex-1">
              <Field id="to" label="Qayerga">
                <Select
                  id="to"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  options={CITY_OPTIONS}
                  hasError={isSameCity}
                />
              </Field>
            </div>
          </div>

          <div className="mt-3">
            <Field id="date" label="Qachon">
              <Input
                id="date"
                type="date"
                value={date}
                min={dateKeyFromToday(0)}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
          </div>

          {isSameCity && (
            <p className="text-destructive mt-2 text-xs">
              Jo&apos;nash va borish shahri bir xil — birini o&apos;zgartiring.
            </p>
          )}
        </section>

        <div className="mt-3 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Select
              aria-label="Transport turi"
              value={transport}
              onChange={(event) => setTransport(event.target.value)}
              options={TRANSPORTS.map((item) => ({ value: item.value, label: item.label }))}
            />
          </div>

          <div className="flex shrink-0 gap-1">
            {SORTS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSort(option.value)}
                aria-pressed={sort === option.value}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  sort === option.value ? 'border-primary text-primary' : 'border-border text-muted-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Link
          href="/travel/tickets"
          className="bg-card border-border mt-4 flex items-center gap-3 rounded-2xl border p-3.5 transition-transform active:scale-[0.99]"
        >
          <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-xl">
            <Ticket className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium">Chiptalarim</span>
        </Link>

        <div className="mt-4">
          {/*
            Shaharlar bir xil bo'lsa so'rov yuborilmaydi, demak yuklash
            ham tugamaydi. Skeletni ko'rsatish "yuklanyapti" degan yolg'on
            taassurot berardi — sabab esa yuqorida qizil matnda yozilgan.
          */}
          {isLoading && !isSameCity && (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-44 rounded-2xl" />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <Alert variant="error" title="Reyslarni yuklab bo'lmadi">
              {error}
            </Alert>
          )}

          {!isLoading && !error && !isSameCity && trips.length === 0 && (
            <EmptyState
              icon={Plane}
              title="Reys topilmadi"
              description="Bu kuni bu yo'nalishda reys yo'q. Boshqa sana yoki transport turini tanlang."
            />
          )}

          {!isLoading && !error && trips.length > 0 && (
            <>
              <p className="text-muted-foreground mb-3 text-sm">{`${trips.length} ta reys`}</p>

              <ul className="space-y-2">
                {trips.map((trip, index) => (
                  <li key={trip.scheduleId}>
                    <TripCard trip={trip} index={index} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}
