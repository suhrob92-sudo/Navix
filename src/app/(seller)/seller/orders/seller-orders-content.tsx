'use client';

import { ChevronRight, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatRelativeUz } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { MARKET_ORDER_STATUS_LABELS, MARKET_ORDER_STATUS_VARIANTS } from '@/modules/market/market.types';
import { RequireSeller } from '@/modules/seller/require-seller';
import type { SellerOrdersResponse } from '@/modules/seller/seller.types';

const FILTERS = [
  { id: 'ACTIVE', label: 'Faol' },
  { id: 'DELIVERED', label: 'Yetkazilgan' },
  { id: 'CANCELLED', label: 'Bekor qilingan' },
  { id: 'ALL', label: 'Barchasi' },
] as const;

const PAGE_SIZE = 20;

/**
 * Do'konga kelgan buyurtmalar.
 *
 * Faol ro'yxatda ENG ESKISI tepada turadi — omborda navbat tartibi
 * buzilmasligi kerak. Boshqa filtrlar esa odatdagidek, yangisidan
 * boshlab ko'rsatiladi.
 */
export function SellerOrdersContent() {
  return (
    <RequireSeller>
      <OrdersBody />
    </RequireSeller>
  );
}

function OrdersBody() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('ACTIVE');

  const query = new URLSearchParams({ status: filter, pageSize: String(PAGE_SIZE) });

  const { data, isLoading, error } = useApiQuery<SellerOrdersResponse>(`/api/v1/seller/orders?${query.toString()}`, {
    refreshIntervalMs: 20_000,
  });

  const orders = data?.orders ?? [];

  return (
    <>
      <AdminHeader title="Buyurtmalar" showBack backHref="/seller" />

      <div className="px-4 pt-4">
        <div className="-mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={cn(
                'inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors',
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
            {Array.from({ length: 5 }, (_, index) => (
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
            icon={ClipboardList}
            title={filter === 'ACTIVE' ? "Bajarilishi kerak buyurtma yo'q" : 'Buyurtma topilmadi'}
            description={
              filter === 'ACTIVE'
                ? "Hammasi bajarilgan. Yangi buyurtma kelganda shu yerda paydo bo'ladi."
                : "Boshqa filtrni tanlab ko'ring."
            }
          />
        )}

        <ul className="space-y-2">
          {orders.map((order, index) => (
            <li key={order.id}>
              <Link
                href={`/seller/orders/${order.id}`}
                className="bg-card border-border animate-fade-up block rounded-2xl border p-3 transition-transform active:scale-[0.99]"
                style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{order.orderNumber}</p>
                      <Badge variant={MARKET_ORDER_STATUS_VARIANTS[order.status]} className="shrink-0">
                        {MARKET_ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground truncate text-xs">
                      {`${order.customer.name ?? formatUzPhone(order.customer.phone)} · ${order.items.length} xil mahsulot`}
                    </p>

                    <p className="text-muted-foreground truncate text-xs">{order.shop.name}</p>
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
