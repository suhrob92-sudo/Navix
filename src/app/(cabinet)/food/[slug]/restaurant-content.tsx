'use client';

import Link from 'next/link';

import { ChevronRight, Flame } from 'lucide-react';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { FavoriteButton } from '@/components/favorite/favorite-button';
import { RecentTracker } from '@/components/recent/recent-tracker';
import { RatingStars } from '@/components/review/rating-stars';
import { ReviewSection } from '@/components/review/review-section';
import { LinkedPosts } from '@/components/feed/linked-posts';
import { CartBar } from '@/components/food/cart-bar';
import { MenuItemSheet } from '@/components/food/menu-item-sheet';
import { OpeningHoursCard } from '@/components/food/opening-hours-card';
import { RestaurantHeader } from '@/components/food/restaurant-header';
import { QuantityStepper } from '@/components/food/quantity-stepper';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
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

  /** Ochilgan taom oynasi — tarkibi shu yerda ko'rsatiladi. */
  const [openItem, setOpenItem] = useState<MenuItemView | null>(null);

  const restaurant = data?.restaurant ?? null;

  /*
    Mashhur taomlar barcha bo'limlardan yig'iladi: ular menyuda
    turli joylarda turishi mumkin.
  */
  const popularItems = (restaurant?.categories ?? [])
    .flatMap((category) => category.items)
    .filter((item) => item.isPopular);

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
            <RestaurantHeader restaurant={restaurant} />

            <OpeningHoursCard
              hours={restaurant.hours}
              summary={restaurant.openState.text}
              className="mt-4"
            />

            {/*
              Profilda manzil, telefon va obuna bor. Bu yerda esa
              menyu — ikkalasi bir sahifaga sig'masdi.
            */}
            <Link
              href={`/b/${slug}`}
              className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              Restoran profilini ochish
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>

            {/*
              ── Yopiq restoran ──────────────────────────────────────
              Sabab AYTILADI: "vaqtincha yopiq" (egasi o'chirgan) va
              "hozircha ish vaqti emas" — bu ikki xil holat va odam
              ular orasidagi farqni bilishi kerak.
            */}
            {!restaurant.isOpen && (
              <Alert
                variant="warning"
                title={restaurant.acceptsOrders ? 'Hozir yopiq' : 'Vaqtincha yopiq'}
                className="mt-4"
              >
                {restaurant.acceptsOrders
                  ? `Menyuni ko'rishingiz mumkin. ${restaurant.openState.text}.`
                  : "Restoran vaqtincha buyurtma qabul qilmayapti."}
              </Alert>
            )}

            <Alert variant="info" className="mt-4">
              {`Eng kam buyurtma summasi — ${formatTiyin(restaurant.minOrder)} (yetkazish narxisiz).`}
            </Alert>

            {/*
              ── Mashhur taomlar ─────────────────────────────────────
              Notanish restoranda odam o'ttizta nom ko'radi va
              nimani tanlashni bilmaydi.

              Bu ro'yxat buyurtmalardan hisoblanadi — restoran uni
              qo'lda belgilay olmaydi. Sabab `getPopularItemIds` da.
            */}
            {popularItems.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                  <Flame className="size-4 text-orange-500" aria-hidden="true" />
                  Mashhur taomlar
                </h2>

                <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {popularItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setOpenItem(item)}
                      className="bg-card border-border w-32 shrink-0 rounded-2xl border p-2 text-left"
                    >
                      <CatalogThumb image={item.image} name={item.name} className="rounded-xl" />

                      <p className="mt-2 line-clamp-2 text-xs font-medium">{item.name}</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums">
                        {formatTiyin(item.price)}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}

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
                          <button
                            type="button"
                            onClick={() => setOpenItem(item)}
                            aria-label={`${item.name} — batafsil`}
                            className="shrink-0"
                          >
                            <CatalogThumb
                              image={item.image}
                              name={item.name}
                              className="size-16 rounded-xl"
                            />
                          </button>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {/*
                              Nomga bosilsa TARKIB oynasi ochiladi.

                              Tarkibni qatorga sig'dirib bo'lmaydi:
                              u yerda nom, narx, rasm va tugma bor.
                            */}
                            <button
                              type="button"
                              onClick={() => setOpenItem(item)}
                              className="min-w-0 flex-1 truncate text-left text-sm font-medium"
                            >
                              {item.name}
                            </button>
                            {item.isPopular && item.isAvailable && (
                              <Badge variant="warning" className="shrink-0">
                                Mashhur
                              </Badge>
                            )}
                            {!item.isAvailable && (
                              <Badge variant="secondary" className="shrink-0">
                                Tugagan
                              </Badge>
                            )}
                            <FavoriteButton target="MENU_ITEM" targetId={item.id} name={item.name} />
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

            <RecentTracker target="RESTAURANT" targetId={restaurant.id} />

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
      {openItem && (
        <MenuItemSheet
          item={openItem}
          quantity={cart.quantityOf(openItem.id)}
          canOrder={restaurant?.isOpen ?? false}
          onAdd={() => handleAdd(openItem)}
          onClose={() => setOpenItem(null)}
        />
      )}

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
