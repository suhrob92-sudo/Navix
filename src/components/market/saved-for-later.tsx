'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';

import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { Button } from '@/components/ui/button';
import { cartLineKey } from '@/config/cart';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { CartLineView } from '@/modules/market/cart.types';

/**
 * "Keyinroq sotib olaman" ro'yxati.
 *
 * ── Nima uchun bu ro'yxat kerak ───────────────────────────────────────
 * Odam savatni ko'rib chiqayotganda ko'pincha "buni hozir olmayman"
 * degan qarorga keladi. Ilgari uning yagona yo'li — O'CHIRISH edi.
 *
 * Natijada mahsulot butunlay yo'qolardi va keyingi safar odam uni
 * qaytadan qidirishga majbur bo'lardi. Ko'pchilik esa qidirmasdi:
 * savdo shu yerda tugardi.
 *
 * ── Sevimlilardan (39-bosqich) farqi ──────────────────────────────────
 * Sevimlilar — "bu menga yoqadi" degan uzoq muddatli belgi.
 * Bu ro'yxat esa "buni olaman, lekin hozir emas" degani: mahsulot
 * allaqachon savatga tushgan, ya'ni qaror deyarli qabul qilingan.
 *
 * Shuning uchun u savat SAHIFASIDA turadi, alohida bo'limda emas.
 */

export interface SavedForLaterProps {
  lines: readonly CartLineView[];
  onMoveToCart: (productId: string, variantId: string | null) => void;
  onRemove: (productId: string, variantId: string | null) => void;
  className?: string;
}

export function SavedForLater({ lines, onMoveToCart, onRemove, className }: SavedForLaterProps) {
  if (lines.length === 0) return null;

  return (
    <section className={cn(className)} aria-labelledby="saved-title">
      <h2 id="saved-title" className="mb-3 text-base font-semibold">
        {`Keyinroq sotib olaman (${lines.length})`}
      </h2>

      <ul className="space-y-2">
        {lines.map((line) => (
          <li
            key={cartLineKey(line.productId, line.variantId)}
            className="bg-card border-border flex items-center gap-3 rounded-2xl border p-3"
          >
            <CatalogThumb
              image={line.image}
              name={line.name}
              className="size-14 shrink-0 rounded-xl"
            />

            <div className="min-w-0 flex-1">
              <Link
                href={`/marketplace/p/${line.slug}`}
                className="line-clamp-2 text-sm font-medium"
              >
                {line.name}
              </Link>

              {line.variantLabel && (
                <p className="text-muted-foreground text-xs">{line.variantLabel}</p>
              )}

              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {formatTiyin(line.unitPrice)}
              </p>

              {/*
                Sotuvdan olingan mahsulot ro'yxatda QOLADI, lekin
                belgilanadi. Uni jimgina o'chirib yuborsak, odam
                "men buni saqlagan edim-ku" deb hayron bo'lardi.
              */}
              {!line.isAvailable && (
                <p className="text-destructive mt-1 text-xs">Hozircha sotuvda yo&apos;q</p>
              )}

              {line.isAvailable && line.stock === 0 && (
                <p className="text-warning mt-1 text-xs">Tugagan</p>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!line.isAvailable || line.stock === 0}
                onClick={() => onMoveToCart(line.productId, line.variantId)}
              >
                Savatga
              </Button>

              <button
                type="button"
                onClick={() => onRemove(line.productId, line.variantId)}
                aria-label={`${line.name} — ro'yxatdan o'chirish`}
                className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1 text-xs transition-colors"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                O&apos;chirish
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
