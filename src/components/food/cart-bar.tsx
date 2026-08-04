'use client';

import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

import { useCart } from '@/modules/food/use-cart';

/**
 * Savat paneli — ekran pastida, tab-bar ustida suzib turadi.
 *
 * Nima uchun kerak: foydalanuvchi menyuni aylantirib yurganda savatda
 * nima borligini unutadi. Doim ko'rinib turgan panel "keyingi qadam"
 * ni eslatib turadi.
 *
 * `isReady` tugamaguncha ko'rsatilmaydi: savat brauzer xotirasidan
 * o'qiladi va server chizgan sahifada u bo'lmaydi. Darhol ko'rsatilsa,
 * panel bir zumga paydo bo'lib, keyin yo'qolib ketardi.
 */
export function CartBar() {
  const { isReady, totalQuantity, restaurantName } = useCart();

  if (!isReady || totalQuantity === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-30 px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <Link
        href="/food/cart"
        className="from-primary to-accent text-primary-foreground shadow-primary/30 mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-gradient-to-br p-3.5 shadow-lg transition-transform active:scale-[0.99]"
      >
        <span className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <ShoppingBag className="size-5" aria-hidden="true" />
          <span className="text-primary bg-background absolute -top-1.5 -right-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[0.6875rem] font-semibold tabular-nums">
            {totalQuantity}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Savatni ko&apos;rish</span>
          {restaurantName && <span className="block truncate text-xs opacity-90">{restaurantName}</span>}
        </span>
      </Link>
    </div>
  );
}
