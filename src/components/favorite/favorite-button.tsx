'use client';

import { Heart } from 'lucide-react';
import { useState } from 'react';

import { favoriteButtonLabel, type FavoriteTarget } from '@/config/favorite';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/modules/favorite/favorite-provider';

/**
 * Yurakcha tugmasi.
 *
 * ── Nima uchun tugma HAVOLA ichida ham ishlaydi ───────────────────────
 * Kartochkaning o'zi havola: bosilganda mahsulot sahifasi ochiladi.
 * Yurakcha esa uning ICHIDA turadi va bosilganda sahifa ochilmasligi
 * kerak.
 *
 * Shuning uchun `preventDefault` va `stopPropagation` ikkalasi ham
 * chaqiriladi: birinchisi havolani to'xtatadi, ikkinchisi esa
 * bosishning yuqoriga ko'tarilishini.
 *
 * ── Nima uchun kirmagan odamga KO'RSATILMAYDI ─────────────────────────
 * Ro'yxat hisobga bog'langan. Kirmagan odam bosgan bo'lsa, uni
 * kirish sahifasiga yuborish kerak bo'lardi va u mahsulotni
 * yo'qotardi.
 *
 * Tugmani umuman ko'rsatmaslik halolroq: bo'lmagan narsani
 * va'da qilmaydi.
 */

const SIZE_CLASSES = {
  sm: 'size-7 [&_svg]:size-4',
  md: 'size-9 [&_svg]:size-5',
} as const;

export interface FavoriteButtonProps {
  target: FavoriteTarget;
  targetId: string;
  /** Nimaga tegishli — ekranni o'quvchi dastur uchun. */
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  /** Rasm ustida turganda oq fon kerak bo'ladi. */
  variant?: 'plain' | 'overlay';
  className?: string;
}

export function FavoriteButton({
  target,
  targetId,
  name,
  size = 'sm',
  variant = 'plain',
  className,
}: FavoriteButtonProps) {
  const favorites = useFavorites();
  const [error, setError] = useState<string | null>(null);

  // Qolip yo'q (kirmagan odam) — tugma umuman chizilmaydi.
  if (!favorites) return null;

  const isFavorite = favorites.isFavorite(target, targetId);

  return (
    <button
      type="button"
      aria-label={favoriteButtonLabel(isFavorite, name)}
      aria-pressed={isFavorite}
      title={error ?? undefined}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        void favorites.toggle(target, targetId).then(setError);
      }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-transform active:scale-90',
        SIZE_CLASSES[size],
        variant === 'overlay'
          ? 'bg-black/45 text-white backdrop-blur-sm hover:bg-black/60'
          : 'text-muted-foreground hover:bg-secondary',
        className,
      )}
    >
      <Heart
        aria-hidden="true"
        className={cn(
          'transition-colors',
          isFavorite && 'fill-red-500 text-red-500',
        )}
      />
    </button>
  );
}
