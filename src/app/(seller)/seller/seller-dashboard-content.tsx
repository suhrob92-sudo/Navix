'use client';

import {
  ChevronRight,
  Clapperboard,
  ClipboardList,
  Images,
  Settings,
  PackageX,
  ShoppingBag,
  Store,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { StatCard } from '@/components/admin/stat-card';
import { ServiceIcon } from '@/components/app/service-icon';
import { CatalogImagePanel } from '@/components/catalog/catalog-image-panel';
import { ShopSettingsForm } from '@/app/(seller)/seller/shop-settings-form';
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
  /**
   * Rasmlar paneli FAQAT bittasida ochiladi.
   *
   * Hammasi birdan ochilsa, har bir do'kon uchun alohida so'rov
   * ketardi — sotuvchida bir nechta do'kon bo'lishi mumkin.
   */
  const [imagesId, setImagesId] = useState<string | null>(null);
  /** Sozlamalar paneli — rasmlar kabi, bir vaqtda bittasi. */
  const [settingsId, setSettingsId] = useState<string | null>(null);
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

        {/*
          Videolarga havola — sotuvchi uchun ARZON reklama yo'li.

          Kabinetda turgani muhim: sotuvchi bu imkoniyat borligini
          bilmasa, uni hech qachon o'zi topmaydi.
        */}
        <Link
          href="/feed/stats"
          className="bg-card border-border hover:bg-secondary mt-4 flex items-center gap-3 rounded-2xl border p-4 transition-colors"
        >
          <span className="bg-secondary text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Clapperboard className="size-5" aria-hidden="true" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Videolarim natijasi</span>
            <span className="text-muted-foreground block text-xs">
              Qaysi video ko&apos;rildi, mahsulot ochildi va buyurtma keltirdi
            </span>
          </span>
        </Link>

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

                {/*
                  DO'KON rasmlari — mahsulot rasmlaridan boshqa narsa.

                  Mahsulot rasmi bitta tovarni ko'rsatadi, do'kon rasmi
                  esa xaridor ro'yxatda ko'radigan birinchi taassurot.
                  Rasmsiz do'kon ro'yxatda bo'sh kvadrat bo'lib turadi.
                */}
                <button
                  type="button"
                  aria-expanded={imagesId === shop.id}
                  onClick={() => setImagesId(imagesId === shop.id ? null : shop.id)}
                  className="border-border/60 text-muted-foreground hover:text-foreground mt-3 flex w-full items-center justify-between border-t pt-3 text-sm transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Images className="size-4" aria-hidden="true" />
                    Do&apos;kon rasmlari
                  </span>
                  <ChevronRight
                    className={`size-4 transition-transform ${imagesId === shop.id ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {imagesId === shop.id && (
                  <div className="mt-3">
                    {/*
                      Sarlavha berilmaydi: yuqoridagi tugma allaqachon
                      "Do'kon rasmlari" deb turibdi. Ikkinchi marta
                      yozilsa, telefon ekranida bir xil matn ikki
                      qatorda takrorlanardi.
                    */}
                    <CatalogImagePanel owner="SHOP" ownerId={shop.id} />
                  </div>
                )}

                <button
                  type="button"
                  aria-expanded={settingsId === shop.id}
                  onClick={() => setSettingsId(settingsId === shop.id ? null : shop.id)}
                  className="border-border/60 text-muted-foreground hover:text-foreground mt-3 flex w-full items-center justify-between border-t pt-3 text-sm transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="size-4" aria-hidden="true" />
                    Sozlamalar
                  </span>
                  <ChevronRight
                    className={`size-4 transition-transform ${settingsId === shop.id ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {settingsId === shop.id && (
                  <div className="mt-3">
                    <ShopSettingsForm shop={shop} onSaved={reload} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <p className="text-muted-foreground mt-6 flex items-start gap-2 text-xs leading-relaxed">
          <PackageX className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Buyurtmani rad etsangiz, xaridorga pul TO&apos;LIQ qaytariladi va mahsulot omborga tiklanadi. Shuning
          uchun rad etishdan oldin zaxirani tekshiring.
        </p>
      </div>
    </>
  );
}
