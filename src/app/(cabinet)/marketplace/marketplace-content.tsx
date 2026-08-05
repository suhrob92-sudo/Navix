'use client';

import * as icons from 'lucide-react';
import { PackageSearch, Search, Store } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { MarketCartBar } from '@/components/market/market-cart-bar';
import { ProductCard } from '@/components/market/product-card';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatTiyin } from '@/lib/money';
import type { CategoriesResponse, ProductsResponse, ShopsResponse } from '@/modules/market/market.types';

/**
 * Marketplace bosh sahifasi.
 *
 * ── Nima uchun avval TOIFA, keyin do'kon ──────────────────────────────
 * Ovqatda odam avval restoranni tanlaydi — chunki taom joyga bog'liq.
 * Mahsulotda esa aksincha: odam "telefon" izlaydi, uni qaysi do'kon
 * sotishi ikkinchi darajali. Shuning uchun toifalar tepada turadi.
 *
 * Qidiruv yozilganda toifalar va do'konlar yashiriladi — ekranda faqat
 * natija qoladi.
 */
export function MarketplaceContent() {
  const [search, setSearch] = useState('');
  const trimmed = search.trim();
  const isSearching = trimmed.length > 0;

  const categories = useApiQuery<CategoriesResponse>(isSearching ? null : '/api/v1/market/categories');
  const shops = useApiQuery<ShopsResponse>(isSearching ? null : '/api/v1/market/shops');

  const results = useApiQuery<ProductsResponse>(
    isSearching ? `/api/v1/market/products?search=${encodeURIComponent(trimmed)}&pageSize=24` : null,
  );

  const isLoading = isSearching ? results.isLoading : categories.isLoading || shops.isLoading;
  const error = isSearching ? results.error : (categories.error ?? shops.error);

  return (
    <>
      <AppHeader title="Marketplace" showBack backHref="/dashboard" />

      <div className="px-4 pt-4 pb-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Mahsulot qidiring"
          aria-label="Qidirish"
        />

        {isLoading && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Yuklab bo'lmadi" className="mt-4">
            {error}
          </Alert>
        )}

        {/* ── Qidiruv natijasi ── */}
        {isSearching && !isLoading && !error && (
          <>
            {results.data && results.data.products.length === 0 ? (
              <EmptyState
                icon={PackageSearch}
                title="Hech narsa topilmadi"
                description={`"${trimmed}" bo'yicha mahsulot yo'q. Boshqa so'z bilan urinib ko'ring.`}
                className="mt-4"
              />
            ) : (
              <>
                <p className="text-muted-foreground mt-4 mb-3 text-xs">
                  {`${results.data?.total ?? 0} ta mahsulot topildi`}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(results.data?.products ?? []).map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Toifalar ── */}
        {!isSearching && !isLoading && !error && (
          <>
            <h2 className="mt-5 mb-3 text-sm font-semibold">Toifalar</h2>

            <div className="grid grid-cols-2 gap-3">
              {(categories.data?.categories ?? []).map((category, index) => (
                <Link
                  key={category.id}
                  href={`/marketplace/c/${category.slug}`}
                  className="bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-3 transition-transform active:scale-[0.99]"
                  style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
                >
                  <CategoryIcon name={category.icon} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{category.name}</span>
                    <span className="text-muted-foreground block text-xs">
                      {`${category.productCount} ta mahsulot`}
                    </span>
                  </span>
                </Link>
              ))}
            </div>

            <h2 className="mt-6 mb-3 text-sm font-semibold">Do&apos;konlar</h2>

            <ul className="space-y-2">
              {(shops.data?.shops ?? []).map((shop, index) => (
                <li key={shop.id}>
                  <Link
                    href={`/marketplace/s/${shop.slug}`}
                    className="bg-card border-border animate-fade-up block rounded-2xl border p-3 transition-transform active:scale-[0.99]"
                    style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="bg-secondary inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
                        <Store className="size-5" aria-hidden="true" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{shop.name}</p>
                        <p className="text-muted-foreground line-clamp-1 text-xs">{shop.description}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {`${shop.productCount} ta mahsulot · ${shop.deliveryDays} kun · eng kam ${formatTiyin(shop.minOrder)}`}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <MarketCartBar />
    </>
  );
}

/**
 * Toifa ikonkasi.
 *
 * Ikonka nomi bazadan keladi, shuning uchun uni ro'yxatdan izlaymiz.
 * Topilmasa — umumiy ikonka. Bu yerda xato chiqarish noto'g'ri
 * bo'lardi: bitta noto'g'ri nom butun sahifani buzmasligi kerak.
 */
function CategoryIcon({ name }: { name: string }) {
  const Icon = (icons as unknown as Record<string, typeof Search>)[name] ?? PackageSearch;

  return (
    <span className="bg-secondary inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}
