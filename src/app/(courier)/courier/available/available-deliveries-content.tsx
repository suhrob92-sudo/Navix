'use client';

import { PackageSearch } from 'lucide-react';

import { AdminHeader } from '@/components/admin/admin-header';
import { DeliveryCard } from '@/components/courier/delivery-card';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import type { DeliveriesResponse } from '@/modules/courier/courier.types';
import { RequireCourier } from '@/modules/courier/require-courier';

const PAGE_SIZE = 20;

/**
 * Umumiy ro'yxat — hali hech kim olmagan topshiriqlar.
 *
 * ENG ESKISI tepada: navbat tartibi buzilmasligi kerak, birinchi
 * kelgan mijoz birinchi yetkazilishi kerak. Shuning uchun bu yerda
 * "eng qimmatini tanlash" uchun saralash ATAYLAB yo'q.
 *
 * Har 15 soniyada yangilanadi: topshiriqni boshqa kuryer olib
 * ketgan bo'lishi mumkin va buni tez ko'rsatgan yaxshi.
 */
export function AvailableDeliveriesContent() {
  return (
    <RequireCourier>
      <AvailableBody />
    </RequireCourier>
  );
}

function AvailableBody() {
  const { data, isLoading, error } = useApiQuery<DeliveriesResponse>(
    `/api/v1/courier/deliveries?status=AVAILABLE&pageSize=${PAGE_SIZE}`,
    { refreshIntervalMs: 15_000 },
  );

  const deliveries = data?.deliveries ?? [];

  return (
    <>
      <AdminHeader title="Yangi ishlar" showBack backHref="/courier" />

      <div className="px-4 pt-4">
        {!isLoading && error && (
          <Alert variant="error" title="Topshiriqlarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && !error && deliveries.length === 0 && (
          <EmptyState
            icon={PackageSearch}
            title="Hozircha ish yo'q"
            description="Restoran yoki do'kon buyurtmani yo'lga chiqarganda u shu yerda paydo bo'ladi."
          />
        )}

        <ul className="space-y-2">
          {deliveries.map((delivery, index) => (
            <li key={delivery.id}>
              <DeliveryCard delivery={delivery} index={index} />
            </li>
          ))}
        </ul>

        {!isLoading && deliveries.length > 0 && (
          <p className="text-muted-foreground mt-6 text-center text-xs leading-relaxed">
            Eng eskisi tepada — navbat tartibi shunday. Topshiriqni ochib, tafsilotlarini ko&apos;rib oling.
          </p>
        )}
      </div>
    </>
  );
}
