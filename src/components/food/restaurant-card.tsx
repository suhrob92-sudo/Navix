import { Clock, Star, UtensilsCrossed } from 'lucide-react';

import { ServiceIcon } from '@/components/app/service-icon';
import { Badge } from '@/components/ui/badge';
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
      <ServiceIcon icon={UtensilsCrossed} color={restaurant.color} size="lg" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{restaurant.name}</h3>
          {!restaurant.isOpen && (
            <Badge variant="secondary" className="shrink-0">
              Yopiq
            </Badge>
          )}
        </div>

        <p className="text-muted-foreground truncate text-xs">{restaurant.description}</p>

        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-foreground inline-flex items-center gap-1 font-medium">
            <Star className="size-3.5 fill-current text-amber-500" aria-hidden="true" />
            {restaurant.rating.toFixed(1)}
            <span className="text-muted-foreground font-normal">({restaurant.ratingCount})</span>
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
