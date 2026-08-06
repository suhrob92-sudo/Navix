'use client';

import { Briefcase, Building2, ChevronRight, MapPin, Users } from 'lucide-react';
import Link from 'next/link';

import { AdminHeader } from '@/components/admin/admin-header';
import { StatCard } from '@/components/admin/stat-card';
import { ServiceIcon } from '@/components/app/service-icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import type { EmployerOverviewResponse } from '@/modules/employer/employer.types';

/**
 * Ish beruvchi kabineti — bosh sahifa.
 *
 * ── Eng katta raqam nima uchun "javob kutmoqda" ───────────────────────
 * Ish beruvchi uchun eng qimmat narsa — javobsiz qolgan nomzod. U bir
 * hafta kutadi, keyin boshqa ish topadi va kompaniya yaxshi
 * xodimdan ayriladi.
 *
 * Shuning uchun kabinetga kirganda birinchi ko'rinadigan narsa —
 * nechta odam javob kutayotgani, va u to'g'ridan-to'g'ri
 * nomzodlar ro'yxatiga olib boradi.
 */
export function EmployerDashboardContent() {
  /** Har 60 soniyada yangilanadi — yangi ariza o'zi paydo bo'lsin. */
  const { data, isLoading, error } = useApiQuery<EmployerOverviewResponse>('/api/v1/employer/companies', {
    refreshIntervalMs: 60_000,
  });

  const companies = data?.companies ?? [];
  const stats = data?.stats;

  return (
    <>
      <AdminHeader title="Ish beruvchi kabineti" />

      <div className="px-4 pt-4">
        {error && (
          <Alert variant="error" title="Ma'lumotni yuklab bo'lmadi" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Javob kutayotgan nomzodlar — eng muhimi */}
        <Link
          href="/employer/applications"
          className="from-primary to-accent text-primary-foreground animate-fade-up flex items-center gap-4 rounded-2xl bg-gradient-to-br p-5 transition-transform active:scale-[0.99]"
        >
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Users className="size-6" aria-hidden="true" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-xs opacity-90">Javob kutmoqda</span>
            <span className="block text-2xl font-semibold tabular-nums">
              {isLoading ? '—' : `${stats?.pendingApplications ?? 0} ta nomzod`}
            </span>
          </span>

          <ChevronRight className="size-5 shrink-0 opacity-80" aria-hidden="true" />
        </Link>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard
            label="Yangi arizalar"
            value={String(stats?.newApplications ?? 0)}
            hint="Hali ochilmagan"
            icon={Users}
            tone="success"
            isLoading={isLoading}
          />

          <StatCard
            label="Ochiq e'lonlar"
            value={String(stats?.activeVacancies ?? 0)}
            hint={`${stats?.companies ?? 0} ta kompaniya`}
            icon={Briefcase}
            isLoading={isLoading}
          />
        </div>

        {/* Kompaniyalar */}
        <h2 className="mt-6 mb-3 text-sm font-semibold">Kompaniyalarim</h2>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        )}

        {!isLoading && companies.length === 0 && (
          <EmptyState
            icon={Building2}
            title="Kompaniya biriktirilmagan"
            description="Kabinet ochilgan, lekin sizga hali kompaniya biriktirilmagan. Biz bilan bog'laning — kompaniyangizni qo'shib beramiz."
          />
        )}

        <ul className="space-y-2">
          {companies.map((company, index) => (
            <li
              key={company.id}
              className="bg-card border-border animate-fade-up rounded-2xl border p-4"
              style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
            >
              <div className="flex items-start gap-3">
                <ServiceIcon icon={Building2} color={company.color} size="md" />

                <div className="min-w-0 flex-1">
                  <p className="text-base leading-snug font-semibold text-balance">{company.name}</p>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs">
                    <MapPin className="size-3 shrink-0" aria-hidden="true" />
                    {`${company.industry} · ${company.city}`}
                  </p>
                </div>

                {!company.isActive && <Badge variant="secondary">Yopiq</Badge>}
              </div>

              <div className="border-border/60 mt-3 flex items-center gap-4 border-t pt-3">
                <span className="text-muted-foreground text-xs">
                  {`${company.activeVacancies} ta ochiq e'lon`}
                </span>

                {company.pendingApplications > 0 && (
                  <Badge variant="warning">{`${company.pendingApplications} ta javob kutmoqda`}</Badge>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <Button asChild variant="outline" size="sm" fullWidth>
                  <Link href={`/employer/vacancies?companyId=${company.id}`}>E&apos;lonlar</Link>
                </Button>
                <Button asChild variant="outline" size="sm" fullWidth>
                  <Link href={`/employer/applications?companyId=${company.id}`}>Nomzodlar</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
