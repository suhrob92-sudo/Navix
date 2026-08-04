'use client';

import { ChevronRight, ClipboardList, Store, TrendingUp, UtensilsCrossed, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { StatCard } from '@/components/admin/stat-card';
import { ServiceIcon } from '@/components/app/service-icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatTiyin } from '@/lib/money';
import type { MerchantRestaurant, MerchantRestaurantsResponse } from '@/modules/merchant/merchant.types';
import { RequireMerchant } from '@/modules/merchant/require-merchant';

/**
 * Restoran kabineti — bosh sahifa.
 *
 * Eng muhim narsa yuqorida: nechta buyurtma kutmoqda. Restoran xodimi
 * telefonni qo'liga olganda birinchi shuni ko'rishi kerak.
 */
export function MerchantDashboardContent() {
  return (
    <RequireMerchant>
      <DashboardBody />
    </RequireMerchant>
  );
}

function DashboardBody() {
  const request = useApiClient();

  /**
   * Har 30 soniyada yangilanadi: yangi buyurtma kelganini xodim
   * sahifani qayta ochmasdan ko'rishi kerak.
   */
  const { data, isLoading, error, reload } = useApiQuery<MerchantRestaurantsResponse>(
    '/api/v1/merchant/restaurants',
    { refreshIntervalMs: 30_000 },
  );

  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const restaurants = data?.restaurants ?? [];
  const stats = data?.stats;

  async function toggleOpen(restaurant: MerchantRestaurant, isOpen: boolean) {
    setSavingId(restaurant.id);
    setActionError(null);

    try {
      await request(`/api/v1/merchant/restaurants/${restaurant.id}`, {
        method: 'PATCH',
        body: { isOpen },
      });

      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <AdminHeader title="Restoran kabineti" />

      <div className="px-4 pt-4">
        {error && (
          <Alert variant="error" title="Ma'lumotni yuklab bo'lmadi" className="mb-4">
            {error}
          </Alert>
        )}

        {actionError && (
          <Alert variant="error" className="mb-4">
            {actionError}
          </Alert>
        )}

        {/* Kutayotgan buyurtmalar — eng muhimi */}
        <Link
          href="/merchant/orders"
          className="from-primary to-accent text-primary-foreground animate-fade-up flex items-center gap-4 rounded-2xl bg-gradient-to-br p-5 transition-transform active:scale-[0.99]"
        >
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <ClipboardList className="size-6" aria-hidden="true" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-xs opacity-90">Bajarilishi kerak</span>
            <span className="block text-2xl font-semibold tabular-nums">
              {isLoading ? '—' : `${stats?.activeOrders ?? 0} ta buyurtma`}
            </span>
          </span>

          <ChevronRight className="size-5 shrink-0 opacity-80" aria-hidden="true" />
        </Link>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard
            label="Bugungi buyurtmalar"
            value={String(stats?.todayOrders ?? 0)}
            hint={isLoading ? undefined : formatTiyin(stats?.todayRevenue ?? 0)}
            icon={ClipboardList}
            isLoading={isLoading}
          />

          <StatCard
            label="Haftalik tushum"
            value={isLoading ? '—' : formatTiyin(stats?.weekRevenue ?? 0)}
            hint={`${stats?.weekOrders ?? 0} ta buyurtma`}
            icon={TrendingUp}
            tone="success"
            isLoading={isLoading}
          />
        </div>

        {!isLoading && (stats?.cancelledToday ?? 0) > 0 && (
          <Alert variant="warning" title="Bugun bekor qilingan buyurtmalar" className="mt-4">
            {`${stats?.cancelledToday} ta buyurtma bekor qilindi. Sabablarini ko'rib chiqing — takrorlansa mijozlar yo'qoladi.`}
          </Alert>
        )}

        {/* Restoranlar */}
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">Mening restoranlarim</h2>

          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          )}

          {!isLoading && restaurants.length === 0 && (
            <div className="text-muted-foreground rounded-2xl border border-dashed p-6 text-center text-sm">
              <Store className="mx-auto mb-2 size-6" aria-hidden="true" />
              Sizga hali restoran biriktirilmagan.
            </div>
          )}

          <ul className="space-y-3">
            {restaurants.map((restaurant, index) => (
              <li
                key={restaurant.id}
                className="bg-card border-border animate-fade-up rounded-2xl border p-4"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-center gap-3">
                  <ServiceIcon icon={UtensilsCrossed} color={restaurant.color} size="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{restaurant.name}</p>
                      {restaurant.activeOrderCount > 0 && (
                        <Badge variant="default" className="shrink-0 tabular-nums">
                          {restaurant.activeOrderCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {`${restaurant.cuisine} · ${restaurant.menuItemCount} ta taom · ${restaurant.deliveryMinutes} daq`}
                    </p>
                  </div>
                </div>

                {/*
                  "Ochiq/Yopiq" — kunlik eng ko'p ishlatiladigan tugma.
                  Oshxona band bo'lganda restoran o'zini ro'yxatdan
                  vaqtincha olib qo'yadi va yangi buyurtma kelmaydi.
                */}
                <div className="border-border/60 mt-3 border-t pt-3">
                  <Switch
                    checked={restaurant.isOpen}
                    disabled={savingId === restaurant.id}
                    onCheckedChange={(value) => toggleOpen(restaurant, value)}
                    label={restaurant.isOpen ? 'Buyurtma qabul qilinmoqda' : 'Yopiq'}
                    description={
                      restaurant.isOpen
                        ? "Restoran ro'yxatda ko'rinadi"
                        : "Mijozlar menyuni ko'radi, lekin buyurtma bera olmaydi"
                    }
                  />
                </div>

                <Link
                  href={`/merchant/menu/${restaurant.id}`}
                  className="border-border/60 text-muted-foreground hover:text-foreground mt-3 flex items-center justify-between border-t pt-3 text-sm transition-colors"
                >
                  <span>Menyuni boshqarish</span>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-muted-foreground mt-6 flex items-start gap-2 text-xs leading-relaxed">
          <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Buyurtmani rad etsangiz, mijozga pul TO&apos;LIQ qaytariladi. Shuning uchun rad etishdan oldin taomlar
          mavjudligini tekshiring.
        </p>
      </div>
    </>
  );
}
