'use client';

import { History } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { Skeleton } from '@/components/ui/skeleton';
import { RECENT_ROW_SIZE, type RecentTarget } from '@/config/recent';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { RecentItem, RecentResponse } from '@/modules/recent/recent.types';

/**
 * "Yaqinda ko'rilganlar" qatori.
 *
 * ── Nima uchun QATOR, ro'yxat emas ────────────────────────────────────
 * Bu bo'lim bosh sahifada, boshqa mazmun ORASIDA turadi. Vertikal
 * ro'yxat bo'lsa, u ekranni egallab, asosiy mazmunni pastga
 * surib yuborardi.
 *
 * Gorizontal qator esa bitta qator joy oladi va odam uni
 * xohlasa suradi, xohlamasa e'tibor bermaydi.
 *
 * ── Nima uchun BO'SH bo'lsa umuman ko'rinmaydi ────────────────────────
 * "Yaqinda ko'rilganlar yo'q" degan yozuv yangi foydalanuvchiga
 * hech qanday foyda bermaydi — u faqat joy egallaydi.
 */

export interface RecentRowProps {
  /** Faqat shu tur. Berilmasa — hammasi aralash. */
  target?: RecentTarget;
  title?: string;
  className?: string;
}

export function RecentRow({ target, title = "Yaqinda ko'rgansiz", className }: RecentRowProps) {
  const request = useApiClient();

  const path = target
    ? `/api/v1/recent?target=${target}&limit=${RECENT_ROW_SIZE}`
    : `/api/v1/recent?limit=${RECENT_ROW_SIZE}`;

  const { data, isLoading, setData } = useApiQuery<RecentResponse>(path);

  const [isClearing, setIsClearing] = useState(false);

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-32 w-28 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const items = data?.items ?? [];

  // Bo'sh bo'lsa bo'lim UMUMAN chizilmaydi.
  if (items.length === 0) return null;

  async function clearAll() {
    setIsClearing(true);

    try {
      await request('/api/v1/recent', { method: 'DELETE' });

      setData({ items: [] });
    } catch {
      /*
        Tozalash ishlamasa ham xato ko'rsatilmaydi: bu yordamchi
        bo'lim va u sahifaning asosiy ishiga xalaqit bermasligi
        kerak. Odam qaytadan bosishi mumkin.
      */
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <section className={cn('space-y-2.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <History className="text-muted-foreground size-4" aria-hidden="true" />
          {title}
        </h2>

        {/*
          Tozalash tugmasi — bu SOZLAMA emas.

          Ko'rish tarixi shaxsiy ma'lumot: odam sovg'a qidirgan
          bo'lishi mumkin va telefonini olgan boshqa odam uni
          ko'rmasligi kerak.
        */}
        <button
          type="button"
          onClick={() => void clearAll()}
          disabled={isClearing}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors disabled:opacity-50"
        >
          Tozalash
        </button>
      </div>

      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.id} className="w-28 shrink-0">
            <RecentCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Qatordagi bitta kartochka — tor va past. */
function RecentCard({ item }: { item: RecentItem }) {
  return (
    <Link
      href={item.href}
      className={cn('block', !item.isAvailable && 'opacity-55')}
      aria-label={item.name}
    >
      <CatalogThumb image={item.image} name={item.name} className="rounded-xl" />

      <p className="mt-1.5 line-clamp-2 text-xs leading-snug font-medium">{item.name}</p>

      {item.priceTiyin !== null && (
        <p className="mt-0.5 text-xs font-semibold tabular-nums">
          {item.pricePrefix
            ? `${formatTiyin(item.priceTiyin)} ${item.pricePrefix}`
            : formatTiyin(item.priceTiyin)}
        </p>
      )}

      {!item.isAvailable && <p className="text-muted-foreground text-[0.625rem]">Mavjud emas</p>}
    </Link>
  );
}
