'use client';

import { UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { MerchantMenuItem, MerchantMenuResponse } from '@/modules/merchant/merchant.types';
import { RequireMerchant } from '@/modules/merchant/require-merchant';

export interface MerchantMenuContentProps {
  restaurantId: string;
}

/**
 * Menyu boshqaruvi.
 *
 * Hozircha bitta, lekin eng kerakli amal: taomni vaqtincha O'CHIRISH.
 * Kun davomida mahsulot tugab qoladi va restoran uni ro'yxatdan
 * darhol olib qo'yishi kerak — aks holda mijoz buyurtma beradi, keyin
 * restoran uni rad etishga majbur bo'ladi va ikkalasi ham yutqazadi.
 *
 * Narx tahriri va yangi taom qo'shish keyingi bosqichda.
 */
export function MerchantMenuContent({ restaurantId }: MerchantMenuContentProps) {
  return (
    <RequireMerchant>
      <MenuBody restaurantId={restaurantId} />
    </RequireMerchant>
  );
}

function MenuBody({ restaurantId }: MerchantMenuContentProps) {
  const request = useApiClient();

  const { data, isLoading, error, setData } = useApiQuery<MerchantMenuResponse>(
    `/api/v1/merchant/restaurants/${restaurantId}/menu`,
  );

  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const items = data?.items ?? [];

  // Bo'limlar bo'yicha guruhlaymiz — menyu odatdagidek ko'rinsin.
  const groups = items.reduce<Map<string, MerchantMenuItem[]>>((accumulator, item) => {
    const list = accumulator.get(item.categoryName) ?? [];
    list.push(item);
    accumulator.set(item.categoryName, list);

    return accumulator;
  }, new Map());

  async function toggleAvailability(item: MerchantMenuItem, isAvailable: boolean) {
    setSavingId(item.id);
    setActionError(null);

    try {
      await request(`/api/v1/merchant/menu-items/${item.id}`, {
        method: 'PATCH',
        body: { isAvailable },
      });

      // Optimistik yangilash: butun ro'yxatni qayta so'ramaymiz —
      // menyu uzun bo'lishi mumkin va har bosishda kutish noqulay.
      setData((current) => ({
        items: (current?.items ?? []).map((row) => (row.id === item.id ? { ...row, isAvailable } : row)),
      }));
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setSavingId(null);
    }
  }

  const unavailableCount = items.filter((item) => !item.isAvailable).length;

  return (
    <>
      <AdminHeader title="Menyu" showBack backHref="/merchant" />

      <div className="px-4 pt-4">
        {error && (
          <Alert variant="error" title="Menyuni yuklab bo'lmadi" className="mb-4">
            {error}
          </Alert>
        )}

        {actionError && (
          <Alert variant="error" className="mb-4">
            {actionError}
          </Alert>
        )}

        {!isLoading && unavailableCount > 0 && (
          <Alert variant="warning" className="mb-4">
            {`${unavailableCount} ta taom hozir mavjud emas. Mijozlar ularni ko'radi, lekin buyurtma bera olmaydi.`}
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <EmptyState icon={UtensilsCrossed} title="Menyu bo'sh" description="Bu restoranda hali taom yo'q." />
        )}

        {[...groups.entries()].map(([category, categoryItems]) => (
          <section key={category} className="mb-6">
            <h2 className="mb-3 text-sm font-semibold">{category}</h2>

            <ul className="space-y-2">
              {categoryItems.map((item) => (
                <li
                  key={item.id}
                  className={cn('bg-card border-border rounded-2xl border p-3', !item.isAvailable && 'opacity-70')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-muted-foreground text-sm tabular-nums">{formatTiyin(item.price)}</p>
                    </div>
                  </div>

                  <div className="border-border/60 mt-2.5 border-t pt-2.5">
                    <Switch
                      checked={item.isAvailable}
                      disabled={savingId === item.id}
                      onCheckedChange={(value) => toggleAvailability(item, value)}
                      label={item.isAvailable ? 'Mavjud' : 'Tugagan'}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
