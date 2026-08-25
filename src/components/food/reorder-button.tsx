'use client';

import { RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { describeReorder, planReorder, type ReorderPlan } from '@/config/reorder';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { useCart } from '@/modules/food/use-cart';
import type { FoodOrderView, RestaurantResponse } from '@/modules/food/food.types';

/**
 * "Buyurtmani takrorlash" — bir bosishda o'sha savat.
 *
 * ── Nima uchun menyu QAYTA so'raladi ──────────────────────────────────
 * Savatni eski buyurtmadan to'g'ridan-to'g'ri to'ldirish mumkin edi
 * va kod ancha qisqa bo'lardi.
 *
 * Lekin eski buyurtmadagi taom bugun menyuda bo'lmasligi mumkin:
 * restoran uni o'chirgan, tugab qolgan yoki narxi o'zgargan. O'shanda
 * odam savatda mavjud bo'lmagan taomni ko'rardi va buyurtma faqat
 * kassada — server tekshiruvida — rad etilardi.
 *
 * Bugungi menyu bilan solishtirish esa muammoni ODAM ko'radigan
 * joyda hal qiladi.
 *
 * ── Nima uchun savat TO'LIQ almashtiriladi ────────────────────────────
 * Savatda allaqachon nimadir bo'lishi mumkin. Ustiga qo'shish
 * "takrorlash" degan va'daga zid: odam o'sha buyurtmani kutadi,
 * eskisi bilan aralashmasini emas.
 *
 * Shuning uchun savat bo'sh bo'lmasa, ogohlantirish beriladi.
 */

export interface ReorderButtonProps {
  order: FoodOrderView;
  className?: string;
}

interface Pending {
  plan: ReorderPlan;
  restaurant: { id: string; slug: string; name: string };
  notes: string[];
}

export function ReorderButton({ order, className }: ReorderButtonProps) {
  const request = useApiClient();
  const router = useRouter();
  const cart = useCart();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  function apply(next: Pending) {
    cart.replaceAll(next.restaurant, next.plan.lines);
    setPending(null);
    router.push('/food/cart');
  }

  async function prepare() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await request<RestaurantResponse>(
        `/api/v1/food/restaurants/${order.restaurant.slug}`,
      );

      const restaurant = response.restaurant;
      const menu = restaurant.categories.flatMap((category) => category.items);

      const plan = planReorder(order.items, menu);

      if (plan.lines.length === 0) {
        /*
          Hech narsa qo'shilmasa, savatni ochishning ma'nosi yo'q:
          odam bo'sh savatni ko'rib nima bo'lganini tushunmasdi.
        */
        setError(
          "Bu buyurtmadagi taomlar bugun mavjud emas. Restoran menyusini ochib boshqa taom tanlang.",
        );
        return;
      }

      const notes = describeReorder(plan);

      /*
        Restoran yopiq bo'lsa ham savatni to'ldirish mumkin —
        buyurtma berishni kassa to'xtatadi. Lekin odam buni
        OLDINDAN bilgani yaxshi.
      */
      if (!restaurant.openState.isOpen) {
        notes.push(`${restaurant.name} hozir yopiq: ${restaurant.openState.text}.`);
      }

      // Boshqa restoranning savati BUTUNLAY o'chib ketadi — bu ogohlantiriladi.
      if (cart.lines.length > 0 && cart.restaurantId !== restaurant.id) {
        notes.push(`Savatdagi ${cart.restaurantName ?? 'boshqa restoran'} taomlari o'chiriladi.`);
      }

      const next: Pending = {
        plan,
        restaurant: { id: restaurant.id, slug: restaurant.slug, name: restaurant.name },
        notes,
      };

      // Ogohlantiradigan narsa bo'lmasa, so'ramasdan davom etamiz.
      if (notes.length === 0) {
        apply(next);
        return;
      }

      setPending(next);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={className}>
      {error && (
        <Alert variant="warning" className="mb-2">
          {error}
        </Alert>
      )}

      <Button
        variant="outline"
        fullWidth
        onClick={prepare}
        isLoading={isLoading}
        loadingText="Menyu tekshirilmoqda..."
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Buyurtmani takrorlash
      </Button>

      <ConfirmDialog
        open={pending !== null}
        title="Savatni to'ldiramizmi?"
        description={pending ? pending.notes.join(' ') : ''}
        confirmLabel="Ha, savatga"
        cancelLabel="Yo'q"
        onConfirm={() => pending && apply(pending)}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
