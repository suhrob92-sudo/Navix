'use client';

import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

import { useMarketCart } from '@/modules/market/use-market-cart';

/**
 * Savat paneli — ekran pastida, tab-bar ustida suzib turadi.
 *
 * `isReady` tugamaguncha ko'rsatilmaydi: savat brauzer xotirasidan
 * o'qiladi va server chizgan sahifada u bo'lmaydi. Darhol ko'rsatilsa,
 * panel bir zumga paydo bo'lib, keyin yo'qolib ketardi.
 */
export function MarketCartBar() {
  const { isReady, totalQuantity, shopName } = useMarketCart();

  if (!isReady || totalQuantity === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-30 px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <Link
        href="/marketplace/cart"
        className="from-primary to-accent text-primary-foreground shadow-primary/30 mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-gradient-to-br p-3.5 shadow-lg transition-transform active:scale-[0.99]"
      >
        <span className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <ShoppingCart className="size-5" aria-hidden="true" />
          <span className="text-primary bg-background absolute -top-1.5 -right-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[0.6875rem] font-semibold tabular-nums">
            {totalQuantity}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Savatni ko&apos;rish</span>
          {shopName && <span className="block truncate text-xs opacity-90">{shopName}</span>}
        </span>
      </Link>
    </div>
  );
}
