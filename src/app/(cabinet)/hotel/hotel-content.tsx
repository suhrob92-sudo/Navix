'use client';

import { Building2, CalendarDays, List, Map as MapIcon, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { HotelActiveFilters } from '@/components/hotel/hotel-active-filters';
import { HotelCard } from '@/components/hotel/hotel-card';
import { HotelFilterSheet } from '@/components/hotel/hotel-filter-sheet';
import { HotelMap } from '@/components/hotel/hotel-map';
import { RecentRow } from '@/components/recent/recent-row';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { activeHotelFilterCount } from '@/config/hotel-filters';
import { useApiQuery } from '@/hooks/use-api';
import { formatCompactTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useHotelFilters } from '@/modules/hotel/use-hotel-filters';
import { countNights, dateKeyFromToday, formatNights, type HotelsResponse } from '@/modules/hotel/hotel.types';

/**
 * Mehmonxonalar ro'yxati.
 *
 * ── Nima uchun sanalar YUQORIDA ───────────────────────────────────────
 * Mehmonxona tanlash "qayerda" degan savoldan emas, "qachon" degan
 * savoldan boshlanadi: bo'sh xona bormi degan javob shunga bog'liq.
 *
 * Sanalar tanlanmagan bo'lsa ham ro'yxat ko'rsatiladi — odam avval
 * narxlarni ko'rishi mumkin.
 *
 * ── Nima uchun XARITA alohida ko'rinish ───────────────────────────────
 * Xaritani ro'yxat ustiga qo'yish mumkin edi. Lekin telefon ekranida
 * u ro'yxatning yarmini yeb qo'yardi va varaqlash noqulay bo'lardi.
 *
 * Ikkalasi bir xil ma'lumotni ikki xil savolga javob berish uchun
 * ko'rsatadi: ro'yxat "qaysi biri yaxshiroq", xarita esa "qaysi biri
 * yaqinroq". Odam qaysi savol bilan kelganini o'zi biladi.
 */
export function HotelContent() {
  const { filters, apply, update, clearOne, clearAll, queryString } = useHotelFilters();

  const [search, setSearch] = useState(filters.search ?? '');
  const [view, setView] = useState<'list' | 'map'>('list');

  // Standart: ertadan bir kecha — eng ko'p uchraydigan holat.
  const [checkIn, setCheckIn] = useState(() => dateKeyFromToday(1));
  const [checkOut, setCheckOut] = useState(() => dateKeyFromToday(2));

  const nights = countNights(checkIn, checkOut);
  const hasValidDates = nights > 0;

  const params = useMemo(() => {
    const result = new URLSearchParams(queryString);

    /*
      Xaritada BARCHA topilganlar ko'rinishi kerak: bir sahifada
      20 tasi bo'lsa, qolganlari xaritada yo'q bo'lib qolardi va
      odam "bu tumanda mehmonxona yo'q ekan" deb xato xulosa
      chiqarardi.
    */
    result.set('pageSize', view === 'map' ? '100' : '20');

    return result.toString();
  }, [queryString, view]);

  const { data, isLoading, error } = useApiQuery<HotelsResponse>(`/api/v1/hotels?${params}`);

  const hotels = data?.hotels ?? [];
  const cities = data?.cities ?? [];
  const districts = data?.districts ?? [];

  const dates = hasValidDates ? { checkIn, checkOut } : undefined;
  const filterCount = activeHotelFilterCount(filters);

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
            update({ search: search.trim() || undefined });
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
          <HotelFilterSheet
            filters={filters}
            cities={cities}
            districts={districts}
            onApply={apply}
            onClearAll={clearAll}
          />

          {/*
            ── Ko'rinish almashtirgichi ────────────────────────────────
            Ikkita tugma emas, bitta almashtirgich: hozir qaysi
            ko'rinishda ekani va boshqasi borligi bir qarashda
            ko'rinadi.
          */}
          <div className="border-border ml-auto inline-flex overflow-hidden rounded-full border">
            {(
              [
                { value: 'list', label: "Ro'yxat", icon: List },
                { value: 'map', label: 'Xarita', icon: MapIcon },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setView(option.value)}
                aria-pressed={view === option.value}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                  view === option.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                )}
              >
                <option.icon className="size-3.5" aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <HotelActiveFilters
          filters={filters}
          format={(som) => formatCompactTiyin(som * 100)}
          onClear={clearOne}
          className="mt-3"
        />

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

        {/* Natija */}
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
                filterCount > 0 || filters.search
                  ? "Shartlarni yumshatib ko'ring — bittasini olib tashlash ham yetishi mumkin."
                  : "Hozircha mehmonxona yo'q."
              }
            />
          )}

          {view === 'list' && <RecentRow target="HOTEL" className="mb-5" />}

          {!isLoading && !error && hotels.length > 0 && (
            <>
              <p className="text-muted-foreground mb-3 text-sm">{`${data?.total ?? hotels.length} ta mehmonxona`}</p>

              {view === 'map' ? (
                <HotelMap hotels={hotels} dates={dates} className="animate-fade-up" />
              ) : (
                <ul className="space-y-2">
                  {hotels.map((hotel, index) => (
                    <li key={hotel.id}>
                      <HotelCard hotel={hotel} index={index} dates={dates} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
