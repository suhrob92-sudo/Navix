'use client';

import { ChevronRight, ClipboardList, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ServiceIcon } from '@/components/app/service-icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatRelativeUz } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
  FOOD_ORDER_STATUS_LABELS,
  FOOD_ORDER_STATUS_VARIANTS,
  isFinalStatus,
  type FoodOrdersResponse,
} from '@/modules/food/food.types';

const FILTERS = [
  { id: 'ALL', label: 'Barchasi' },
  { id: 'ACTIVE', label: 'Faol' },
  { id: 'DELIVERED', label: 'Yetkazilgan' },
  { id: 'CANCELLED', label: 'Bekor qilingan' },
] as const;

const PAGE_SIZE = 20;

/**
 * Buyurtmalar sahifasi.
 *
 * Hozircha faqat OVQAT buyurtmalari ko'rsatiladi — boshqa modullar
 * (taksi, marketplace) hali yozilmagan. Ular qo'shilganda shu ro'yxatga
 * qo'shiladi va turi bo'yicha ajratiladi.
 *
 * Har 30 soniyada yangilanadi: foydalanuvchi ovqat qayerdaligini
 * bilishni xohlaydi va buning uchun sahifani qo'lda yangilamasligi kerak.
 */
export function OrdersContent() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('ALL');

  const query = new URLSearchParams({ status: filter, pageSize: String(PAGE_SIZE) });

  const { data, isLoading, error } = useApiQuery<FoodOrdersResponse>(`/api/v1/food/orders?${query.toString()}`, {
    refreshIntervalMs: 30_000,
  });

  const orders = data?.orders ?? [];

  return (
    <>
      <AppHeader title="Buyurtmalar" />

      <div className="space-y-5 px-4 pt-4">
        {/* Filtrlar */}
        <div className="scrollbar-slim -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                filter === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground border',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
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
          <div className="bg-card border-border rounded-2xl border">
            <EmptyState
              icon={ClipboardList}
              title="Buyurtmalar yo'q"
              description="Ovqat buyurtma qiling — u shu yerda paydo bo'ladi va holatini kuzatib borasiz."
              action={
                <Button asChild>
                  <Link href="/food">Restoranlarni ko&apos;rish</Link>
                </Button>
              }
            />
          </div>
        )}

        <ul className="space-y-2">
          {orders.map((order, index) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-3 transition-transform active:scale-[0.99]"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <ServiceIcon icon={UtensilsCrossed} color={order.restaurant.color} size="sm" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{order.restaurant.name}</p>
                    <Badge variant={FOOD_ORDER_STATUS_VARIANTS[order.status]} className="shrink-0">
                      {FOOD_ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground truncate text-xs">
                    {`${order.items.length} xil taom · ${formatTiyin(order.total)}`}
                  </p>

                  <p className="text-muted-foreground truncate text-xs">
                    {isFinalStatus(order.status) && order.deliveredAt
                      ? formatRelativeUz(order.deliveredAt)
                      : formatRelativeUz(order.createdAt)}
                  </p>
                </div>

                <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
