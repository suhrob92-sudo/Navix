'use client';

import Link from 'next/link';

import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { FavoriteButton } from '@/components/favorite/favorite-button';
import { RatingStars } from '@/components/review/rating-stars';
import { Badge } from '@/components/ui/badge';
import { formatRating } from '@/config/review';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import { stockLabel, stockState, type ProductListItem } from '@/modules/market/market.types';

export interface ProductCardProps {
  product: ProductListItem;
  /** Ro'yxatdagi tartib raqami — paydo bo'lish animatsiyasi uchun. */
  index?: number;
}

/**
 * Katalogdagi mahsulot kartochkasi.
 *
 * ── Nima uchun zaxira ko'rsatiladi ────────────────────────────────────
 * "3 ta qoldi" yozuvi shoshiltirish uchun emas — ROSTNI aytish uchun.
 * Foydalanuvchi 5 ta buyurtma berib, keyin "zaxira yetmadi" degan
 * xatoga uchramasligi kerak.
 *
 * ── Nima uchun eski narx chizilgan ────────────────────────────────────
 * Chegirma bor bo'lsa, foydalanuvchi qancha tejayotganini ko'rishi
 * kerak. Eski narx ustidan chiziladi — bu hamma tushunadigan belgi.
 */
export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const state = stockState(product.stock);
  const isOut = state === 'out';

  return (
    <Link
      href={`/marketplace/p/${product.slug}`}
      className={cn(
        'bg-card border-border animate-fade-up block rounded-2xl border p-3 transition-transform active:scale-[0.99]',
        isOut && 'opacity-60',
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      {/*
        Rasm ENG YUQORIDA turadi.

        Xaridor kartochkani o'qimaydi — u avval KO'RADI. Nom va narx
        rasmdan keyin kelsa, ro'yxatni ko'z bilan tez varaqlash
        mumkin bo'ladi.

        Birinchi to'rtta rasm darhol yuklanadi: telefonda ekranga
        odatda shuncha kartochka sig'adi.
      */}
      {/*
        Yurakcha RASM USTIDA turadi.

        Kartochkaning pastida joy yo'q: u yerda nom, narx, do'kon
        va zaxira bor. Rasm ustida esa u ko'zga tashlanadi va
        barmoq bilan bosish oson.
      */}
      <span className="relative mb-2.5 block">
        <CatalogThumb image={product.image} name={product.name} eager={index < 4} />

        <FavoriteButton
          target="PRODUCT"
          targetId={product.id}
          name={product.name}
          variant="overlay"
          className="absolute top-1.5 right-1.5"
        />
      </span>

      <p className="line-clamp-2 text-sm leading-snug font-medium">{product.name}</p>

      {/*
        `flex-wrap` MUHIM: kartochka ekranning yarmini egallaydi va ikkita
        narx (joriy + eski) bitta qatorga sig'maydi. Yopiq holda eski narx
        chetdan chiqib ketardi.
      */}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-base font-semibold tabular-nums">{formatTiyin(product.price)}</span>

        {product.oldPrice !== null && product.oldPrice > product.price && (
          <span className="text-muted-foreground text-xs line-through tabular-nums">
            {formatTiyin(product.oldPrice)}
          </span>
        )}
      </div>

      {/*
        Baho FAQAT bor bo'lganda ko'rinadi.

        "0.0" yozuvi yangi mahsulotni eng yomon mahsulotdek
        ko'rsatardi — holbuki unga hali hech kim baho qo'ymagan.
      */}
      {product.ratingCount > 0 && (
        <span className="mt-1.5 flex items-center gap-1">
          <RatingStars value={product.rating} />
          <span className="text-muted-foreground text-xs tabular-nums">
            {`${formatRating(product.rating, product.ratingCount)} (${product.ratingCount})`}
          </span>
        </span>
      )}

      <p className="text-muted-foreground mt-1.5 truncate text-xs">{product.shop.name}</p>

      <div className="mt-2 flex items-center gap-2">
        <Badge variant={isOut ? 'destructive' : state === 'low' ? 'warning' : 'secondary'}>
          {stockLabel(product.stock)}
        </Badge>
        <span className="text-muted-foreground text-xs">{`${product.shop.deliveryDays} kun`}</span>
      </div>
    </Link>
  );
}
