'use client';

import { BadgeCheck, Eye, Handshake, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { CollabOfferDialog } from '@/components/collab/collab-offer-dialog';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatCompactCount } from '@/modules/feed/feed.types';
import type { CreatorCardView, CreatorsResponse } from '@/modules/collab/collab.types';

/**
 * Ijodkorlar katalogi — biznes uchun.
 *
 * ── Nima uchun alohida sahifa, umumiy qidiruv emas ────────────────────
 * Umumiy odam qidiruvi hamma foydalanuvchini qaytaradi va biznes
 * ular orasidan hamkorlikka ochiqlarini ajrata olmasdi: har biriga
 * kirib, profilini o'qib chiqishga to'g'ri kelardi.
 *
 * Bu yerda savol aniq: "kimga taklif yozsam bo'ladi?" — va ro'yxatda
 * FAQAT javob beradiganlar turadi.
 *
 * ── Nima uchun KO'RISHLAR bo'yicha tartiblangan ───────────────────────
 * Obunachilar soni bir marta yig'ilib, keyin o'zgarmasligi mumkin.
 * Ko'rishlar esa ijodkor HOZIR ishlayaptimi degan savolga javob
 * beradi — o'lik hisobga reklama berishning ma'nosi yo'q.
 */
export function CreatorsContent() {
  const [term, setTerm] = useState('');
  const query = useDebouncedValue(term.trim(), 300);

  /** Kimga taklif yozilyapti — `null` bo'lsa oyna yopiq. */
  const [target, setTarget] = useState<CreatorCardView | null>(null);

  const { data, isLoading, error } = useApiQuery<CreatorsResponse>(
    `/api/v1/creators${query.length >= 2 ? `?q=${encodeURIComponent(query)}` : ''}`,
  );

  const creators = data?.creators ?? [];

  return (
    <>
      <AppHeader title="Ijodkorlar" showBack backHref="/feed/profile" />

      <div className="pb-tabbar space-y-4 px-4 pt-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Hamkorlikka ochiq blogerlar. Taklif yuboring — u ijodkorning qutisida javob kutib turadi.
        </p>

        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Ism yoki foydalanuvchi nomi"
            aria-label="Ijodkor qidirish"
            className="pl-9"
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && !error && creators.length === 0 && (
          <EmptyState
            icon={Handshake}
            title={query.length >= 2 ? 'Hech kim topilmadi' : "Hozircha ijodkor yo'q"}
            description={
              query.length >= 2
                ? "Boshqa nom bilan qidirib ko'ring."
                : "Ijodkorlar profilida «Hamkorlikka ochiqman» ni belgilagach shu yerda paydo bo'ladi."
            }
          />
        )}

        <div className="space-y-2">
          {creators.map((creator) => (
            <article
              key={creator.username}
              className="bg-card border-border flex items-start gap-3 rounded-2xl border p-3"
            >
              <Link href={`/u/${creator.username}`} className="shrink-0">
                <Avatar src={creator.avatarUrl} name={creator.fullName} size="md" />
              </Link>

              <div className="min-w-0 flex-1">
                <Link href={`/u/${creator.username}`} className="flex items-baseline gap-1.5">
                  <span className="truncate text-sm font-semibold hover:underline">
                    {creator.fullName ?? `@${creator.username}`}
                  </span>

                  {creator.isVerified && (
                    <BadgeCheck className="text-primary size-4 shrink-0" aria-label="Tasdiqlangan profil" />
                  )}
                </Link>

                {/*
                  Shartlar ro'yxatda KO'RSATILADI.

                  Usiz biznes har bir ijodkorning profiliga kirib
                  chiqishga majbur bo'lardi — o'ttizta ijodkor
                  degani o'ttizta sahifa.
                */}
                {creator.collabNote && (
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-relaxed">
                    {creator.collabNote}
                  </p>
                )}

                <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="tabular-nums">{formatCompactCount(creator.followerCount)}</span>
                  </span>

                  <span className="flex items-center gap-1">
                    <Eye className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="tabular-nums">{formatCompactCount(creator.videoViewCount)}</span>
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setTarget(creator)}
              >
                Taklif
              </Button>
            </article>
          ))}
        </div>
      </div>

      {target && (
        <CollabOfferDialog
          username={target.username}
          name={target.fullName ?? `@${target.username}`}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}
