'use client';

import { PackageSearch } from 'lucide-react';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { MarketCartBar } from '@/components/market/market-cart-bar';
import { ProductCard } from '@/components/market/product-card';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import type { ProductQuery } from '@/modules/market/market.schemas';
import type { ProductsResponse } from '@/modules/market/market.types';

const SORTS: { value: ProductQuery['sort']; label: string }[] = [
  { value: 'popular', label: 'Ommabop' },
  { value: 'cheap', label: 'Avval arzoni' },
  { value: 'expensive', label: 'Avval qimmati' },
  { value: 'new', label: 'Yangilari' },
];

export interface CategoryContentProps {
  slug: string;
}

/** Toifa bo'yicha mahsulotlar — BARCHA do'konlardan. */
export function CategoryContent({ slug }: CategoryContentProps) {
  const [sort, setSort] = useState<ProductQuery['sort']>('popular');
  const [onlyInStock, setOnlyInStock] = useState(false);

  const query = new URLSearchParams({ category: slug, sort, pageSize: '30' });
  if (onlyInStock) query.set('inStock', 'true');

  const { data, isLoading, error } = useApiQuery<ProductsResponse>(
    `/api/v1/market/products?${query.toString()}`,
  );

  const products = data?.products ?? [];
  const categoryName = products[0]?.category.name ?? 'Toifa';

  return (
    <>
      <AppHeader title={categoryName} showBack backHref="/marketplace" />

      <div className="px-4 pt-4 pb-4">
        <div className="-mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {SORTS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSort(item.value)}
              aria-pressed={sort === item.value}
              className={cn(
                'shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                sort === item.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-secondary',
              )}
            >
              {item.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setOnlyInStock((current) => !current)}
            aria-pressed={onlyInStock}
            className={cn(
              'shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              onlyInStock
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:bg-secondary',
            )}
          >
            Faqat mavjud
          </button>
        </div>

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
              onlyInStock
                ? "Bu toifada hozir sotuvda mahsulot yo'q. Filtrni olib tashlab ko'ring."
                : "Bu toifa hozircha bo'sh."
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
