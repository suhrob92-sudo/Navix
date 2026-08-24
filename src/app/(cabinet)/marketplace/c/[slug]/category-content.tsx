'use client';

import { PackageSearch } from 'lucide-react';
import { useMemo } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ActiveFilters } from '@/components/market/active-filters';
import { FilterSheet } from '@/components/market/filter-sheet';
import { MarketCartBar } from '@/components/market/market-cart-bar';
import { ProductCard } from '@/components/market/product-card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterChip } from '@/components/ui/filter-chip';
import { Skeleton } from '@/components/ui/skeleton';
import { SORT_OPTIONS, activeFilterCount } from '@/config/product-filter';
import { useApiQuery } from '@/hooks/use-api';
import { useProductFilters } from '@/modules/market/use-product-filters';
import type { ProductsResponse } from '@/modules/market/market.types';

export interface CategoryContentProps {
  slug: string;
}

/**
 * Toifa bo'yicha mahsulotlar — BARCHA do'konlardan.
 *
 * ── Nima uchun filtrlar MANZILDA ──────────────────────────────────────
 * Odam mahsulotni ochib, orqaga qaytganda filtrlari joyida qolishi
 * kerak. Sabab `use-product-filters.ts` da batafsil.
 */
export function CategoryContent({ slug }: CategoryContentProps) {
  /**
   * Toifa manzil YO'LIDA turadi (`/marketplace/c/telefon`) va uni
   * filtr sifatida o'zgartirib bo'lmaydi.
   */
  const fixed = useMemo(() => ({ category: slug }), [slug]);

  const { filters, update, clearOne, clearAll, queryString } = useProductFilters({ fixed });

  const { data, isLoading, error } = useApiQuery<ProductsResponse>(
    `/api/v1/market/products?${queryString}&pageSize=30`,
  );

  const products = data?.products ?? [];
  const categoryName = products[0]?.category.name ?? 'Toifa';

  const hasFilters = activeFilterCount(filters) > 0;

  return (
    <>
      <AppHeader title={categoryName} showBack backHref="/marketplace" />

      <div className="px-4 pt-4 pb-4">
        {/*
          ── HAQIQIY XATO: "Filtr" tugmasi ko'rinmasdi ──────────────
          Ilgari bu qatorda `snap-x` bor edi. Tanlov belgilarida
          (`FilterChip`) `snap-start` yozilgan, "Filtr" tugmasida
          esa yo'q.

          Natijada brauzer sahifa ochilishi bilan qatorni birinchi
          BELGIGA surib qo'yardi va "Filtr" tugmasi chapga chiqib
          ketardi — ya'ni butun bosqichning asosiy tugmasi
          ko'rinmasdi.
        */}
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterSheet filters={filters} onApply={update} onClearAll={clearAll} />

          {SORT_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={filters.sort === option.value}
              onClick={() => update({ sort: option.value })}
            />
          ))}
        </div>

        <ActiveFilters filters={filters} onClear={clearOne} className="mb-3" />

        {/*
          Topilgan mahsulotlar SONI.

          Filtr qo'llagan odamning birinchi savoli — "nechta
          qoldi?". Uni ro'yxatni sanab chiqishga majburlash
          keraksiz.
        */}
        {!isLoading && !error && products.length > 0 && (
          <p className="text-muted-foreground mb-3 text-sm">
            {`${data?.total ?? products.length} ta mahsulot`}
          </p>
        )}

        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && products.length === 0 && (
          <EmptyState
            icon={PackageSearch}
            title="Mahsulot yo'q"
            description={
              /*
                Sabab AYTILADI: filtr tufaylimi yoki toifa
                bo'shmi. Bir xil matn ikkalasiga ham yozilsa,
                odam filtrni yechishni o'ylamasdi.
              */
              hasFilters
                ? "Tanlangan shartlarga mos mahsulot topilmadi. Filtrni yumshatib ko'ring."
                : "Bu toifa hozircha bo'sh."
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearAll}>
                  Filtrni tozalash
                </Button>
              ) : undefined
            }
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>

      <MarketCartBar />
    </>
  );
}
