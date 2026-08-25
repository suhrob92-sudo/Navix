'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';

import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { Button } from '@/components/ui/button';
import { RatingStars } from '@/components/review/rating-stars';
import { describeAllergens, formatPortion, hasComposition } from '@/config/menu-item-detail';
import { formatTiyin } from '@/lib/money';
import type { MenuItemView } from '@/modules/food/food.types';

/**
 * Taom haqida batafsil — pastdan chiqadigan oyna.
 *
 * ── Nima uchun ALOHIDA oyna ───────────────────────────────────────────
 * Tarkibni menyu qatoriga sig'dirib bo'lmaydi: u yerda nom, narx,
 * rasm va tugma bor va qator allaqachon to'la.
 *
 * Hammasini qatorga yozsak, menyu o'qib bo'lmas bo'lib qolardi —
 * odam esa o'ttizta taomni varaqlashi kerak.
 *
 * ── Nima uchun ALLERGENLAR ajratib ko'rsatiladi ───────────────────────
 * Allergiya — sog'liq masalasi. "Yong'oq bor" degan so'zni tarkib
 * matni ichidan izlab topish kerak bo'lsa, odam shoshib o'tkazib
 * yuborishi mumkin.
 *
 * Shuning uchun ular alohida, ogohlantirish rangida turadi.
 */

export interface MenuItemSheetProps {
  item: MenuItemView;
  /** Savatda nechta — tugma matni uchun. */
  quantity: number;
  canOrder: boolean;
  onAdd: () => void;
  onClose: () => void;
}

export function MenuItemSheet({ item, quantity, canOrder, onAdd, onClose }: MenuItemSheetProps) {
  /**
   * Escape tugmasi oynani yopadi.
   *
   * Klaviaturasi bor odam (va ekranni o'quvchi dastur) uchun bu
   * yagona chiqish yo'li bo'lishi mumkin.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const portion = formatPortion(item.weightGrams, item.calories);
  const allergens = describeAllergens(item.allergens);

  const showComposition = hasComposition({
    ingredients: item.ingredients,
    weightGrams: item.weightGrams,
    calories: item.calories,
    allergens: item.allergens,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        onClick={onClose}
        aria-label="Yopish"
        className="absolute inset-0 bg-black/50"
      />

      <div className="bg-card animate-slide-up relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl">
        {/* Rasm — eng tepada, katta. */}
        {item.image && (
          <CatalogThumb
            image={item.image}
            name={item.name}
            ratio="wide"
            eager
            className="rounded-t-3xl rounded-b-none"
          />
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="bg-card/90 text-foreground absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-full shadow-sm"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <h2 className="text-base leading-tight font-semibold">{item.name}</h2>

          {item.ratingCount > 0 && (
            <span className="mt-1 flex items-center gap-1">
              <RatingStars value={item.rating} />
              <span className="text-muted-foreground text-xs tabular-nums">{`(${item.ratingCount})`}</span>
            </span>
          )}

          {item.description && (
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{item.description}</p>
          )}

          {portion && <p className="text-muted-foreground mt-2 text-xs tabular-nums">{portion}</p>}

          {showComposition && item.ingredients && (
            <section className="mt-4">
              <h3 className="text-sm font-medium">Tarkibi</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{item.ingredients}</p>
            </section>
          )}

          {allergens.length > 0 && (
            <section className="bg-warning/10 mt-4 rounded-xl p-3">
              <h3 className="text-warning flex items-center gap-1.5 text-sm font-medium">
                <AlertTriangle className="size-4" aria-hidden="true" />
                Allergenlar
              </h3>

              <p className="text-warning/90 mt-1 text-sm">{allergens.join(', ')}</p>
            </section>
          )}

          {/*
            Tarkib umuman yo'q bo'lsa, SABAB aytiladi.

            Bo'sh joy qoldirish "ilova buzilgan" degan taassurot
            berardi; bu yozuv esa restoran hali to'ldirmaganini
            ochiq aytadi.
          */}
          {!showComposition && (
            <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
              Restoran bu taomning tarkibini hali kiritmagan.
            </p>
          )}
        </div>

        <div className="border-border/60 bg-card pb-safe flex items-center gap-3 rounded-b-none border-t p-4">
          <span className="text-lg font-semibold tabular-nums">{formatTiyin(item.price)}</span>

          <Button
            className="flex-1"
            disabled={!canOrder || !item.isAvailable}
            onClick={() => {
              onAdd();
              onClose();
            }}
          >
            {!item.isAvailable
              ? 'Tugagan'
              : quantity > 0
                ? `Savatda ${quantity} ta · yana qo'shish`
                : "Savatga qo'shish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
