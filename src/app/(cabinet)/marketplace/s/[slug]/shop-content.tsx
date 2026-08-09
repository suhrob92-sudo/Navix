'use client';

import Link from 'next/link';

import { PackageSearch, Star, Truck, ChevronRight } from 'lucide-react';

import { AppHeader } from '@/components/app/app-header';
import { MarketCartBar } from '@/components/market/market-cart-bar';
import { ProductCard } from '@/components/market/product-card';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatTiyin } from '@/lib/money';
import type { ShopResponse } from '@/modules/market/market.types';

export interface ShopContentProps {
  slug: string;
}

/** Bitta do'kon va uning barcha mahsulotlari. */
export function ShopContent({ slug }: ShopContentProps) {
  const { data, isLoading, error } = useApiQuery<ShopResponse>(`/api/v1/market/shops/${slug}`);

  const shop = data?.shop;
  const products = data?.products ?? [];

  return (
    <>
      <AppHeader title={shop?.name ?? "Do'kon"} showBack backHref="/marketplace" />

      <div className="px-4 pt-4 pb-4">
        {isLoading && (
          <>
            <Skeleton className="h-24 rounded-2xl" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-40 rounded-2xl" />
              ))}
            </div>
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Do'konni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {shop && (
          <>
            <div className="bg-card border-border animate-fade-up rounded-2xl border p-4">
              <p className="text-sm leading-relaxed">{shop.description}</p>

              <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5" aria-hidden="true" />
                  {`${shop.rating.toFixed(1)} (${shop.ratingCount})`}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Truck className="size-3.5" aria-hidden="true" />
                  {`${shop.deliveryDays} kun · ${formatTiyin(shop.deliveryFee)}`}
                </span>
                <span>{`Eng kam buyurtma: ${formatTiyin(shop.minOrder)}`}</span>
              </div>

              {/* Profilda manzil, ish vaqti, telefon va obuna bor. */}
              <Link
                href={`/b/${slug}`}
                className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-medium hover:underline"
              >
                Profilni ochish
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>

            {products.length === 0 ? (
              <EmptyState
                icon={PackageSearch}
                title="Mahsulot yo'q"
                description="Bu do'kon hozircha mahsulot qo'shmagan."
                className="mt-4"
              />
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <MarketCartBar />
    </>
  );
}
