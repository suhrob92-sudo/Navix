import { Clock, Star, UtensilsCrossed } from 'lucide-react';

import { ServiceIcon } from '@/components/app/service-icon';
import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { FavoriteButton } from '@/components/favorite/favorite-button';
import { Badge } from '@/components/ui/badge';
import { formatRating } from '@/config/review';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { RestaurantListItem } from '@/modules/food/food.types';

export interface RestaurantCardProps {
  restaurant: RestaurantListItem;
  /** Ro'yxatdagi o'rni — animatsiya kechikishi uchun. */
  index?: number;
}

/**
 * Restoran kartochkasi.
 *
 * Nima ko'rsatiladi va nima uchun: foydalanuvchi tanlashdan oldin
 * uchta savolga javob izlaydi — "qanchalik yaxshi?", "qachon keladi?",
 * "qancha turadi?". Shuning uchun reyting, vaqt va yetkazish narxi
 * bir qatorda, birga turadi.
 */
export function RestaurantCard({ restaurant, index = 0 }: RestaurantCardProps) {
  return (
    <article
      className={cn(
        'bg-card border-border animate-fade-up flex gap-3 rounded-2xl border p-3 transition-transform active:scale-[0.99]',
        !restaurant.isOpen && 'opacity-60',
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {/*
        Rasm bor bo'lsa — RASM, yo'q bo'lsa rangli ikonka.

        Ikonka butunlay olib tashlanmaydi: rasmsiz restoranda
        kartochka bo'shab qolardi, rangli ikonka esa uni tanib
        olishga yordam beradi.
      */}
      {restaurant.image ? (
        <CatalogThumb
          image={restaurant.image}
          name={restaurant.name}
          eager={index < 3}
          className="size-16 shrink-0 rounded-2xl"
        />
      ) : (
        <ServiceIcon icon={UtensilsCrossed} color={restaurant.color} size="lg" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{restaurant.name}</h3>
          {!restaurant.isOpen && (
            <Badge variant="secondary" className="shrink-0">
              Yopiq
            </Badge>
          )}
          <FavoriteButton target="RESTAURANT" targetId={restaurant.id} name={restaurant.name} />
        </div>

        <p className="text-muted-foreground truncate text-xs">{restaurant.description}</p>

        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {/*
            Bahosi yo'q restoran "0.0" deb ko'rsatilsa, u ENG YOMON
            restorandek ko'rinardi — holbuki u shunchaki yangi.
          */}
          <span className="text-foreground inline-flex items-center gap-1 font-medium">
            <Star
              className={cn(
                'size-3.5',
                restaurant.ratingCount > 0 ? 'fill-current text-amber-500' : 'text-muted-foreground/40',
              )}
              aria-hidden="true"
            />
            {formatRating(restaurant.rating, restaurant.ratingCount)}
            {restaurant.ratingCount > 0 && (
              <span className="text-muted-foreground font-normal">({restaurant.ratingCount})</span>
            )}
          </span>

          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" />
            {`${restaurant.deliveryMinutes} daq`}
          </span>

          <span>{`Yetkazish ${formatTiyin(restaurant.deliveryFee)}`}</span>
        </div>

        <p className="text-muted-foreground mt-1 text-xs">
          {`Eng kam buyurtma — ${formatTiyin(restaurant.minOrder)}`}
        </p>
      </div>
    </article>
  );
}
