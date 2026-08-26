/* eslint-disable @next/next/no-img-element */
'use client';

import {
  Briefcase,
  Building2,
  MessageSquare,
  Package,
  UtensilsCrossed,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import { SEARCH_GROUPS, groupSearchPath, type SearchGroupKey } from '@/config/search-groups';
import { cn } from '@/lib/utils';
import type { SearchGroupResult } from '@/modules/search/search.types';

/**
 * Qidiruvdagi bitta bo'lim.
 *
 * ── Nima uchun bo'limlar BIR XIL ko'rinishda ──────────────────────────
 * Mahsulot, taom va odam butunlay boshqa narsalar va har biriga
 * o'z kartochkasini yasash mumkin edi.
 *
 * Lekin qidiruv natijasida odam TEZ ko'z yugurtiradi. Har bo'lim
 * boshqacha ko'rinsa, ko'z har safar qaytadan moslashishi kerak
 * bo'ladi va varaqlash sekinlashadi.
 *
 * Bir xil qator esa ko'zga "bitta ro'yxat" bo'lib ko'rinadi —
 * sarlavhalar uni bo'limlarga ajratib turadi.
 */

/**
 * Ikonkalar — nomdan komponentga.
 *
 * ── Nima uchun sozlamada ikonka NOMI saqlanadi ────────────────────────
 * `src/config/search-groups.ts` serverda ham ishlatiladi va u yerga
 * React komponentini import qilib bo'lmaydi.
 *
 * Nom esa oddiy matn: sozlama toza qoladi, moslik shu yerda
 * beriladi.
 */
const ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Package,
  Building2,
  Briefcase,
  Users,
  MessageSquare,
};

export interface SearchGroupSectionProps {
  group: SearchGroupResult;
  /** Foydalanuvchi yozgan so'rov — "hammasini ko'rish" havolasi uchun. */
  query: string;
  className?: string;
}

export function SearchGroupSection({ group, query, className }: SearchGroupSectionProps) {
  const meta = SEARCH_GROUPS.find((item) => item.key === group.key);

  if (!meta) return null;

  const Icon = ICONS[meta.icon] ?? Package;

  /*
    "Hammasini ko'rish" faqat chegaraga YETGANDA ko'rsatiladi:
    ikkita natija bo'lsa, havola foydasiz va ekranni to'ldirardi.
  */
  const hasMore = group.total > group.hits.length;

  return (
    <section className={className}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          {meta.label}
        </h2>

        {hasMore && (
          <Link
            href={groupSearchPath(group.key, query)}
            className="text-primary shrink-0 text-xs font-medium"
          >
            Hammasi
          </Link>
        )}
      </div>

      <ul className="space-y-1.5">
        {group.hits.map((hit) => (
          <li key={hit.id}>
            <Link
              href={hit.href}
              className="bg-card border-border flex items-center gap-3 rounded-2xl border p-3 transition-transform active:scale-[0.99]"
            >
              {/*
                Rasm bo'lmasa — bo'sh kvadrat EMAS, ikonka.

                Bo'sh joy "rasm yuklanmadi" degandek ko'rinardi.
                Ikonka esa nima turi ekanini aytadi.
              */}
              {hit.imageUrl ? (
                <img
                  src={hit.imageUrl}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  className={cn(
                    'bg-secondary size-11 shrink-0 object-cover',
                    /* Odamning surati DOIRA — hamma joyda shunday. */
                    group.key === 'USER' ? 'rounded-full' : 'rounded-xl',
                  )}
                />
              ) : (
                <span className="bg-secondary text-muted-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{hit.title}</span>

                {hit.subtitle && (
                  <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                    {hit.subtitle}
                  </span>
                )}
              </span>

              {hit.meta && (
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{hit.meta}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Yuklanish paytidagi o'rin egallovchi. */
export function SearchGroupSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="space-y-1.5" aria-label="Yuklanmoqda">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="bg-card border-border flex items-center gap-3 rounded-2xl border p-3">
          <span className="bg-secondary size-11 shrink-0 animate-pulse rounded-xl" />
          <span className="min-w-0 flex-1 space-y-1.5">
            <span className="bg-secondary block h-3.5 w-32 animate-pulse rounded" />
            <span className="bg-secondary block h-3 w-20 animate-pulse rounded" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export type { SearchGroupKey };
