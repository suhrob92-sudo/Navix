'use client';

import { ChevronRight, PackageCheck, PackageSearch, TrendingUp, Wallet } from 'lucide-react';
import Link from 'next/link';

import { AdminHeader } from '@/components/admin/admin-header';
import { StatCard } from '@/components/admin/stat-card';
import { DeliveryCard } from '@/components/courier/delivery-card';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatTiyin } from '@/lib/money';
import { MAX_ACTIVE_DELIVERIES, type CourierOverviewResponse } from '@/modules/courier/courier.types';
import { RequireCourier } from '@/modules/courier/require-courier';

/**
 * Kuryer kabineti — bosh sahifa.
 *
 * Tepada ikkita savolga javob: HOZIR nima qilishim kerak va BUGUN
 * qancha ishladim. Kuryer telefonni qo'liga olganda aynan shu ikkitasi
 * qiziqtiradi — qolgani pastda.
 */
export function CourierDashboardContent() {
  return (
    <RequireCourier>
      <DashboardBody />
    </RequireCourier>
  );
}

function DashboardBody() {
  /** Har 20 soniyada yangilanadi — yangi ish tez ko'rinsin. */
  const { data, isLoading, error } = useApiQuery<CourierOverviewResponse>('/api/v1/courier/overview', {
    refreshIntervalMs: 20_000,
  });

  const stats = data?.stats;
  const active = data?.active ?? [];
  const isFull = (stats?.activeDeliveries ?? 0) >= MAX_ACTIVE_DELIVERIES;

  return (
    <>
      <AdminHeader title="Kuryer kabineti" />

      <div className="px-4 pt-4">
        {error && (
          <Alert variant="error" title="Ma'lumotni yuklab bo'lmadi" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Umumiy ro'yxat — bu yerdan ish olinadi */}
        <Link
          href="/courier/available"
          className="from-primary to-accent text-primary-foreground animate-fade-up flex items-center gap-4 rounded-2xl bg-gradient-to-br p-5 transition-transform active:scale-[0.99]"
        >
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <PackageSearch className="size-6" aria-hidden="true" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-xs opacity-90">Yangi ishlar</span>
            <span className="block text-2xl font-semibold tabular-nums">
              {isLoading ? '—' : `${stats?.availableDeliveries ?? 0} ta topshiriq`}
            </span>
          </span>

          <ChevronRight className="size-5 shrink-0 opacity-80" aria-hidden="true" />
        </Link>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard
            label="Bugungi daromad"
            value={isLoading ? '—' : formatTiyin(stats?.todayEarnings ?? 0)}
            hint={`${stats?.todayDeliveries ?? 0} ta yetkazish`}
            icon={Wallet}
            tone="success"
            isLoading={isLoading}
          />

          <StatCard
            label="Haftalik daromad"
            value={isLoading ? '—' : formatTiyin(stats?.weekEarnings ?? 0)}
            hint={`${stats?.weekDeliveries ?? 0} ta yetkazish`}
            icon={TrendingUp}
            isLoading={isLoading}
          />
        </div>

        {isFull && (
          <Alert variant="warning" className="mt-4">
            {`Qo'lingizda ${MAX_ACTIVE_DELIVERIES} ta topshiriq bor — chegara shu. Birortasini yakunlaganingizdan keyin yangisini olasiz.`}
          </Alert>
        )}

        {/* Qo'lidagi topshiriqlar */}
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">Qo&apos;limdagi topshiriqlar</h2>

          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          )}

          {!isLoading && active.length === 0 && (
            <div className="text-muted-foreground rounded-2xl border border-dashed p-6 text-center text-sm">
              <PackageCheck className="mx-auto mb-2 size-6" aria-hidden="true" />
              Hozir topshiriq yo&apos;q. &quot;Yangi ishlar&quot; dan birortasini oling.
            </div>
          )}

          <ul className="space-y-2">
            {active.map((delivery, index) => (
              <li key={delivery.id}>
                <DeliveryCard delivery={delivery} index={index} />
              </li>
            ))}
          </ul>
        </section>

        <p className="text-muted-foreground mt-6 flex items-start gap-2 text-xs leading-relaxed">
          <Wallet className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Yetkazish haqi buyurtmani mijozga topshirganingizdan keyin hamyoningizga avtomatik yoziladi.
        </p>
      </div>
    </>
  );
}
