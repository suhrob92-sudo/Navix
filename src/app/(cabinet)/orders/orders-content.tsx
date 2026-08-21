'use client';

import { Bus, ChevronRight, ClipboardList, Hotel, Package, Store, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ServiceIcon } from '@/components/app/service-icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatRelativeUz } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
  emptyOrdersText,
  ORDER_FILTERS,
  ORDER_KIND_META,
  type OrderFilter,
  type OrderKind,
  type OrdersResponse,
  type UnifiedOrder,
} from '@/modules/orders/orders.types';

/**
 * Buyurtmalar sahifasi — BARCHA modullar bitta ro'yxatda.
 *
 * ── Nima uchun birlashtirildi ─────────────────────────────────────────
 * Ilgari bu sahifa faqat OVQAT buyurtmalarini ko'rsatardi, nomi esa
 * "Buyurtmalarim" edi. Marketplace buyurtmasini qidirgan odam uni bu
 * yerdan topa olmasdi va "buyurtmam yo'qoldi" deb o'ylardi.
 *
 * Endi beshta manba — ovqat, Marketplace, mehmonxona, chiptalar va
 * posilkalar — vaqt bo'yicha bitta ro'yxatda turadi. Har birining
 * batafsil sahifasi esa o'z modulida qoladi: u yerda taomlar
 * ro'yxati, xona nomi yoki reys vaqti bor.
 *
 * Har 30 soniyada yangilanadi: odam ovqat qayerdaligini bilishni
 * xohlaydi va buning uchun sahifani qo'lda yangilamasligi kerak.
 */

/** Har bir tur uchun ikonka — modulning o'z ikonkasi bilan bir xil. */
const KIND_ICONS: Record<OrderKind, typeof UtensilsCrossed> = {
  FOOD: UtensilsCrossed,
  MARKET: Store,
  HOTEL: Hotel,
  TRAVEL: Bus,
  PARCEL: Package,
};

const KINDS: OrderKind[] = ['FOOD', 'MARKET', 'HOTEL', 'TRAVEL', 'PARCEL'];

export function OrdersContent() {
  const [filter, setFilter] = useState<OrderFilter>('ALL');
  const [kind, setKind] = useState<OrderKind | 'ALL'>('ALL');

  const query = new URLSearchParams({ filter, kind });

  const { data, isLoading, error } = useApiQuery<OrdersResponse>(`/api/v1/orders?${query.toString()}`, {
    refreshIntervalMs: 30_000,
  });

  const orders = data?.orders ?? [];
  const counts = data?.counts;

  /**
   * Turi bo'yicha filtr FAQAT mavjud turlar uchun ko'rsatiladi.
   *
   * Hech qachon mehmonxona bandlamagan odamga "Mehmonxona" tugmasini
   * ko'rsatish — bosilganda doim bo'sh ro'yxat degani.
   */
  const availableKinds = KINDS.filter((item) => (counts?.[item] ?? 0) > 0);

  return (
    <>
      <AppHeader title="Buyurtmalar" />

      <div className="space-y-4 px-4 pt-4">
        {/* Holat bo'yicha filtr */}
        <div className="scrollbar-slim -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {ORDER_FILTERS.map((item) => (
            <FilterChip
              key={item.value}
              label={item.label}
              isActive={filter === item.value}
              onClick={() => setFilter(item.value)}
            />
          ))}
        </div>

        {/*
          Tur bo'yicha filtr — ikkinchi qator.

          Bitta qatorga qo'shilsa, tor telefon ekranida sakkizta tugma
          bo'lib, ular orasidan kerakligini topish qiyin bo'lardi.
        */}
        {availableKinds.length > 1 && (
          <div className="scrollbar-slim -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <FilterChip label="Hammasi" isActive={kind === 'ALL'} onClick={() => setKind('ALL')} isSmall />

            {availableKinds.map((item) => (
              <FilterChip
                key={item}
                label={`${ORDER_KIND_META[item].label} · ${counts?.[item] ?? 0}`}
                isActive={kind === item}
                onClick={() => setKind(item)}
                isSmall
              />
            ))}
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Buyurtmalarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && orders.length === 0 && (
          <EmptyState icon={ClipboardList} title="Buyurtma yo'q" description={emptyOrdersText(filter, kind)} />
        )}

        {orders.length > 0 && (
          <ul className="space-y-3 pb-4" aria-label="Buyurtmalar">
            {orders.map((order) => (
              <OrderRow key={`${order.kind}-${order.id}`} order={order} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

interface FilterChipProps {
  label: string;
  isActive: boolean;
  isSmall?: boolean;
  onClick: () => void;
}

function FilterChip({ label, isActive, isSmall = false, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center rounded-full font-medium transition-colors',
        isSmall ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'bg-card border-border text-muted-foreground hover:text-foreground border',
      )}
    >
      {label}
    </button>
  );
}

function OrderRow({ order }: { order: UnifiedOrder }) {
  const meta = ORDER_KIND_META[order.kind];
  const Icon = KIND_ICONS[order.kind];

  return (
    <li>
      <Link
        href={order.href}
        className="bg-card border-border hover:border-primary/30 flex items-center gap-3 rounded-2xl border p-3.5 transition-colors active:scale-[0.99]"
      >
        <ServiceIcon icon={Icon} color={meta.color} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{order.title}</p>
            <Badge variant={order.statusVariant} className="shrink-0">
              {order.statusLabel}
            </Badge>
          </div>

          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {meta.label} · {order.subtitle}
          </p>

          <p className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
            <span className="text-foreground font-medium tabular-nums">{formatTiyin(order.totalTiyin)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatRelativeUz(order.createdAt)}</span>
          </p>
        </div>

        <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      </Link>
    </li>
  );
}
