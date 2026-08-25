'use client';

import { Briefcase, Building2, MapPin } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app/app-header';
import { ServiceIcon } from '@/components/app/service-icon';
import { CatalogGallery } from '@/components/catalog/catalog-gallery';
import { VacancyCard } from '@/components/jobs/vacancy-card';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import type { CompanyResponse } from '@/modules/job/job.types';

/**
 * Kompaniya sahifasi.
 *
 * ── Nima uchun bu sahifa kerak ────────────────────────────────────────
 * Vakansiyani ochgan odamning ikkinchi savoli — "bu qanaqa
 * kompaniya?". Ilgari javob yo'q edi: nom bor edi, lekin ustiga
 * bosib bo'lmasdi.
 *
 * Ishini tashlab o'tmoqchi bo'lgan odam kompaniya haqida bilmasa,
 * ariza umuman yubormaydi.
 *
 * ── Nima uchun VAKANSIYALAR asosiy joyni egallaydi ────────────────────
 * Kompaniya tavsifi — bir necha jumla va u odatda umumiy so'zlardan
 * iborat. Odamning haqiqiy savoli boshqacha: "yana qanday ish
 * bor?".
 *
 * Bir kompaniyada bir necha mos e'lon bo'lishi tez-tez uchraydi va
 * ular ro'yxatning turli joylarida yo'qolib ketgan bo'ladi.
 */

export interface CompanyContentProps {
  slug: string;
}

export function CompanyContent({ slug }: CompanyContentProps) {
  const { data, isLoading, error } = useApiQuery<CompanyResponse>(`/api/v1/jobs/companies/${slug}`);

  const company = data?.company ?? null;
  const vacancies = data?.vacancies ?? [];

  return (
    <>
      <AppHeader title={company?.name ?? 'Kompaniya'} showBack />

      <div className="space-y-4 px-4 pt-4">
        {isLoading && (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Kompaniyani yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {company && (
          <>
            {/*
              Rasm faqat BOR bo'lsa chiziladi: bo'sh galereya
              o'rin egallab, hech narsa bermasdi.
            */}
            {company.images.length > 0 && (
              <CatalogGallery
                images={company.images}
                name={company.name}
                enableFullscreen
                className="animate-fade-up"
              />
            )}

            <section className="bg-card border-border animate-fade-up rounded-2xl border p-4">
              <div className="flex items-start gap-3">
                <ServiceIcon icon={Building2} color={company.color} size="md" />

                <div className="min-w-0 flex-1">
                  <h1 className="text-lg leading-snug font-semibold text-balance">{company.name}</h1>

                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                    <MapPin className="size-3 shrink-0" aria-hidden="true" />
                    {company.city}
                  </p>
                </div>

                <Badge variant="secondary" className="shrink-0">
                  {company.industry}
                </Badge>
              </div>

              <p className="mt-3 text-sm leading-relaxed">{company.description}</p>

              <p className="text-muted-foreground border-border/60 mt-3 flex items-center gap-1.5 border-t pt-3 text-xs">
                <Briefcase className="size-3.5 shrink-0" aria-hidden="true" />
                {company.vacancyCount === 0
                  ? "Hozircha ochiq vakansiya yo'q"
                  : `${company.vacancyCount} ta ochiq vakansiya`}
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold">Ochiq vakansiyalar</h2>

              {vacancies.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="Vakansiya yo'q"
                  description="Bu kompaniya hozircha e'lon joylamagan. Keyinroq qarab ko'ring."
                />
              ) : (
                <ul className="space-y-2">
                  {vacancies.map((vacancy, index) => (
                    <li key={vacancy.id}>
                      <VacancyCard vacancy={vacancy} index={index} />
                    </li>
                  ))}
                </ul>
              )}

              {/*
                ── Nima uchun "hammasini ko'rish" havolasi ────────────
                Sahifada eng ko'pi 20 ta e'lon ko'rsatiladi. Katta
                kompaniyada undan ko'p bo'lsa, qolganini FILTR bilan
                ko'rish qulayroq — u yerda shahar va maosh bo'yicha
                saralash bor.
              */}
              {company.vacancyCount > vacancies.length && (
                <Button variant="outline" fullWidth className="mt-3" asChild>
                  <Link href={`/jobs?company=${company.slug}`}>
                    {`Barcha ${company.vacancyCount} ta vakansiyani ko'rish`}
                  </Link>
                </Button>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
