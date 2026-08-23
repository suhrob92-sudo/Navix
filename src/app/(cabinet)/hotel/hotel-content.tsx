'use client';

import { Building2, CalendarDays, Search, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { HotelCard } from '@/components/hotel/hotel-card';
import { RecentRow } from '@/components/recent/recent-row';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { countNights, dateKeyFromToday, formatNights, type HotelsResponse } from '@/modules/hotel/hotel.types';

const SORTS = [
  { value: 'popular', label: 'Tavsiya' },
  { value: 'price', label: 'Narx' },
  { value: 'rating', label: 'Reyting' },
] as const;

/**
 * Mehmonxonalar ro'yxati.
 *
 * ── Nima uchun sanalar YUQORIDA ───────────────────────────────────────
 * Mehmonxona tanlash "qayerda" degan savoldan emas, "qachon" degan
 * savoldan boshlanadi: bo'sh xona bormi degan javob shunga bog'liq.
 *
 * Sanalar tanlanmagan bo'lsa ham ro'yxat ko'rsatiladi — odam avval
 * narxlarni ko'rishi mumkin.
 */
export function HotelContent() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('popular');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Standart: ertadan bir kecha — eng ko'p uchraydigan holat.
  const [checkIn, setCheckIn] = useState(() => dateKeyFromToday(1));
  const [checkOut, setCheckOut] = useState(() => dateKeyFromToday(2));

  const nights = countNights(checkIn, checkOut);
  const hasValidDates = nights > 0;

  const params = useMemo(() => {
    const result = new URLSearchParams({ pageSize: '20', sort });

    if (query) result.set('search', query);
    if (city) result.set('city', city);

    return result.toString();
  }, [query, city, sort]);

  const { data, isLoading, error } = useApiQuery<HotelsResponse>(`/api/v1/hotels?${params}`);

  const hotels = data?.hotels ?? [];
  const cities = data?.cities ?? [];

  return (
    <>
      <AppHeader title="Mehmonxona" />

      <div className="px-4 pt-4">
        {/* Sanalar */}
        <section className="bg-card border-border animate-fade-up rounded-2xl border p-4">
          <div className="grid grid-cols-2 gap-3">
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

        {/* Qidiruv */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
          }}
          className="relative mt-4"
        >
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Mehmonxona yoki shahar"
            aria-label="Mehmonxona qidirish"
            className="pl-10"
          />
        </form>

        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterOpen((current) => !current)}
            aria-expanded={isFilterOpen}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Shahar
            {city && (
              <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 text-xs">1</span>
            )}
          </Button>

          <div className="ml-auto flex gap-1">
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

        {isFilterOpen && (
          <div className="bg-card border-border animate-fade-up mt-3 rounded-2xl border p-4">
            <Select
              aria-label="Shahar"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Barcha shaharlar"
              options={cities.map((item) => ({ value: item, label: item }))}
            />
          </div>
        )}

        {/* Bandlovlarim */}
        <Link
          href="/hotel/bookings"
          className="bg-card border-border mt-4 flex items-center gap-3 rounded-2xl border p-3.5 transition-transform active:scale-[0.99]"
        >
          <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-xl">
            <CalendarDays className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium">Bandlovlarim</span>
        </Link>

        {/* Ro'yxat */}
        <div className="mt-4">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-48 rounded-2xl" />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <Alert variant="error" title="Mehmonxonalarni yuklab bo'lmadi">
              {error}
            </Alert>
          )}

          {!isLoading && !error && hotels.length === 0 && (
            <EmptyState
              icon={Building2}
              title="Mehmonxona topilmadi"
              description={
                query || city
                  ? "Shartlarni yumshatib ko'ring — boshqa shahar yoki so'z tanlang."
                  : "Hozircha mehmonxona yo'q."
              }
            />
          )}

          <RecentRow target="HOTEL" className="mb-5" />

          {!isLoading && !error && hotels.length > 0 && (
            <>
              <p className="text-muted-foreground mb-3 text-sm">{`${data?.total ?? hotels.length} ta mehmonxona`}</p>

              <ul className="space-y-2">
                {hotels.map((hotel, index) => (
                  <li key={hotel.id}>
                    <HotelCard
                      hotel={hotel}
                      index={index}
                      dates={hasValidDates ? { checkIn, checkOut } : undefined}
                    />
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
