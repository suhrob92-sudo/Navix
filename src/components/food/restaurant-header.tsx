/* eslint-disable @next/next/no-img-element */
import { Clock, Star, Truck } from 'lucide-react';

import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { Badge } from '@/components/ui/badge';
import { formatRating } from '@/config/review';
import type { ServiceColor } from '@/config/modules';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { RestaurantListItem } from '@/modules/food/food.types';

/**
 * Restoran sarlavhasi — rasm, nom, holat.
 *
 * ── Nima uchun RASM kerak ─────────────────────────────────────────────
 * Ilgari bu yerda faqat rangli kvadrat (ikonka) turardi. Ovqat esa
 * ko'z bilan tanlanadi: odam avval KO'RADI, keyin narxga qaraydi.
 *
 * Rangli kvadrat hech qanday ma'lumot bermasdi va barcha restoranlar
 * bir xil ko'rinardi.
 *
 * ── Nima uchun `next/image` emas ──────────────────────────────────────
 * Sabab `catalog-thumb.tsx` da: rasm manzili Vercel Blob domenidan
 * kelishi mumkin va u har bir loyihada boshqacha.
 *
 * ── Nima uchun HOLAT sarlavhada ───────────────────────────────────────
 * "Yopiq" ekanini menyuni varaqlab, savatni to'ldirib bo'lgandan
 * keyin bilish eng yomon tajriba. U eng tepada, eng ko'rinadigan
 * joyda turishi kerak.
 */

const GRADIENTS: Record<ServiceColor, string> = {
  amber: 'from-amber-400 to-amber-600',
  rose: 'from-rose-400 to-rose-600',
  blue: 'from-blue-400 to-blue-600',
  orange: 'from-orange-400 to-orange-600',
  green: 'from-emerald-400 to-emerald-600',
  pink: 'from-pink-400 to-pink-600',
  teal: 'from-teal-400 to-teal-600',
  violet: 'from-violet-400 to-violet-600',
  sky: 'from-sky-400 to-sky-600',
  indigo: 'from-indigo-400 to-indigo-600',
  slate: 'from-slate-400 to-slate-600',
};

export interface RestaurantHeaderProps {
  restaurant: RestaurantListItem;
  className?: string;
}

export function RestaurantHeader({ restaurant, className }: RestaurantHeaderProps) {
  const image = restaurant.image;
  const state = restaurant.openState;

  return (
    <div className={cn('animate-fade-up', className)}>
      <div className="relative h-28 overflow-hidden rounded-t-2xl">
        {image ? (
          <>
            <img
              src={image.url}
              alt=""
              aria-hidden="true"
              decoding="async"
              className="size-full scale-125 object-cover blur-xl"
            />
            <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
          </>
        ) : (
          <div
            className={cn('size-full bg-gradient-to-br', GRADIENTS[restaurant.color])}
            aria-hidden="true"
          />
        )}

        {/*
          Holat yorlig'i — eng ko'rinadigan joyda.

          Matn shunchaki "Ochiq/Yopiq" emas: "22:00 gacha ochiq"
          shoshilish kerakligini aytadi, "Ertaga 09:00 da ochiladi"
          esa qaytish uchun sabab beradi.
        */}
        <div className="absolute top-3 right-3">
          <Badge
            className={cn(
              'bg-white/90 dark:bg-black/60',
              state.isOpen
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-amber-700 dark:text-amber-300',
            )}
          >
            {state.text}
          </Badge>
        </div>
      </div>

      <div className="bg-card border-border rounded-b-2xl border border-t-0 px-4 pb-4">
        {/*
          ── HAQIQIY XATO: nom BANNER ostida qolardi ────────────────
          Avval bu yerda nom va oshxona turi IKKI QATOR bo'lib,
          logotip yonida turardi. `items-end` ularning pastini
          logotip pastiga tenglashtirar, ikki qatorlik balandlik
          esa nomni yuqoriga — banner ostiga surib yuborardi.

          Natijada restoran nomining yarmi ko'rinmasdi.

          Endi logotip yonida FAQAT bitta qator turadi (xuddi
          `shop-header.tsx` dagi kabi), oshxona turi esa pastki
          qatorga tushdi.
        */}
        <div className="-mt-8 flex items-end gap-3">
          <CatalogThumb
            image={image}
            name={restaurant.name}
            eager
            className="border-card size-16 shrink-0 rounded-2xl border-4 shadow-sm"
          />

          <h1 className="min-w-0 flex-1 truncate pb-1 text-lg leading-tight font-semibold">
            {restaurant.name}
          </h1>
        </div>

        <p className="text-muted-foreground mt-3 text-xs">{restaurant.cuisine}</p>
        <p className="mt-1 text-sm leading-relaxed">{restaurant.description}</p>

        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          <span className="inline-flex items-center gap-1">
            <Star
              className={cn(
                'size-3.5',
                restaurant.ratingCount > 0 ? 'fill-current text-amber-500' : 'text-muted-foreground/40',
              )}
              aria-hidden="true"
            />
            {restaurant.ratingCount > 0
              ? `${formatRating(restaurant.rating, restaurant.ratingCount)} (${restaurant.ratingCount})`
              : formatRating(restaurant.rating, restaurant.ratingCount)}
          </span>

          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" />
            {`${restaurant.deliveryMinutes} daq`}
          </span>

          <span className="inline-flex items-center gap-1">
            <Truck className="size-3.5" aria-hidden="true" />
            {formatTiyin(restaurant.deliveryFee)}
          </span>

          <span>{`Eng kam: ${formatTiyin(restaurant.minOrder)}`}</span>
        </div>
      </div>
    </div>
  );
}
