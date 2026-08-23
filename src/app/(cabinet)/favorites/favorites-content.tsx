'use client';

import { Heart } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app/app-header';
import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { FavoriteButton } from '@/components/favorite/favorite-button';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { EMPTY_FAVORITES_TEXT, FAVORITE_GROUP_LABEL } from '@/config/favorite';
import { useApiQuery } from '@/hooks/use-api';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/modules/favorite/favorite-provider';
import type { FavoriteItem, FavoritesResponse } from '@/modules/favorite/favorite.types';

/**
 * Sevimlilar sahifasi.
 *
 * ── Nima uchun BITTA sahifa, beshta emas ──────────────────────────────
 * "Sevimli mahsulotlar", "saqlangan vakansiyalar" degan alohida
 * sahifalar bo'lsa, odam qaysi biriga qarashni eslab qolishi kerak
 * bo'lardi.
 *
 * Bitta sahifada esa u hamma narsani bir joyda ko'radi — xuddi
 * o'zining ro'yxatidek.
 *
 * ── Nima uchun BO'SH bo'lim ko'rsatilmaydi ────────────────────────────
 * Beshta bo'sh sarlavha sahifani "buzilgan" qilib ko'rsatardi.
 * Bo'sh bo'lim faqat butun ro'yxat bo'sh bo'lgandagina, bitta
 * umumiy matn bilan aytiladi.
 */
export function FavoritesContent() {
  const { data, isLoading, error } = useApiQuery<FavoritesResponse>('/api/v1/favorites');
  const favorites = useFavorites();

  /**
   * Ro'yxat QOLIPDAGI holatga qarab suziladi.
   *
   * ── HAQIQIY XATO: olib tashlangan narsa qolib ketardi ───────────────
   * Yurakcha bosilganda qolipdagi holat darhol o'zgaradi, lekin bu
   * sahifaning ma'lumoti eski bo'lib qolardi: yurakcha bo'shaydi-yu,
   * qator o'z joyida turaverardi va bo'lim sarlavhasi ham
   * yo'qolmasdi.
   *
   * Sahifani qaytadan so'rash ham mumkin edi, lekin u mobil
   * internetda ko'zga tashlanadigan kechikish berardi. Suzish esa
   * darhol ishlaydi va yagona manba — qolip bo'lib qoladi.
   */
  const groups = (data?.groups ?? [])
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => favorites?.isFavorite(item.target, item.targetId) !== false,
      ),
    }))
    .filter((group) => group.items.length > 0);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <>
      <AppHeader title="Sevimlilar" showBack backHref="/dashboard" />

      <div className="space-y-6 px-4 pt-4 pb-4">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Ro'yxatni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {data && total === 0 && (
          <EmptyState
            icon={Heart}
            title="Ro'yxat bo'sh"
            description={EMPTY_FAVORITES_TEXT.PRODUCT}
          />
        )}

        {groups.map((group) => (
          <section key={group.target}>
            <h2 className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
              {FAVORITE_GROUP_LABEL[group.target]}
              <span className="text-muted-foreground text-xs font-normal tabular-nums">
                {group.items.length}
              </span>
            </h2>

            <ul className="space-y-2">
              {group.items.map((item, index) => (
                <li key={item.id}>
                  <FavoriteRow item={item} index={index} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

/** Ro'yxatdagi bitta qator — barcha turlar uchun bir xil. */
function FavoriteRow({ item, index }: { item: FavoriteItem; index: number }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-3',
        'transition-transform active:scale-[0.99]',
        /*
          Sotuvdan olingan narsa RO'YXATDAN yo'qolmaydi, faqat
          xiralashadi: uni o'chirib yuborsak, odam "men buni
          saqlagan edim-ku" deb hayron bo'lardi.
        */
        !item.isAvailable && 'opacity-55',
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      <CatalogThumb
        image={item.image}
        name={item.name}
        className="size-14 shrink-0 rounded-xl"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>

        {item.subtitle && (
          <p className="text-muted-foreground truncate text-xs">{item.subtitle}</p>
        )}

        {item.priceTiyin !== null && (
          <p className="mt-0.5 text-sm font-semibold tabular-nums">
            {item.pricePrefix
              ? `${formatTiyin(item.priceTiyin)} ${item.pricePrefix}`
              : formatTiyin(item.priceTiyin)}
          </p>
        )}

        {!item.isAvailable && (
          <p className="text-muted-foreground mt-0.5 text-xs">Hozir mavjud emas</p>
        )}
      </div>

      <FavoriteButton
        target={item.target}
        targetId={item.targetId}
        name={item.name}
        size="md"
      />
    </Link>
  );
}
