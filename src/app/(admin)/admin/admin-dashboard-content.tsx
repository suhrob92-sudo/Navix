'use client';

import { AlertTriangle, ArrowUpRight, ChevronRight, Receipt, Users, Wallet, Wrench } from 'lucide-react';
import Link from 'next/link';

import { AdminHeader } from '@/components/admin/admin-header';
import { ProviderIcon } from '@/components/payments/provider-icon';
import { StatCard } from '@/components/admin/stat-card';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Permission } from '@/config/rbac';
import { useApiQuery } from '@/hooks/use-api';
import { formatTiyin } from '@/lib/money';
import type { AdminStats } from '@/modules/admin/admin.types';
import { RequireAdmin } from '@/modules/admin/require-admin';

/**
 * Admin panelning bosh sahifasi.
 *
 * Nima ko'rsatiladi va nima uchun aynan shular:
 *  - Foydalanuvchilar soni — o'sish sur'ati;
 *  - Hamyonlardagi umumiy qoldiq — bu bizning MAJBURIYATIMIZ, ya'ni
 *    foydalanuvchilar istalgan payt talab qilishi mumkin bo'lgan pul;
 *  - Bugungi to'lovlar — kunlik faollik;
 *  - Bugungi xatoliklar — muammo bo'lsa darhol ko'rinishi kerak.
 */
export function AdminDashboardContent() {
  return (
    <RequireAdmin permission={Permission.PLATFORM_ADMIN_ACCESS}>
      <DashboardBody />
    </RequireAdmin>
  );
}

function DashboardBody() {
  /**
   * Har 60 soniyada yangilanadi: admin panel ochiq turganda raqamlar
   * "tirik" bo'lishi kerak, lekin tez-tez so'rash bazani ortiqcha
   * yuklaydi (bu yerda 14 ta hisoblash so'rovi bor).
   */
  const { data, isLoading, error } = useApiQuery<AdminStats>('/api/v1/admin/stats', {
    refreshIntervalMs: 60_000,
  });

  return (
    <>
      <AdminHeader title="Admin panel" />

      <div className="px-4 pt-4">
        {error && (
          <Alert variant="error" title="Ko'rsatkichlarni yuklab bo'lmadi" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Moliyaviy holat — eng muhimi, shuning uchun eng yuqorida */}
        <div className="from-primary to-accent text-primary-foreground animate-fade-up rounded-2xl bg-gradient-to-br p-5">
          <p className="text-xs opacity-90">Hamyonlardagi umumiy qoldiq</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {isLoading ? '—' : formatTiyin(data?.wallet.totalBalance ?? 0)}
          </p>

          <div className="mt-4 flex items-center gap-4 text-xs">
            <span className="opacity-90">{data?.wallet.walletCount ?? 0} ta hamyon</span>
            <span className="inline-flex items-center gap-1 opacity-90">
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
              Bugun {isLoading ? '—' : formatTiyin(data?.wallet.topUpToday ?? 0)}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard
            label="Foydalanuvchilar"
            value={String(data?.users.total ?? 0)}
            hint={`Bugun +${data?.users.newToday ?? 0} · Haftada +${data?.users.newThisWeek ?? 0}`}
            icon={Users}
            isLoading={isLoading}
          />

          <StatCard
            label="Faol hisoblar"
            value={String(data?.users.active ?? 0)}
            hint={`${data?.users.suspended ?? 0} ta bloklangan`}
            icon={Users}
            tone="success"
            isLoading={isLoading}
          />

          <StatCard
            label="Bugungi to'lovlar"
            value={String(data?.payments.todayCount ?? 0)}
            hint={isLoading ? undefined : formatTiyin(data?.payments.todayVolume ?? 0)}
            icon={Receipt}
            isLoading={isLoading}
          />

          <StatCard
            label="Haftalik hajm"
            value={isLoading ? '—' : formatTiyin(data?.payments.weekVolume ?? 0)}
            hint={`Jami ${data?.payments.totalCount ?? 0} ta to'lov`}
            icon={Wallet}
            isLoading={isLoading}
          />
        </div>

        {/* Muammo bo'lsa — ko'zga tashlanishi kerak */}
        {!isLoading && (data?.payments.failedToday ?? 0) > 0 && (
          <Alert variant="warning" title="Bugun bajarilmagan to'lovlar bor" className="mt-4">
            {`${data?.payments.failedToday} ta to'lov muvaffaqiyatsiz tugadi.`} Xizmat sozlamalarini tekshiring —
            hisob raqami naqshi noto&apos;g&apos;ri bo&apos;lishi mumkin.
          </Alert>
        )}

        {/* Eng faol xizmatlar */}
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">Eng faol xizmatlar (7 kun)</h2>

          {isLoading && <div className="bg-secondary/50 h-24 animate-pulse rounded-2xl" />}

          {!isLoading && (data?.topProviders.length ?? 0) === 0 && (
            <p className="text-muted-foreground rounded-2xl border border-dashed p-6 text-center text-sm">
              Bu hafta hali to&apos;lov bo&apos;lmagan
            </p>
          )}

          <ul className="space-y-2">
            {(data?.topProviders ?? []).map((provider, index) => (
              <li
                key={provider.id}
                className="bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-3"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <ProviderIcon provider={provider} size="sm" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{provider.name}</p>
                  <p className="text-muted-foreground text-xs">{provider.count} ta to&apos;lov</p>
                </div>

                <p className="shrink-0 text-sm font-semibold tabular-nums">{formatTiyin(provider.volume)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Xizmatlar bo'limiga o'tish */}
        <Card variant="glass" padding="none" className="animate-fade-up mt-4">
          <Link href="/admin/providers" className="flex items-center gap-3 p-4">
            <span className="bg-secondary text-muted-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Wrench className="size-4.5" aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Xizmatlarni boshqarish</span>
              <span className="text-muted-foreground block text-xs">
                {`${data?.providers.active ?? 0} ta faol, jami ${data?.providers.total ?? 0} ta`}
              </span>
            </span>

            <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          </Link>
        </Card>

        {/* Eslatma: admin pulni qo'lda o'zgartira olmaydi */}
        <p className="text-muted-foreground mt-6 flex items-start gap-2 text-xs leading-relaxed">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Admin panel orqali balansni qo&apos;lda o&apos;zgartirib bo&apos;lmaydi. Har bir pul harakati faqat
          tranzaksiya orqali yoziladi — shunda hisobni doim tekshirish mumkin.
        </p>
      </div>
    </>
  );
}
