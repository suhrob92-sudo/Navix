'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
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
