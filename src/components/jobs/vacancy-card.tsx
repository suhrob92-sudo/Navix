'use client';

import { Briefcase, Check, MapPin } from 'lucide-react';
import Link from 'next/link';

import { ServiceIcon } from '@/components/app/service-icon';
import { FavoriteButton } from '@/components/favorite/favorite-button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeUz } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  formatSalary,
  type VacancyListItem,
} from '@/modules/job/job.types';

/**
 * Vakansiya kartochkasi — ro'yxatda va o'xshash e'lonlarda bir xil.
 *
 * ── Nima uchun MAOSH eng katta yozilgan ───────────────────────────────
 * Ish qidiruvchi e'lonlarni ko'zdan kechirganda birinchi qaraydigan
 * narsa — qancha to'lanadi. Lavozim nomi ikkinchi, kompaniya uchinchi.
 *
 * "Kelishilgan" ham katta yoziladi: bu ham javob, va uni yashirish
 * odamni e'lonni ochib, keyin ko'ngli qolishga majbur qilardi.
 */
export interface VacancyCardProps {
  vacancy: VacancyListItem;
  index?: number;
}

export function VacancyCard({ vacancy, index = 0 }: VacancyCardProps) {
  return (
    <Link
      href={`/jobs/v/${vacancy.slug}`}
      className="bg-card border-border animate-fade-up block rounded-2xl border p-4 transition-transform active:scale-[0.99]"
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      <div className="flex items-start gap-3">
        <ServiceIcon icon={Briefcase} color={vacancy.company.color} size="md" />

        <div className="min-w-0 flex-1">
          <p className="text-base leading-snug font-semibold text-balance">{vacancy.title}</p>
          <p className="text-muted-foreground mt-0.5 truncate text-sm">{vacancy.company.name}</p>
        </div>

        {vacancy.hasApplied && (
          <Badge variant="success" className="shrink-0 gap-1">
            <Check className="size-3" aria-hidden="true" />
            Yuborilgan
          </Badge>
        )}

        {/*
          Vakansiyada yurakcha ayniqsa kerak: odam e'lonni ko'radi,
          lekin rezyumesi tayyor bo'lmaydi va keyin uni topa
          olmaydi.
        */}
        <FavoriteButton target="VACANCY" targetId={vacancy.id} name={vacancy.title} />
      </div>

      {/* Maosh — eng muhim raqam */}
      <p className="mt-3 text-lg font-semibold tabular-nums">
        {formatSalary(vacancy.salaryMin, vacancy.salaryMax, formatTiyin)}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          {vacancy.city}
        </span>
        <span className="text-muted-foreground text-xs">{EMPLOYMENT_TYPE_LABELS[vacancy.employmentType]}</span>
        <span className="text-muted-foreground text-xs">{EXPERIENCE_LEVEL_LABELS[vacancy.experienceLevel]}</span>
      </div>

      <p className="text-muted-foreground border-border/60 mt-3 border-t pt-2.5 text-xs">
        {formatRelativeUz(vacancy.createdAt)}
      </p>
    </Link>
  );
}
