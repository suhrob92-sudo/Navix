'use client';

import { Clock, Star, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { CartBar } from '@/components/food/cart-bar';
import { RestaurantCard } from '@/components/food/restaurant-card';
import { RecentRow } from '@/components/recent/recent-row';
import { FilterChip } from '@/components/ui/filter-chip';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CUISINES } from '@/config/restaurants';
import { useApiQuery } from '@/hooks/use-api';
import type { RestaurantsResponse } from '@/modules/food/food.types';

const CUISINE_TABS = [{ value: '', label: 'Hammasi' }, ...CUISINES.map((c) => ({ value: c, label: c }))];

/**
 * Ovqat moduli — restoranlar ro'yxati.
 *
 * Qidiruv TAOM nomi bo'yicha ham ishlaydi: "lag'mon" deb yozgan odam
 * uni sotadigan restoranlarni ko'rishi kerak, aks holda har bir
 * restoranni ochib chiqishga majbur bo'lardi.
 */
export function FoodContent() {
  const [cuisine, setCuisine] = useState('');
  const [search, setSearch] = useState('');

  const query = new URLSearchParams();
  if (cuisine) query.set('cuisine', cuisine);
  if (search.trim()) query.set('search', search.trim());

  const { data, isLoading, error } = useApiQuery<RestaurantsResponse>(
    `/api/v1/food/restaurants?${query.toString()}`,
  );

  const restaurants = data?.restaurants ?? [];

  return (
    <>
      <AppHeader title="Ovqat" showBack backHref="/dashboard" />

      <div className="px-4 pt-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Restoran yoki taom qidiring"
          aria-label="Qidirish"
        />

        <div className="-mx-4 mt-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {CUISINE_TABS.map((tab) => (
            <FilterChip
              key={tab.value || 'all'}
              label={tab.label}
              active={cuisine === tab.value}
              onClick={() => setCuisine(tab.value)}
            />
          ))}
        </div>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Restoranlarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && restaurants.length === 0 && (
          <EmptyState
            icon={UtensilsCrossed}
            title="Restoran topilmadi"
            description="Boshqa so'z bilan qidiring yoki filtrni o'zgartiring."
          />
        )}

        <RecentRow target="RESTAURANT" className="mb-5" />

        <ul className="space-y-3">
          {restaurants.map((restaurant, index) => (
            <li key={restaurant.id}>
              <Link href={`/food/${restaurant.slug}`} className="block">
                <RestaurantCard restaurant={restaurant} index={index} />
              </Link>
            </li>
          ))}
        </ul>

        {/* Ro'yxat ostidagi izoh — reyting va vaqt nimani bildiradi */}
        {!isLoading && restaurants.length > 0 && (
          <p className="text-muted-foreground mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <Star className="size-3.5" aria-hidden="true" />
              Mijozlar bahosi
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" />
              Taxminiy yetkazish vaqti
            </span>
          </p>
        )}
      </div>

      <CartBar />
    </>
  );
}
