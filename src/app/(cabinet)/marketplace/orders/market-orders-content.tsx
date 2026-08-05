'use client';

import { ChevronRight, PackageSearch } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
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
  MARKET_ORDER_STATUS_LABELS,
  MARKET_ORDER_STATUS_VARIANTS,
  type MarketOrdersResponse,
} from '@/modules/market/market.types';

const FILTERS = [
  { id: 'ALL', label: 'Barchasi' },
  { id: 'ACTIVE', label: 'Faol' },
  { id: 'DELIVERED', label: 'Yetkazilgan' },
  { id: 'CANCELLED', label: 'Bekor qilingan' },
] as const;

/** Marketplace buyurtmalari ro'yxati. */
export function MarketOrdersContent() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('ALL');

  const { data, isLoading, error } = useApiQuery<MarketOrdersResponse>(
    `/api/v1/market/orders?status=${filter}&pageSize=20`,
    { refreshIntervalMs: 30_000 },
  );

  const orders = data?.orders ?? [];

  return (
    <>
      <AppHeader title="Buyurtmalarim" showBack backHref="/marketplace" />

      <div className="px-4 pt-4 pb-4">
        <div className="-mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={cn(
                'shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                filter === item.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-secondary',
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
          <EmptyState
            icon={PackageSearch}
            title="Buyurtma yo'q"
            description="Katalogdan mahsulot tanlab, birinchi buyurtmangizni bering."
            action={
              <Button asChild>
                <Link href="/marketplace">Katalogni ochish</Link>
              </Button>
            }
          />
        )}

        <ul className="space-y-2">
          {orders.map((order, index) => (
            <li key={order.id}>
              <Link
                href={`/marketplace/orders/${order.id}`}
                className="bg-card border-border animate-fade-up block rounded-2xl border p-3 transition-transform active:scale-[0.99]"
                style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{order.shop.name}</p>
                      <Badge variant={MARKET_ORDER_STATUS_VARIANTS[order.status]} className="shrink-0">
                        {MARKET_ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground truncate text-xs">
                      {`${order.items.length} xil mahsulot · ${order.orderNumber}`}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatTiyin(order.total)}</p>
                    <p className="text-muted-foreground text-xs">{formatRelativeUz(order.createdAt)}</p>
                  </div>

                  <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
