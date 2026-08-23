'use client';

import { Building2, MapPin, Star } from 'lucide-react';
import Link from 'next/link';

import { ServiceIcon } from '@/components/app/service-icon';
import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { Badge } from '@/components/ui/badge';
import { formatRating } from '@/config/review';
import { formatTiyin } from '@/lib/money';
import { formatStars, type HotelListItem } from '@/modules/hotel/hotel.types';

export interface HotelCardProps {
  hotel: HotelListItem;
  /** Tanlangan sanalar — havolaga qo'shiladi. */
  dates?: { checkIn: string; checkOut: string };
  index?: number;
}

/**
 * Mehmonxona kartochkasi.
 *
 * ── Nima uchun sanalar HAVOLAGA qo'shiladi ────────────────────────────
 * Foydalanuvchi ro'yxatda sana tanlagan bo'lsa, mehmonxonani
 * ochganda uni QAYTA tanlashi kerak bo'lmasligi kerak. Sanalar
 * manzilda ketsa, sahifa darhol bo'sh xonalarni ko'rsatadi.
 */
export function HotelCard({ hotel, dates, index = 0 }: HotelCardProps) {
  const query = dates ? `?checkIn=${dates.checkIn}&checkOut=${dates.checkOut}` : '';

  return (
    <Link
      href={`/hotel/${hotel.slug}${query}`}
      className="bg-card border-border animate-fade-up block rounded-2xl border p-4 transition-transform active:scale-[0.99]"
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* Rasm bor bo'lsa — rasm; yo'q bo'lsa rangli ikonka. */}
        {hotel.image ? (
          <CatalogThumb
            image={hotel.image}
            name={hotel.name}
            eager={index < 3}
            className="size-14 shrink-0 rounded-2xl"
          />
        ) : (
          <ServiceIcon icon={Building2} color={hotel.color} size="md" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-base leading-snug font-semibold text-balance">{hotel.name}</p>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            {`${hotel.city} · ${hotel.address}`}
          </p>
        </div>

        {hotel.ratingCount > 0 && (
          <Badge variant="secondary" className="shrink-0 gap-1">
            <Star className="size-3 fill-current" aria-hidden="true" />
            {formatRating(hotel.rating, hotel.ratingCount)}
          </Badge>
        )}
      </div>

      <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">{hotel.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-amber-500 text-xs" aria-label={`${hotel.stars} yulduz`}>
          {formatStars(hotel.stars)}
        </span>
        {hotel.amenities.slice(0, 3).map((amenity) => (
          <span key={amenity} className="text-muted-foreground text-xs">
            {amenity}
          </span>
        ))}
      </div>

      {/* Narx — eng muhim raqam, shuning uchun pastda va katta */}
      <div className="border-border/60 mt-3 flex items-baseline gap-1 border-t pt-3">
        {hotel.fromPrice === null ? (
          <span className="text-muted-foreground text-sm">Xona yo&apos;q</span>
        ) : (
          <>
            <span className="text-lg font-semibold tabular-nums">{formatTiyin(hotel.fromPrice)}</span>
            <span className="text-muted-foreground text-xs">/ kecha</span>
          </>
        )}
      </div>
    </Link>
  );
}
