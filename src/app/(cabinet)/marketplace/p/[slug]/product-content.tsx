'use client';

import { Store, Truck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { CatalogGallery } from '@/components/catalog/catalog-gallery';
import { RecentTracker } from '@/components/recent/recent-tracker';
import { ReviewSection } from '@/components/review/review-section';
import { LinkedPosts } from '@/components/feed/linked-posts';
import { AttributeTable } from '@/components/market/attribute-table';
import { DeliveryPromise } from '@/components/market/delivery-promise';
import { MarketCartBar } from '@/components/market/market-cart-bar';
import { QuestionSection } from '@/components/market/question-section';
import { ProductCard } from '@/components/market/product-card';
import { QuantityStepper } from '@/components/market/quantity-stepper';
import { VariantPicker, selectedVariantOf } from '@/components/market/variant-picker';
import { PICK_VARIANT_TEXT, needsFromPrefix } from '@/config/product-variant';
import { emptyVariants, pruneSelection } from '@/modules/product/product-variant.types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatTiyin } from '@/lib/money';
import { MAX_ITEM_QUANTITY } from '@/modules/market/market.schemas';
import { stockLabel, stockState, type ProductResponse } from '@/modules/market/market.types';
import { useMarketCart } from '@/modules/market/use-market-cart';

export interface ProductContentProps {
  slug: string;
}

/**
 * Mahsulot sahifasi.
 *
 * ── Nima uchun miqdor SHU YERDA tanlanadi ─────────────────────────────
 * Ovqatda har bosishda bittadan qo'shilardi — taom arzon va odam
 * odatda 1-2 ta oladi. Mahsulotda esa "3 ta futbolka" odatiy holat,
 * savatga borib sonini o'zgartirish esa ortiqcha qadam.
 */
export function ProductContent({ slug }: ProductContentProps) {
  const cart = useMarketCart();
  const { data, isLoading, error } = useApiQuery<ProductResponse>(`/api/v1/market/products/${slug}`);

  const [quantity, setQuantity] = useState(1);
  /**
   * Tanlangan variant qiymatlari — tanlovlar tartibida.
   *
   * ── Nima uchun boshida BO'SH ────────────────────────────────────────
   * Birinchi variantni avtomatik tanlash mumkin edi va sahifa
   * "tayyor" ko'rinardi.
   *
   * Lekin unda odam o'zi tanlamagan rangni sotib olib qo'yishi
   * mumkin edi: u narxni ko'rdi, tugmani bosdi va rang haqida
   * o'ylamadi ham.
   */
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [conflictShop, setConflictShop] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const product = data?.product ?? null;
  const related = data?.related ?? [];

  const variantData = product?.variants ?? emptyVariants();
  const hasVariants = variantData.options.length > 0;
  const variant = product ? selectedVariantOf(variantData, selectedValues) : null;

  /**
   * Narx va zaxira VARIANTDAN olinadi.
   *
   * Variant tanlanmagan bo'lsa, mahsulotdagi nusxa ko'rsatiladi —
   * u eng arzon variantning narxi va umumiy zaxira.
   */
  const price = variant?.price ?? product?.price ?? 0;
  const oldPrice = variant ? variant.oldPrice : (product?.oldPrice ?? null);
  const stock = variant?.stock ?? product?.stock ?? 0;

  /**
   * Narxlar har xil bo'lsa, "dan" belgisi qo'yiladi.
   *
   * Aks holda katalogdagi narx YOLG'ON bo'lardi: odam
   * 4 290 000 so'mni ko'rib kirsa, ichkarida 5 890 000 so'mni
   * ko'rardi.
   */
  const showFromPrefix =
    hasVariants && variant === null && needsFromPrefix(variantData.variants.map((row) => row.price));

  const state = stockState(stock);
  const isOut = state === 'out';

  /** Variantli mahsulotda tanlov MAJBURIY. */
  const needsPick = hasVariants && variant === null;

  /** Omborda bor sondan ham, bir buyurtmadagi chegaradan ham oshmaydi. */
  const maxQuantity = Math.min(stock, MAX_ITEM_QUANTITY);

  function handleAdd() {
    if (!product) return;

    const result = cart.add(product.shop, product.id, quantity, variant?.id ?? null);

    if (!result.ok) {
      setConflictShop(result.conflictWith);
      return;
    }

    setAdded(true);
  }

  return (
    <>
      <AppHeader title={product?.name ?? 'Mahsulot'} showBack backHref="/marketplace" />

      <div className="space-y-5 px-4 pt-4 pb-4">
        {isLoading && (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Mahsulotni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {product && (
          <>
            {/*
              ── SAHIFA TARTIBI ────────────────────────────────────────
              Xaridor sahifani yuqoridan pastga o'qimaydi — u SAVOL
              ketma-ketligi bo'yicha qaraydi:

                1. "bu nima?"         → galereya va nom;
                2. "qancha turadi?"   → narx;
                3. "qachon keladi?"   → yetkazish sanasi;
                4. "olamanmi?"        → savatga tugmasi;
                5. "batafsil-chi?"    → tavsif va xususiyatlar;
                6. "boshqalar-chi?"   → baholar;
                7. "savolim bor"      → savol-javob.

              Batafsil izoh `src/config/product-detail.ts` da.
            */}
            <CatalogGallery images={product.images} name={product.name} className="animate-fade-up" />

            {/* 1-2. Nima va qancha */}
            <div className="bg-card border-border animate-fade-up rounded-2xl border p-4">
              <h1 className="text-base leading-snug font-semibold">{product.name}</h1>

              {/*
                `flex-wrap` SHART: narx, eski narx va tejamkorlik
                belgisi telefon ekranida bitta qatorga sig'maydi va
                belgi chetdan chiqib ketardi.
              */}
              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <span className="text-2xl font-semibold tabular-nums">
                  {/*
                    "dan" qo'shimchasi BO'SHLIQSIZ yoziladi.

                    O'zbekchada u so'zga qo'shilib ketadi:
                    "4 290 000 so'mdan", "so'm dan" emas.
                  */}
                  {showFromPrefix ? `${formatTiyin(price)}dan` : formatTiyin(price)}
                </span>

                {oldPrice !== null && oldPrice > price && (
                  <>
                    <span className="text-muted-foreground text-sm tabular-nums line-through">
                      {formatTiyin(oldPrice)}
                    </span>

                    {/*
                      Tejamkorlik AYTILADI.

                      Chizilgan eski narx o'zi ham ko'rinadi, lekin
                      "600 000 so'm tejaysiz" degan yozuv qarorni
                      tezlashtiradi: odam hisoblab o'tirmaydi.
                    */}
                    <Badge variant="success">{`${formatTiyin(oldPrice - price)} tejaysiz`}</Badge>
                  </>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Badge variant={isOut ? 'destructive' : state === 'low' ? 'warning' : 'success'}>
                  {stockLabel(stock)}
                </Badge>
                <Link
                  href={`/marketplace/c/${product.category.slug}`}
                  className="text-primary text-xs font-medium"
                >
                  {product.category.name}
                </Link>
              </div>

              {/*
                Variant tanlash — narxdan KEYIN, savatdan OLDIN.

                Narxdan oldin qo'yilsa, odam nima uchun tanlash
                kerakligini bilmasdi. Savatdan keyin esa u
                tanlamasdan tugmani bosardi.
              */}
              {hasVariants && (
                <div className="border-border/60 mt-3.5 border-t pt-3.5">
                  <VariantPicker
                    data={variantData}
                    selected={selectedValues}
                    onSelect={(optionIndex, valueId) => {
                      setSelectedValues((current) => {
                        /*
                          Shu tanlovdagi eski qiymat olib
                          tashlanadi: bitta tanlovdan faqat
                          bittasi tanlanadi.
                        */
                        const optionValueIds = variantData.options[optionIndex].values.map(
                          (value) => value.id,
                        );

                        const cleaned = current.filter((id) => !optionValueIds.includes(id));

                        /*
                          Mos kelmaydigan tanlov BEKOR qilinadi.

                          "Oq · 128 GB" birikmasi bo'lmasa, odam
                          "Oq" ni bosganda "128 GB" o'zi
                          bo'shaydi — u tuzoqqa tushmaydi.
                          Sabab `pruneSelection` da.
                        */
                        return pruneSelection(variantData.variants, [...cleaned, valueId]);
                      });
                      setAdded(false);
                    }}
                  />
                </div>
              )}

              {/* 3. Eng muhim savol: qachon keladi */}
              {!isOut && !needsPick && (
                <div className="border-border/60 mt-3.5 border-t pt-3.5">
                  <DeliveryPromise deliveryDays={product.shop.deliveryDays} />
                </div>
              )}
            </div>

            {/* 4. Olamanmi */}
            {isOut ? (
              <Alert variant="warning" title="Mahsulot tugagan">
                Bu mahsulot hozir sotuvda yo&apos;q. Do&apos;kon zaxirani to&apos;ldirganda qaytadan paydo
                bo&apos;ladi.
              </Alert>
            ) : (
              <div className="flex items-center gap-3">
                <QuantityStepper
                  value={quantity}
                  onChange={(next) => setQuantity(Math.max(1, Math.min(next, maxQuantity)))}
                  max={maxQuantity}
                  label={product.name}
                />

                <Button fullWidth size="lg" onClick={handleAdd} disabled={needsPick}>
                  {needsPick ? PICK_VARIANT_TEXT : added ? "Savatga qo'shildi" : "Savatga qo'shish"}
                </Button>
              </div>
            )}

            {/* Do'kon — kim sotyapti */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <Link href={`/marketplace/s/${product.shop.slug}`} className="flex items-center gap-3">
                <span className="bg-secondary inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Store className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{product.shop.name}</span>
                  <span className="text-muted-foreground block text-xs">Do&apos;konga o&apos;tish</span>
                </span>
              </Link>

              <p className="text-muted-foreground mt-3 flex items-start gap-2 text-xs leading-relaxed">
                <Truck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {`Yetkazish ${formatTiyin(product.shopDeliveryFee)} · eng kam buyurtma ${formatTiyin(product.shopMinOrder)}`}
              </p>
            </section>

            {/* 5. Batafsil */}
            {product.description && (
              <section className="bg-card border-border rounded-2xl border p-4">
                <h2 className="mb-2 text-sm font-semibold">Tavsif</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
              </section>
            )}

            <AttributeTable attributes={product.attributes} />

            {/*
              Ko'rilgani belgilanadi — sahifa buni KUTMAYDI.
              Sabab `RecentTracker` da.
            */}
            <RecentTracker target="PRODUCT" targetId={product.id} />

            {/* 6. Boshqalar nima deydi */}
            <ReviewSection target="PRODUCT" targetId={product.id} title="Xaridorlar bahosi" />

            {/* 7. Hali savolim bor */}
            <QuestionSection productId={product.id} />

            <LinkedPosts kind="PRODUCT" targetId={product.id} />

            {related.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold">O&apos;xshash mahsulotlar</h2>
                <div className="grid grid-cols-2 gap-3">
                  {related.map((item, index) => (
                    <ProductCard key={item.id} product={item} index={index} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={conflictShop !== null}
        title="Savatda boshqa do'kon bor"
        description={`Savatingizda "${conflictShop}" mahsulotlari bor. Har do'kon alohida yetkaziladi, shuning uchun savat tozalanadi.`}
        confirmLabel="Savatni tozalash"
        onConfirm={() => {
          if (product) {
            cart.replaceShop(product.shop, product.id, quantity, variant?.id ?? null);
            setAdded(true);
          }
          setConflictShop(null);
        }}
        onCancel={() => setConflictShop(null)}
      />

      <MarketCartBar />
    </>
  );
}
