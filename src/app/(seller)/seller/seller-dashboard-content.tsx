'use client';

import { ChevronRight, ClipboardList, PackageX, ShoppingBag, Store, TrendingUp } from 'lucide-react';
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
import { RequireSeller } from '@/modules/seller/require-seller';
import type { SellerShop, SellerShopsResponse } from '@/modules/seller/seller.types';

/**
 * Sotuvchi kabineti — bosh sahifa.
 *
 * Eng muhim ikki raqam yuqorida: nechta buyurtma kutmoqda va nechta
 * mahsulot tugagan. Ikkalasi ham PUL yo'qotadigan holat: birinchisi
 * kechikish, ikkinchisi esa ko'rinmaydigan yo'qotish — tugagan tovar
 * sahifada turadi, lekin uni hech kim sotib ololmaydi.
 */
export function SellerDashboardContent() {
  return (
    <RequireSeller>
      <DashboardBody />
    </RequireSeller>
  );
}

function DashboardBody() {
  const request = useApiClient();

  /** Har 30 soniyada yangilanadi — yangi buyurtma darhol ko'rinsin. */
  const { data, isLoading, error, reload } = useApiQuery<SellerShopsResponse>('/api/v1/seller/shops', {
    refreshIntervalMs: 30_000,
  });

  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const shops = data?.shops ?? [];
  const stats = data?.stats;

  async function toggleOpen(shop: SellerShop, isOpen: boolean) {
    setSavingId(shop.id);
    setActionError(null);

    try {
      await request(`/api/v1/seller/shops/${shop.id}`, { method: 'PATCH', body: { isOpen } });

      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <AdminHeader title="Sotuvchi kabineti" />

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
          href="/seller/orders"
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

        {/*
          Tugagan mahsulot — sotuvchi o'zi sezmaydigan yo'qotish.
          Buyurtma kelmagani uchun hech qanday signal bo'lmaydi,
          shuning uchun kabinet buni o'zi aytishi kerak.
        */}
        {!isLoading && (stats?.outOfStock ?? 0) > 0 && (
          <Alert variant="warning" title="Zaxira tugagan mahsulotlar" className="mt-4">
            {`${stats?.outOfStock} ta mahsulot omborda tugagan. Ular katalogda ko'rinadi, lekin sotib bo'lmaydi — zaxirani yangilang.`}
          </Alert>
        )}

        {!isLoading && (stats?.cancelledToday ?? 0) > 0 && (
          <Alert variant="warning" title="Bugun bekor qilingan buyurtmalar" className="mt-4">
            {`${stats?.cancelledToday} ta buyurtma bekor qilindi. Sabablarini ko'rib chiqing — takrorlansa xaridorlar yo'qoladi.`}
          </Alert>
        )}

        {/* Do'konlar */}
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">Mening do&apos;konlarim</h2>

          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          )}

          {!isLoading && shops.length === 0 && (
            <div className="text-muted-foreground rounded-2xl border border-dashed p-6 text-center text-sm">
              <Store className="mx-auto mb-2 size-6" aria-hidden="true" />
              Sizga hali do&apos;kon biriktirilmagan.
            </div>
          )}

          <ul className="space-y-3">
            {shops.map((shop, index) => (
              <li
                key={shop.id}
                className="bg-card border-border animate-fade-up rounded-2xl border p-4"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-center gap-3">
                  <ServiceIcon icon={ShoppingBag} color={shop.color} size="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{shop.name}</p>
                      {shop.activeOrderCount > 0 && (
                        <Badge variant="default" className="shrink-0 tabular-nums">
                          {shop.activeOrderCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {`${shop.productCount} ta mahsulot · ${shop.deliveryDays} kun`}
                    </p>
                  </div>
                </div>

                {shop.outOfStockCount > 0 && (
                  <p className="text-warning mt-2 flex items-center gap-1.5 text-xs">
                    <PackageX className="size-3.5 shrink-0" aria-hidden="true" />
                    {`${shop.outOfStockCount} ta mahsulot tugagan`}
                  </p>
                )}

                {/*
                  "Ochiq/Yopiq" — kunlik eng ko'p ishlatiladigan tugma.
                  Ombor sanalayotganda yoki ta'til paytida do'kon o'zini
                  vaqtincha to'xtatadi va yangi buyurtma kelmaydi.
                */}
                <div className="border-border/60 mt-3 border-t pt-3">
                  <Switch
                    checked={shop.isOpen}
                    disabled={savingId === shop.id}
                    onCheckedChange={(value) => toggleOpen(shop, value)}
                    label={shop.isOpen ? 'Buyurtma qabul qilinmoqda' : 'Yopiq'}
                    description={
                      shop.isOpen
                        ? "Do'kon buyurtma qabul qilyapti"
                        : "Xaridorlar mahsulotlarni ko'radi, lekin buyurtma bera olmaydi"
                    }
                  />
                </div>

                <Link
                  href={`/seller/products/${shop.id}`}
                  className="border-border/60 text-muted-foreground hover:text-foreground mt-3 flex items-center justify-between border-t pt-3 text-sm transition-colors"
                >
                  <span>Ombor va mahsulotlar</span>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-muted-foreground mt-6 flex items-start gap-2 text-xs leading-relaxed">
          <PackageX className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Buyurtmani rad etsangiz, xaridorga pul TO&apos;LIQ qaytariladi va mahsulot omborga tiklanadi. Shuning uchun rad
          etishdan oldin zaxirani tekshiring.
        </p>
      </div>
    </>
  );
}
