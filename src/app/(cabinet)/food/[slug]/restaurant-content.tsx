'use client';

import Link from 'next/link';

import { Clock, Star, UtensilsCrossed, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { RatingStars } from '@/components/review/rating-stars';
import { ReviewSection } from '@/components/review/review-section';
import { LinkedPosts } from '@/components/feed/linked-posts';
import { ServiceIcon } from '@/components/app/service-icon';
import { CartBar } from '@/components/food/cart-bar';
import { QuantityStepper } from '@/components/food/quantity-stepper';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatRating } from '@/config/review';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import { MAX_ITEM_QUANTITY } from '@/modules/food/food.schemas';
import type { MenuItemView, RestaurantResponse } from '@/modules/food/food.types';
import { useCart } from '@/modules/food/use-cart';

export interface RestaurantContentProps {
  slug: string;
}

/**
 * Restoran sahifasi: menyu va savatga qo'shish.
 *
 * Savatga qo'shish DARHOL ishlaydi — serverga so'rov yubormaydi.
 * Shuning uchun sekin internetda ham tugma "o'ylanmaydi".
 */
export function RestaurantContent({ slug }: RestaurantContentProps) {
  const { data, isLoading, error } = useApiQuery<RestaurantResponse>(`/api/v1/food/restaurants/${slug}`);
  const cart = useCart();

  /** Boshqa restoran savati bor bo'lsa — tasdiqlash so'raladi. */
  const [conflict, setConflict] = useState<{ itemId: string; otherName: string } | null>(null);

  const restaurant = data?.restaurant ?? null;

  function handleAdd(item: MenuItemView) {
    if (!restaurant) return;

    const result = cart.add({ id: restaurant.id, slug: restaurant.slug, name: restaurant.name }, item.id);

    if (!result.ok) {
      setConflict({ itemId: item.id, otherName: result.conflictWith ?? 'boshqa restoran' });
    }
  }

  return (
    <>
      <AppHeader title={restaurant?.name ?? 'Restoran'} showBack backHref="/food" />

      <div className="px-4 pt-4 pb-4">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Restoranni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {restaurant && (
          <>
            {/* Restoran haqida */}
            <div className="bg-card border-border animate-fade-up flex gap-3 rounded-2xl border p-4">
              <ServiceIcon icon={UtensilsCrossed} color={restaurant.color} size="lg" />

              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-xs">{restaurant.cuisine}</p>
                <p className="mt-0.5 text-sm leading-relaxed">{restaurant.description}</p>

                <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="text-foreground inline-flex items-center gap-1 font-medium">
                    <Star
                      className={cn(
                        'size-3.5',
                        restaurant.ratingCount > 0
                          ? 'fill-current text-amber-500'
                          : 'text-muted-foreground/40',
                      )}
                      aria-hidden="true"
                    />
                    {formatRating(restaurant.rating, restaurant.ratingCount)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {`${restaurant.deliveryMinutes} daq`}
                  </span>
                  <span>{`Yetkazish ${formatTiyin(restaurant.deliveryFee)}`}</span>
                </div>

                {/*
                  Profilga havola.
                  Bu yerda menyu bor, profilda esa manzil, ish vaqti,
                  telefon va obuna. Ikkalasi bir sahifaga sig'masdi.
                */}
                <Link
                  href={`/b/${slug}`}
                  className="text-primary mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                >
                  Profilni ochish
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {!restaurant.isOpen && (
              <Alert variant="warning" title="Restoran hozir yopiq" className="mt-4">
                Menyuni ko&apos;rishingiz mumkin, lekin buyurtma qabul qilinmaydi.
              </Alert>
            )}

            <Alert variant="info" className="mt-4">
              {`Eng kam buyurtma summasi — ${formatTiyin(restaurant.minOrder)} (yetkazish narxisiz).`}
            </Alert>

            {/* Menyu */}
            {restaurant.categories.map((category) => (
              <section key={category.id} className="mt-6">
                <h2 className="mb-3 text-sm font-semibold">{category.name}</h2>

                <ul className="space-y-2">
                  {category.items.map((item) => {
                    const quantity = cart.quantityOf(item.id);

                    return (
                      <li
                        key={item.id}
                        className={cn(
                          'bg-card border-border flex items-center gap-3 rounded-2xl border p-3',
                          !item.isAvailable && 'opacity-60',
                        )}
                      >
                        {/*
                          Taom rasmi menyuda ENG kuchli ta'sir
                          qiladigan joy: rasmsiz odam faqat tanish
                          nomlarni buyurtma qiladi.

                          Rasmsiz taomda esa bo'sh joy qoldirilmaydi —
                          qator baribir tekis turadi.
                        */}
                        {item.image && (
                          <CatalogThumb
                            image={item.image}
                            name={item.name}
                            className="size-16 shrink-0 rounded-xl"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{item.name}</p>
                            {!item.isAvailable && (
                              <Badge variant="secondary" className="shrink-0">
                                Tugagan
                              </Badge>
                            )}
                          </div>

                          {item.description && (
                            <p className="text-muted-foreground truncate text-xs">{item.description}</p>
                          )}

                          {/* Baho faqat bor bo'lganda — sabab `ProductCard` da. */}
                          {item.ratingCount > 0 && (
                            <span className="mt-1 flex items-center gap-1">
                              <RatingStars value={item.rating} />
                              <span className="text-muted-foreground text-xs tabular-nums">
                                {`(${item.ratingCount})`}
                              </span>
                            </span>
                          )}

                          <p className="mt-1 text-sm font-semibold tabular-nums">{formatTiyin(item.price)}</p>
                        </div>

                        <div className="shrink-0">
                          {!item.isAvailable ? null : quantity > 0 ? (
                            <QuantityStepper
                              quantity={quantity}
                              max={MAX_ITEM_QUANTITY}
                              onDecrease={() => cart.setQuantity(item.id, quantity - 1)}
                              onIncrease={() => cart.setQuantity(item.id, quantity + 1)}
                            />
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAdd(item)}
                              aria-label={`${item.name} — savatga qo'shish`}
                            >
                              Qo&apos;shish
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            <ReviewSection
              target="RESTAURANT"
              targetId={restaurant.id}
              title="Restoran haqida"
              className="mt-6"
            />

            <div className="mt-6">
              <LinkedPosts kind="RESTAURANT" targetId={restaurant.id} />
            </div>
          </>
        )}
      </div>

      <CartBar />

      {/*
        Ikki restorandan bitta buyurtma qilib bo'lmaydi: har birining
        o'z kuryeri va yetkazish haqi bor. Shuning uchun tanlov aniq
        so'raladi, savat jimgina tozalanmaydi.
      */}
      <ConfirmDialog
        open={conflict !== null}
        title="Savatni almashtiramizmi?"
        description={
          conflict
            ? `Savatingizda "${conflict.otherName}" restoranidan taomlar bor. Bitta buyurtmada faqat bitta restoran bo'lishi mumkin — eskisi o'chiriladi.`
            : ''
        }
        confirmLabel="Ha, almashtirish"
        isDestructive
        onConfirm={() => {
          if (conflict && restaurant) {
            cart.replaceRestaurant(
              { id: restaurant.id, slug: restaurant.slug, name: restaurant.name },
              conflict.itemId,
            );
          }
          setConflict(null);
        }}
        onCancel={() => setConflict(null)}
      />
    </>
  );
}
