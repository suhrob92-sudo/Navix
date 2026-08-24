'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FilterChip } from '@/components/ui/filter-chip';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RATING_OPTIONS,
  SORT_OPTIONS,
  activeFilterCount,
  priceRangeError,
  type FilterKey,
  type ProductFilters,
} from '@/config/product-filter';
import { useApiQuery } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import type { ProductFacets } from '@/modules/market/facet.service';

/**
 * Filtr oynasi.
 *
 * ── Nima uchun PASTDAN chiqadigan oyna ────────────────────────────────
 * Filtrlarni sahifaning yon tomoniga qo'yish mumkin edi —
 * kompyuterda shunday qilishadi. Lekin telefonda yon tomon yo'q:
 * ekran kengligi 400 piksel.
 *
 * Pastdan chiqadigan oyna esa barmoq yetadigan joyda ochiladi va
 * uni yopish uchun pastga surish kifoya — bu telefonda eng tabiiy
 * harakat.
 *
 * ── Nima uchun natija DARHOL o'zgarmaydi ──────────────────────────────
 * Har bir bosishda ro'yxatni qayta yuklash mumkin edi va u
 * "jonli" ko'rinardi.
 *
 * Lekin odam odatda bir necha filtrni ketma-ket tanlaydi: narx,
 * keyin do'kon, keyin baho. Har birida so'rov ketsa, u uchta
 * keraksiz so'rov va uchta miltillash bo'lardi.
 *
 * Shuning uchun tanlovlar oyna ichida yig'iladi va "Ko'rsatish"
 * tugmasi bosilganda BIR MARTA qo'llanadi.
 */

export interface FilterSheetProps {
  filters: ProductFilters;
  onApply: (patch: Partial<ProductFilters>) => void;
  onClearAll: () => void;
  /** Do'kon filtri kerakmi — do'kon sahifasida u ortiqcha. */
  showShops?: boolean;
  /**
   * Tugmadagi sonda hisobga OLINMAYDIGAN maydonlar.
   *
   * Do'kon sahifasida do'kon har doim tanlangan — uni sanash
   * tugmada abadiy "1" yozib qo'yardi.
   */
  skip?: readonly FilterKey[];
  className?: string;
}

export function FilterSheet({
  filters,
  onApply,
  onClearAll,
  showShops = true,
  skip,
  className,
}: FilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const count = activeFilterCount(filters, skip);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn('shrink-0', className)}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filtr
        {/*
          Yoqilgan filtrlar SONI ko'rsatiladi.

          Filtrlar yopiq oynada turadi va odam ularni ko'rmaydi.
          Usiz u "nega bu yerda kam mahsulot bor?" deb hayron
          bo'lardi — kechagi filtr hali ham yoqilganini unutib.
        */}
        {count > 0 && (
          <span className="bg-primary text-primary-foreground ml-0.5 inline-flex size-5 items-center justify-center rounded-full text-[0.625rem] font-semibold tabular-nums">
            {count}
          </span>
        )}
      </Button>

      {isOpen && (
        <FilterDialog
          filters={filters}
          showShops={showShops}
          onClose={() => setIsOpen(false)}
          onApply={(patch) => {
            onApply(patch);
            setIsOpen(false);
          }}
          onClearAll={() => {
            onClearAll();
            setIsOpen(false);
          }}
        />
      )}
    </>
  );
}

/** Oynaning o'zi — ochilgandagina chiziladi. */
function FilterDialog({
  filters,
  showShops,
  onClose,
  onApply,
  onClearAll,
}: {
  filters: ProductFilters;
  showShops: boolean;
  onClose: () => void;
  onApply: (patch: Partial<ProductFilters>) => void;
  onClearAll: () => void;
}) {
  /**
   * Fasetlar oyna OCHILGANDA so'raladi.
   *
   * Ular har bir sahifada emas, faqat shu yerda kerak: katalogni
   * varaqlagan odam uchun uchta ortiqcha hisob-kitob bekorga
   * bajarilardi.
   */
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.shop) params.set('shop', filters.shop);
  if (filters.inStock) params.set('inStock', 'true');
  if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));

  const facets = useApiQuery<ProductFacets>(`/api/v1/market/facets?${params.toString()}`);

  /** Oyna ichidagi vaqtinchalik tanlov — sabab komponent izohida. */
  const [draft, setDraft] = useState<ProductFilters>(filters);
  const [minText, setMinText] = useState(
    filters.minPriceSom === undefined ? '' : String(filters.minPriceSom),
  );
  const [maxText, setMaxText] = useState(
    filters.maxPriceSom === undefined ? '' : String(filters.maxPriceSom),
  );

  const toNumber = (value: string): number | undefined => {
    const trimmed = value.trim();

    if (trimmed === '') return undefined;

    const parsed = Number(trimmed);

    return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
  };

  const minPriceSom = toNumber(minText);
  const maxPriceSom = toNumber(maxText);
  const rangeError = priceRangeError(minPriceSom, maxPriceSom);

  const range = facets.data?.priceRange;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-card animate-slide-up max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Filtr</h2>

          <button
            type="button"
            aria-label="Yopish"
            onClick={onClose}
            className="text-muted-foreground hover:bg-secondary inline-flex size-8 items-center justify-center rounded-lg transition-colors"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5">
          {/* ── Saralash ── */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium">Saralash</h3>

            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={draft.sort === option.value}
                  onClick={() => setDraft((current) => ({ ...current, sort: option.value }))}
                />
              ))}
            </div>
          </section>

          {/* ── Narx ── */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium">Narx (so&apos;m)</h3>

            {facets.isLoading ? (
              <Skeleton className="h-4 w-40" />
            ) : (
              range && (
                /*
                  Haqiqiy oraliq AYTILADI.

                  "Narxni kiriting" degan bo'sh maydon foydasiz:
                  odam bu toifadagi narxlar 50 mingdanmi yoki
                  5 milliondanmi boshlanishini bilmaydi.
                */
                <p className="text-muted-foreground mb-2 text-xs">
                  {`Bu yerda: ${range.minSom} — ${range.maxSom} so'm`}
                </p>
              )
            )}

            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                value={minText}
                onChange={(event) => setMinText(event.target.value)}
                placeholder={range ? String(range.minSom) : 'Eng kam'}
                aria-label="Eng kam narx"
                hasError={rangeError !== null}
              />
              <span className="text-muted-foreground shrink-0 text-sm">—</span>
              <Input
                type="number"
                inputMode="numeric"
                value={maxText}
                onChange={(event) => setMaxText(event.target.value)}
                placeholder={range ? String(range.maxSom) : "Eng ko'p"}
                aria-label="Eng ko'p narx"
                hasError={rangeError !== null}
              />
            </div>

            {rangeError && (
              <Alert variant="error" className="mt-2">
                {rangeError}
              </Alert>
            )}
          </section>

          {/* ── Do'konlar ── */}
          {showShops && (
            <section>
              <h3 className="text-muted-foreground mb-2 text-xs font-medium">Do&apos;kon</h3>

              {facets.isLoading ? (
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-28 rounded-full" />
                </div>
              ) : (facets.data?.shops ?? []).length === 0 ? (
                <p className="text-muted-foreground text-xs">Do&apos;kon topilmadi.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(facets.data?.shops ?? []).map((shop) => (
                    <FilterChip
                      key={shop.slug}
                      /*
                        Mahsulot SONI ko'rsatiladi: odam qaysi
                        do'konda ko'proq tanlov borligini darhol
                        ko'radi va bo'sh natijaga tushmaydi.
                      */
                      label={`${shop.name} (${shop.count})`}
                      active={draft.shop === shop.slug}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          shop: current.shop === shop.slug ? undefined : shop.slug,
                        }))
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Baho ── */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium">Baho</h3>

            <div className="flex flex-wrap gap-2">
              {RATING_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={draft.minRating === option.value}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      minRating: current.minRating === option.value ? undefined : option.value,
                    }))
                  }
                />
              ))}
            </div>
          </section>

          {/* ── Boshqa ── */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium">Qo&apos;shimcha</h3>

            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="Faqat mavjud"
                active={draft.inStock === true}
                onClick={() =>
                  setDraft((current) => ({ ...current, inStock: current.inStock ? undefined : true }))
                }
              />

              <FilterChip
                label={
                  facets.data ? `Chegirmada (${facets.data.discountCount})` : 'Chegirmada'
                }
                active={draft.hasDiscount === true}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    hasDiscount: current.hasDiscount ? undefined : true,
                  }))
                }
              />
            </div>
          </section>
        </div>

        <div className="bg-card sticky bottom-0 mt-5 flex gap-2 pt-3">
          <Button type="button" variant="outline" fullWidth onClick={onClearAll}>
            Tozalash
          </Button>

          <Button
            type="button"
            fullWidth
            disabled={rangeError !== null}
            onClick={() => onApply({ ...draft, minPriceSom, maxPriceSom })}
          >
            Ko&apos;rsatish
          </Button>
        </div>
      </div>
    </div>
  );
}
