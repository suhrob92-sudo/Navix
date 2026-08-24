'use client';

import * as icons from 'lucide-react';
import { PackageSearch, Search, Store } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ActiveFilters } from '@/components/market/active-filters';
import { FilterSheet } from '@/components/market/filter-sheet';
import { MarketCartBar } from '@/components/market/market-cart-bar';
import { ProductCard } from '@/components/market/product-card';
import { RecentRow } from '@/components/recent/recent-row';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterChip } from '@/components/ui/filter-chip';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SORT_OPTIONS, activeFilterCount } from '@/config/product-filter';
import { useApiQuery } from '@/hooks/use-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useProductFilters } from '@/modules/market/use-product-filters';
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
  /**
   * Qidiruv so'zi ham MANZILDA saqlanadi.
   *
   * ── Nima uchun ────────────────────────────────────────────────────
   * Odam qidirib, mahsulotni ochib, orqaga qaytganda so'rovi
   * joyida qolishi kerak. Aks holda u hammasini qaytadan yozardi.
   *
   * Filtrlar bilan bir joyda saqlangani ham muhim: ular birga
   * ishlaydi va birga yo'qolishi kerak emas.
   */
  const { filters, update, clearOne, clearAll, queryString } = useProductFilters();

  const trimmed = (filters.search ?? '').trim();
  const isSearching = trimmed.length > 0;

  /**
   * Yozilayotgan matn ALOHIDA holatda.
   *
   * ── Nima uchun to'g'ridan-to'g'ri manzilga yozilmaydi ──────────────
   * Har bir harfda manzil yangilansa, brauzer tarixi va so'rov
   * har bosishda o'zgarardi — bu sekin va miltillovchi bo'lardi.
   *
   * Shuning uchun matn shu yerda yig'iladi va kechikish bilan
   * manzilga o'tadi.
   */
  const [draftSearch, setDraftSearch] = useState(filters.search ?? '');
  const debouncedSearch = useDebouncedValue(draftSearch, 400);

  useEffect(() => {
    const next = debouncedSearch.trim();

    if (next === (filters.search ?? '')) return;

    update({ search: next === '' ? undefined : next });
  }, [debouncedSearch, filters.search, update]);

  const categories = useApiQuery<CategoriesResponse>(isSearching ? null : '/api/v1/market/categories');
  const shops = useApiQuery<ShopsResponse>(isSearching ? null : '/api/v1/market/shops');

  const results = useApiQuery<ProductsResponse>(
    isSearching ? `/api/v1/market/products?${queryString}&pageSize=24` : null,
  );

  const isLoading = isSearching ? results.isLoading : categories.isLoading || shops.isLoading;
  const error = isSearching ? results.error : (categories.error ?? shops.error);

  return (
    <>
      <AppHeader title="Marketplace" showBack backHref="/dashboard" />

      <div className="px-4 pt-4 pb-4">
        <Input
          value={draftSearch}
          onChange={(event) => setDraftSearch(event.target.value)}
          placeholder="Mahsulot qidiring"
          aria-label="Qidirish"
        />

        {/*
          Filtr va saralash FAQAT qidiruv natijasida ko'rinadi.

          Toifalar sahifasida filtrlashning ma'nosi yo'q: u yerda
          mahsulot ro'yxati emas, bo'limlar turadi.
        */}
        {isSearching && (
          <>
            <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

            <ActiveFilters filters={filters} onClear={clearOne} className="mt-2" />
          </>
        )}

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
                description={
                  /*
                    Sabab AYTILADI: so'z topilmadimi yoki filtr
                    hammasini chiqarib tashladimi. Bir xil matn
                    ikkalasiga ham yozilsa, odam filtrni yechishni
                    o'ylamasdi.
                  */
                  activeFilterCount(filters) > 0
                    ? `"${trimmed}" bo'yicha tanlangan shartlarga mos mahsulot yo'q. Filtrni yumshatib ko'ring.`
                    : `"${trimmed}" bo'yicha mahsulot yo'q. Boshqa so'z bilan urinib ko'ring.`
                }
                action={
                  activeFilterCount(filters) > 0 ? (
                    <Button variant="outline" onClick={clearAll}>
                      Filtrni tozalash
                    </Button>
                  ) : undefined
                }
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
            {/*
              "Yaqinda ko'rgansiz" ENG YUQORIDA turadi.

              Qaytib kelgan odam odatda o'zi ko'rgan narsani
              izlaydi — toifalarni emas. Bo'sh bo'lsa bo'lim
              umuman chizilmaydi.
            */}
            <RecentRow target="PRODUCT" className="mt-5" />

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
                    {/*
                      Nom IKKI qatorga sig'adi.

                      Bir qatorda "Telefon va ga…" bo'lib kesilardi va
                      odam bo'lim nima haqidaligini bilmasdi. Belgi bilan
                      yonma-yon turgani uchun joy tor — ikkinchi qator
                      buni hal qiladi.
                    */}
                    <span className="line-clamp-2 text-sm leading-snug font-medium">{category.name}</span>
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
