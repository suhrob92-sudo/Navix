'use client';

import Link from 'next/link';
import { ChevronRight, PackageSearch } from 'lucide-react';
import { useMemo } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ActiveFilters } from '@/components/market/active-filters';
import { FilterSheet } from '@/components/market/filter-sheet';
import { MarketCartBar } from '@/components/market/market-cart-bar';
import { ProductCard } from '@/components/market/product-card';
import { ShopHeader } from '@/components/market/shop-header';
import { ShopStats } from '@/components/market/shop-stats';
import { ReviewSection } from '@/components/review/review-section';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterChip } from '@/components/ui/filter-chip';
import { Skeleton } from '@/components/ui/skeleton';
import { SORT_OPTIONS, activeFilterCount } from '@/config/product-filter';
import { useApiQuery } from '@/hooks/use-api';
import { useProductFilters } from '@/modules/market/use-product-filters';
import type { ProductsResponse, ShopResponse } from '@/modules/market/market.types';

export interface ShopContentProps {
  slug: string;
}

/**
 * Sotuvchi do'koni.
 *
 * ── Nima uchun mahsulotlar ALOHIDA so'rov bilan olinadi ───────────────
 * Ilgari do'kon so'rovi uning BARCHA mahsulotlarini birdan
 * qaytarardi: filtrsiz, saralashsiz, sahifalashsiz.
 *
 * Mingta mahsulotli do'kon sahifasi mobil internetda ochilmasdi va
 * xaridor kerakli narsani topa olmasdi.
 *
 * Endi mahsulotlar katalog manzilidan olinadi va 43-bosqichdagi
 * filtrlarning HAMMASI shu yerda ham ishlaydi. Kod ham qayta
 * yozilmadi — o'sha komponentlar qayta ishlatildi.
 */
export function ShopContent({ slug }: ShopContentProps) {
  /**
   * Do'kon manzil YO'LIDA turadi (`/marketplace/s/texnomart`) va uni
   * filtr sifatida o'zgartirib bo'lmaydi.
   */
  const fixed = useMemo(() => ({ shop: slug }), [slug]);

  const { filters, update, clearOne, clearAll, queryString, fixedKeys } = useProductFilters({
    fixed,
  });

  const shopQuery = useApiQuery<ShopResponse>(`/api/v1/market/shops/${slug}`);

  const productsQuery = useApiQuery<ProductsResponse>(
    `/api/v1/market/products?${queryString}&pageSize=30`,
  );

  const shop = shopQuery.data?.shop;
  const stats = shopQuery.data?.stats;
  const products = productsQuery.data?.products ?? [];

  // Do'konning o'zi sanalmaydi — sabab `FilterKey` izohida.
  const hasFilters = activeFilterCount(filters, fixedKeys) > 0;

  return (
    <>
      <AppHeader title={shop?.name ?? "Do'kon"} showBack backHref="/marketplace" />

      <div className="px-4 pt-4 pb-4">
        {shopQuery.isLoading && <Skeleton className="h-64 rounded-2xl" />}

        {!shopQuery.isLoading && shopQuery.error && (
          <Alert variant="error" title="Do'konni yuklab bo'lmadi">
            {shopQuery.error}
          </Alert>
        )}

        {shop && (
          <>
            <ShopHeader shop={shop} />

            {stats && <ShopStats stats={stats} className="mt-6" />}

            {/* Profilda manzil, ish vaqti, telefon va obuna bor. */}
            <Link
              href={`/b/${slug}`}
              className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              Sotuvchi profilini ochish
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>

            {/* ── Mahsulotlar ────────────────────────────────────── */}
            <h2 className="mt-6 mb-3 text-base font-semibold">Mahsulotlar</h2>

            {/*
              Filtr qatorida `snap-x` YO'Q — u "Filtr" tugmasini
              ekrandan chiqarib yuborardi. Sabab toifa sahifasida
              batafsil yozilgan.
            */}
            <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <FilterSheet
                filters={filters}
                onApply={update}
                onClearAll={clearAll}
                /* Do'kon allaqachon tanlangan — uni yana tanlash ma'nosiz. */
                showShops={false}
                skip={fixedKeys}
              />

              {SORT_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={filters.sort === option.value}
                  onClick={() => update({ sort: option.value })}
                />
              ))}
            </div>

            <ActiveFilters
              filters={filters}
              skip={fixedKeys}
              onClear={clearOne}
              className="mb-3"
            />

            {!productsQuery.isLoading && !productsQuery.error && products.length > 0 && (
              <p className="text-muted-foreground mb-3 text-sm">
                {`${productsQuery.data?.total ?? products.length} ta mahsulot`}
              </p>
            )}

            {productsQuery.isLoading && (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-40 rounded-2xl" />
                ))}
              </div>
            )}

            {!productsQuery.isLoading && productsQuery.error && (
              <Alert variant="error" title="Mahsulotlarni yuklab bo'lmadi">
                {productsQuery.error}
              </Alert>
            )}

            {!productsQuery.isLoading && !productsQuery.error && products.length === 0 && (
              <EmptyState
                icon={PackageSearch}
                title="Mahsulot yo'q"
                description={
                  /*
                    Sabab AYTILADI: filtr tufaylimi yoki do'kon
                    hali mahsulot qo'shmaganmi.
                  */
                  hasFilters
                    ? "Tanlangan shartlarga mos mahsulot topilmadi. Filtrni yumshatib ko'ring."
                    : "Bu do'kon hozircha mahsulot qo'shmagan."
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

            <ReviewSection
              target="SHOP"
              targetId={shop.id}
              title="Do'kon haqida sharhlar"
              className="mt-6"
            />
          </>
        )}
      </div>

      <MarketCartBar />
    </>
  );
}
