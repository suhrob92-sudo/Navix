'use client';

import { Minus, Package, PackageX, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatTiyin } from '@/lib/money';
import { toSearchText } from '@/lib/search';
import { cn } from '@/lib/utils';
import { LOW_STOCK_THRESHOLD, stockLabel, stockState } from '@/modules/market/market.types';
import { RequireSeller } from '@/modules/seller/require-seller';
import type { SellerProduct, SellerProductsResponse } from '@/modules/seller/seller.types';
import { SellerProductSheet } from '@/app/(seller)/seller/products/[id]/seller-product-sheet';
import { CatalogThumb } from '@/components/catalog/catalog-thumb';

export interface SellerProductsContentProps {
  shopId: string;
}

/**
 * Ombor — sotuvchi kabinetining yuragi.
 *
 * ── Nima uchun zaxira alohida tugmalar bilan ──────────────────────────
 * Kun davomida eng ko'p takrorlanadigan amal bitta: "bitta sotildi" yoki
 * "yangi partiya keldi". Buni har safar formani ochib, raqamni qo'lda
 * yozib bajarish telefonda uzoq va xatoga moyil.
 *
 * Shuning uchun kartochkada "−" va "+" tugmalari bor: bitta bosish —
 * bitta so'rov. Katta o'zgarish uchun esa forma ochiladi.
 *
 * Tugagan mahsulotlar TEPADA turadi (server shunday saralaydi): sotuvchi
 * kabinetga aynan shular uchun kiradi.
 */
export function SellerProductsContent({ shopId }: SellerProductsContentProps) {
  return (
    <RequireSeller>
      <ProductsBody shopId={shopId} />
    </RequireSeller>
  );
}

function ProductsBody({ shopId }: SellerProductsContentProps) {
  const request = useApiClient();

  const { data, isLoading, error, setData } = useApiQuery<SellerProductsResponse>(
    `/api/v1/seller/shops/${shopId}/products`,
  );

  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SellerProduct | null>(null);

  const products = useMemo(() => data?.products ?? [], [data]);
  const categories = data?.categories ?? [];

  /**
   * Qidiruv — katalogdagi bilan BIR XIL qoida bo'yicha.
   *
   * `toSearchText` ikkala tomonni ham bitta ko'rinishga keltiradi,
   * shuning uchun sotuvchi "lagmon" deb yozsa ham "Lag'mon" topiladi.
   */
  const visible = useMemo(() => {
    const needle = toSearchText(search);
    if (needle === '') return products;

    return products.filter((product) => toSearchText(product.name).includes(needle));
  }, [products, search]);

  /** Ro'yxatni qayta so'ramasdan bitta qatorni almashtiradi. */
  function replaceProduct(updated: SellerProduct) {
    setData((current) => ({
      products: (current?.products ?? []).map((row) => (row.id === updated.id ? updated : row)),
      categories: current?.categories ?? [],
    }));
  }

  async function changeStock(product: SellerProduct, delta: number) {
    const stock = Math.max(0, product.stock + delta);
    if (stock === product.stock) return;

    setSavingId(product.id);
    setActionError(null);

    try {
      const response = await request<{ product: SellerProduct }>(`/api/v1/seller/products/${product.id}`, {
        method: 'PATCH',
        body: { stock },
      });

      replaceProduct(response.product);
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setSavingId(null);
    }
  }

  const outOfStock = products.filter((product) => product.isActive && product.stock <= 0).length;

  return (
    <>
      <AdminHeader title="Ombor" showBack backHref="/seller" />

      <div className="px-4 pt-4">
        {error && (
          <Alert variant="error" title="Mahsulotlarni yuklab bo'lmadi" className="mb-4">
            {error}
          </Alert>
        )}

        {actionError && (
          <Alert variant="error" className="mb-4">
            {actionError}
          </Alert>
        )}

        {!isLoading && outOfStock > 0 && (
          <Alert variant="warning" className="mb-4">
            {`${outOfStock} ta mahsulot tugagan. Ular katalogda ko'rinadi, lekin sotib bo'lmaydi.`}
          </Alert>
        )}

        <Button fullWidth onClick={() => setIsCreateOpen(true)} disabled={isLoading || categories.length === 0}>
          <Plus className="size-4" aria-hidden="true" />
          Yangi mahsulot
        </Button>

        {products.length > 0 && (
          <div className="relative mt-4">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mahsulot nomi bo'yicha qidirish"
              className="pl-10"
              aria-label="Mahsulot qidirish"
            />
          </div>
        )}

        {isLoading && (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && !error && products.length === 0 && (
          <div className="mt-4">
            <EmptyState
              icon={Package}
              title="Ombor bo'sh"
              description="Bu do'konda hali mahsulot yo'q. Birinchisini qo'shing — u darhol katalogda paydo bo'ladi."
            />
          </div>
        )}

        {!isLoading && products.length > 0 && visible.length === 0 && (
          <p className="text-muted-foreground mt-6 text-center text-sm">Bunday nomli mahsulot topilmadi.</p>
        )}

        <ul className="mt-4 space-y-2">
          {visible.map((product) => {
            const state = stockState(product.stock);

            return (
              <li
                key={product.id}
                className={cn('bg-card border-border rounded-2xl border p-3', !product.isActive && 'opacity-60')}
              >
                <div className="flex items-start justify-between gap-3">
                  {/*
                    Rasm sotuvchiga ham kerak: rasmsiz mahsulotni
                    ro'yxatdan darhol ko'rish uchun.
                  */}
                  <CatalogThumb
                    image={product.images[0] ?? null}
                    name={product.name}
                    className="size-14 shrink-0 rounded-xl"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>

                    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm tabular-nums">{formatTiyin(product.price)}</span>
                      {product.oldPrice !== null && (
                        <span className="text-muted-foreground text-xs tabular-nums line-through">
                          {formatTiyin(product.oldPrice)}
                        </span>
                      )}
                    </div>

                    <p className="text-muted-foreground mt-0.5 truncate text-xs">{product.categoryName}</p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge
                      variant={state === 'out' ? 'destructive' : state === 'low' ? 'warning' : 'secondary'}
                      className="tabular-nums"
                    >
                      {stockLabel(product.stock)}
                    </Badge>

                    {!product.isActive && (
                      <span className="text-muted-foreground text-[0.625rem]">Sotuvda emas</span>
                    )}
                  </div>
                </div>

                {/*
                  Zaxira tugmalari — kunlik eng tez-tez bajariladigan amal.
                  "−" nolda to'xtaydi: manfiy zaxira ma'nosiz va server
                  ham uni qabul qilmaydi.
                */}
                <div className="border-border/60 mt-3 flex items-center gap-2 border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`${product.name} — zaxirani bittaga kamaytirish`}
                    disabled={savingId === product.id || product.stock <= 0}
                    onClick={() => changeStock(product, -1)}
                  >
                    <Minus className="size-4" aria-hidden="true" />
                  </Button>

                  <span className="min-w-12 text-center text-sm font-semibold tabular-nums">{product.stock}</span>

                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`${product.name} — zaxirani bittaga oshirish`}
                    disabled={savingId === product.id}
                    onClick={() => changeStock(product, 1)}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    disabled={savingId === product.id}
                    onClick={() => setEditing(product)}
                  >
                    Tahrirlash
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="text-muted-foreground mt-6 flex items-start gap-2 text-xs leading-relaxed">
          <PackageX className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {`Zaxira ${LOW_STOCK_THRESHOLD} tadan kam qolganda xaridorga "oz qoldi" deb ko'rsatiladi. Buyurtma berilganda son o'zi kamayadi — qo'lda tuzatish shart emas.`}
        </p>
      </div>

      {isCreateOpen && (
        <SellerProductSheet
          shopId={shopId}
          categories={categories}
          onClose={() => setIsCreateOpen(false)}
          onSaved={(created) => {
            setData((current) => ({
              products: [created, ...(current?.products ?? [])],
              categories: current?.categories ?? [],
            }));
            setIsCreateOpen(false);
          }}
        />
      )}

      {editing && (
        <SellerProductSheet
          shopId={shopId}
          categories={categories}
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            replaceProduct(updated);
            setEditing(null);
          }}
          /*
            Rasm o'zgarishi oynani YOPMAYDI: sotuvchi odatda bir
            necha rasmni ketma-ket qo'shadi.
          */
          onImagesChanged={(images) => {
            setEditing((current) => (current ? { ...current, images } : current));
            replaceProduct({ ...editing, images });
          }}
        />
      )}
    </>
  );
}
