'use client';

import { Search, ShoppingBag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatTiyin } from '@/lib/money';
import type { TaggedProductView } from '@/modules/feed/feed.types';
import type { ProductListItem } from '@/modules/market/market.types';

interface SearchResponse {
  products: ProductListItem[];
}

export interface ProductPickerProps {
  onPick: (product: TaggedProductView) => void;
  onCancel: () => void;
}

/**
 * Videoga biriktiriladigan mahsulotni tanlash oynasi.
 *
 * ── Nima uchun QIDIRUV, ro'yxat emas ─────────────────────────────────
 * Marketplace'da minglab mahsulot bor va ularni ro'yxat qilib
 * ko'rsatish foydasiz: odam o'zi ko'rsatgan narsani qidiradi va
 * uning nomini biladi.
 *
 * ── Nima uchun `<dialog>` ────────────────────────────────────────────
 * Brauzerning o'z elementi fokusni ushlab turishni, Escape bilan
 * yopishni va orqa fonni bloklashni bepul beradi.
 */
export function ProductPicker({ onPick, onCancel }: ProductPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [term, setTerm] = useState('');
  const query = useDebouncedValue(term.trim(), 300);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  /**
   * So'rov faqat IKKI belgidan keyin yuboriladi.
   *
   * Bitta harf bo'yicha qidiruv butun katalogni qaytaradi va u
   * foydasiz — lekin bazani yuklaydi.
   */
  const { data, isLoading } = useApiQuery<SearchResponse>(
    query.length >= 2 ? `/api/v1/market/products?search=${encodeURIComponent(query)}&pageSize=20` : null,
  );

  const products = data?.products ?? [];

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      className="glass animate-scale-in text-foreground m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-5 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Mahsulot biriktirish</h2>

        <Button variant="ghost" size="icon" aria-label="Yopish" onClick={onCancel}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Mahsulot nomi"
          aria-label="Mahsulot qidirish"
          className="pl-9"
          autoFocus
        />
      </div>

      <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
        {query.length < 2 && (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Videoda ko&apos;rsatgan mahsulot nomini yozing.
          </p>
        )}

        {query.length >= 2 && isLoading && (
          <>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </>
        )}

        {query.length >= 2 && !isLoading && products.length === 0 && (
          <p className="text-muted-foreground py-6 text-center text-sm">Hech narsa topilmadi.</p>
        )}

        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() =>
              onPick({
                id: product.id,
                name: product.name,
                slug: product.slug,
                priceTiyin: product.price,
                shopName: product.shop.name,
                isAvailable: true,
              })
            }
            className="hover:bg-secondary flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors"
          >
            {/*
              Mahsulotda rasm ustuni YO'Q — katalog hozircha faqat
              matnli. Shuning uchun belgi ishlatiladi; rasm qo'shilsa
              shu joyga tushadi.
            */}
            <span className="bg-secondary text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-lg">
              <ShoppingBag className="size-5" aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{product.name}</span>
              <span className="text-muted-foreground block truncate text-xs">
                {`${formatTiyin(product.price)} · ${product.shop.name}`}
              </span>
            </span>
          </button>
        ))}
      </div>
    </dialog>
  );
}
