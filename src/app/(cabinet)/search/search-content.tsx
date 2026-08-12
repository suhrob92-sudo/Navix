'use client';

import { BadgeCheck, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { SearchBar } from '@/components/app/search-bar';
import { Section } from '@/components/app/section';
import { ServiceIcon } from '@/components/app/service-icon';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatUsername, type UserSearchResponse, type UserSearchResult } from '@/modules/profile/social.types';
import {
  getPublicModules,
  MODULE_CATEGORIES,
  ModuleStatus,
  type AppModule,
  type ModuleCategoryValue,
} from '@/config/modules';
import { cn } from '@/lib/utils';

/** Qidiruv maydoni bo'sh bo'lganda ko'rsatiladigan mashhur so'rovlar. */
const POPULAR_QUERIES = ['Taksi', 'Pizza', 'Kommunal', 'Ish', 'Mehmonxona', 'Kuryer', 'Chipta'] as const;

/**
 * Modul qidiruv so'roviga mos keladimi?
 *
 * Nom, tavsif va AI iboralari bo'yicha qidiriladi — shuning uchun
 * "ovqat" deb yozilganda "Ovqat yetkazish" ham, "pizza buyurtma qil"
 * iborasi orqali bog'langan modul ham topiladi.
 */
function matchesQuery(appModule: AppModule, query: string): boolean {
  const haystack = [appModule.name, appModule.description, ...appModule.aiIntents].join(' ').toLowerCase();

  return haystack.includes(query);
}

/** Qidiruv sahifasi. */
export function SearchContent() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ModuleCategoryValue | 'all'>('all');

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    return getPublicModules().filter((appModule) => {
      if (activeCategory !== 'all' && appModule.category !== activeCategory) return false;
      if (!normalizedQuery) return true;

      return matchesQuery(appModule, normalizedQuery);
    });
  }, [normalizedQuery, activeCategory]);

  const hasQuery = normalizedQuery.length > 0;

  /**
   * So'rov "@" bilan boshlansa — odam qidirilyapti.
   *
   * Bunda xizmatlar ko'rsatilmaydi: "@aziz" deb yozgan odam taksi yoki
   * pizza izlamayotgani aniq, ro'yxat esa bekorga uzayardi.
   */
  const isPeopleOnly = query.trim().startsWith('@');

  /**
   * Odamlar SERVERDAN qidiriladi.
   *
   * Xizmatlar ro'yxati kichik va ilova ichida turadi, shuning uchun u
   * brauzerda filtrlanadi. Foydalanuvchilar esa bazada — ularni
   * brauzerga yuklab bo'lmaydi.
   *
   * So'rov yozish to'xtagach yuboriladi (`useDebouncedValue`).
   */
  const debouncedQuery = useDebouncedValue(normalizedQuery, 350);

  const { data: peopleData, isLoading: isPeopleLoading } = useApiQuery<UserSearchResponse>(
    debouncedQuery.length > 0 ? `/api/v1/users/search?q=${encodeURIComponent(debouncedQuery)}&limit=12` : null,
  );

  /**
   * Natija ESKI so'rovga tegishli bo'lsa ko'rsatilmaydi.
   *
   * Yozish davom etayotganda oldingi natijalar ekranda qolib, odam
   * "nega mos kelmayapti" deb o'ylardi.
   */
  const isPeopleStale = debouncedQuery !== normalizedQuery;
  const people = isPeopleStale ? [] : (peopleData?.users ?? []);
  const isPeopleBusy = hasQuery && (isPeopleStale || isPeopleLoading);

  return (
    <>
      <AppHeader title="Qidiruv" />

      <div className="space-y-6 px-4 pt-4">
        <SearchBar value={query} onValueChange={setQuery} placeholder="Xizmat, mahsulot yoki odam..." autoFocus />

        {/* Guruh bo'yicha filtr — faqat xizmatlarga tegishli. */}
        {!isPeopleOnly && (
          <div className="scrollbar-slim -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <FilterChip
              label="Hammasi"
              isActive={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
            />

            {MODULE_CATEGORIES.map((category) => (
              <FilterChip
                key={category.id}
                label={category.name}
                isActive={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
              />
            ))}
          </div>
        )}

        {/*
          Odamlar XIZMATLARDAN oldin.

          Odam nomini yozganda u aynan odamni qidirayotgan bo'ladi.
          Xizmatlar pastda qolsa ham yo'qolmaydi, lekin izlagan narsa
          birinchi ko'rinadi.
        */}
        {hasQuery && (
          <Section title="Odamlar">
            {isPeopleBusy ? (
              <ul className="space-y-2.5" aria-label="Yuklanmoqda">
                {[0, 1, 2].map((row) => (
                  <li key={row} className="bg-card border-border flex items-center gap-3 rounded-2xl border p-3">
                    <Skeleton className="size-11 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : people.length === 0 ? (
              <p className="text-muted-foreground py-2 text-sm leading-relaxed">
                Bunday foydalanuvchi topilmadi. Ism yoki @nom bilan qidirib ko&apos;ring.
              </p>
            ) : (
              <ul className="space-y-2.5" aria-label="Foydalanuvchilar">
                {people.map((person) => (
                  <li key={person.id}>
                    <PersonRow person={person} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {/* So'rov bo'sh — mashhur so'rovlarni taklif qilamiz */}
        {!hasQuery && (
          <Section title="Mashhur qidiruvlar">
            <div className="flex flex-wrap gap-2">
              {POPULAR_QUERIES.map((popular) => (
                <button
                  key={popular}
                  type="button"
                  onClick={() => setQuery(popular)}
                  className="bg-card border-border hover:border-ring rounded-full border px-3.5 py-2 text-sm font-medium transition-colors"
                >
                  {popular}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Xizmatlar */}
        {!isPeopleOnly && (
          <Section title={hasQuery ? `Xizmatlar (${results.length})` : 'Barcha xizmatlar'}>
            {results.length === 0 ? (
              /*
                Katta "topilmadi" bloki FAQAT hech narsa topilmaganda.

                Odam topilgan bo'lsa, u ekranning yarmini egallab,
                topilgan natijani pastga surib yuborardi — go'yo qidiruv
                umuman ishlamagandek.
              */
              people.length > 0 ? (
                <p className="text-muted-foreground py-2 text-sm leading-relaxed">
                  Bu so&apos;rov bo&apos;yicha xizmat yo&apos;q.
                </p>
              ) : (
                <EmptyState
                  icon={SearchX}
                  title="Hech narsa topilmadi"
                  description={`"${query}" bo'yicha xizmat yo'q. Boshqacha yozib ko'ring yoki guruhni o'zgartiring.`}
                />
              )
            ) : (
              <ul className="space-y-2.5">
                {results.map((appModule) => (
                  <li key={appModule.id}>
                    <ResultRow appModule={appModule} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}
      </div>
    </>
  );
}

/**
 * Qidiruv natijasidagi bitta odam.
 *
 * Butun qator bosiladi — telefon ekranida kichik havolani barmoq bilan
 * aniq bosish qiyin.
 */
function PersonRow({ person }: { person: UserSearchResult }) {
  return (
    <Link
      href={`/u/${person.username}`}
      className="bg-card border-border flex items-center gap-3 rounded-2xl border p-3 transition-transform active:scale-[0.99]"
    >
      <Avatar src={person.avatarUrl} name={person.fullName ?? person.username} size="md" />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-sm font-semibold">
          <span className="truncate">{person.fullName ?? formatUsername(person.username)}</span>
          {person.isVerified && (
            <BadgeCheck className="text-primary size-3.5 shrink-0" aria-label="Tasdiqlangan" />
          )}
        </p>
        <p className="text-muted-foreground truncate text-xs">{formatUsername(person.username)}</p>
      </div>

      {/*
        "Obunasiz" deb yozilmaydi: o'zbekchada u ham "obuna bo'lgansiz",
        ham "obunasiz emas" deb tushunilishi mumkin. Qisqa "Obuna" esa
        bir ma'noli.
      */}
      {person.isFollowing && (
        <Badge variant="outline" className="shrink-0">
          Obuna
        </Badge>
      )}
    </Link>
  );
}

function FilterChip({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'bg-card border-border text-muted-foreground hover:text-foreground border',
      )}
    >
      {label}
    </button>
  );
}

function ResultRow({ appModule }: { appModule: AppModule }) {
  const isAvailable = appModule.status === ModuleStatus.LIVE;

  const content = (
    <div className="bg-card border-border flex items-center gap-3 rounded-2xl border p-3">
      <ServiceIcon icon={appModule.icon} color={appModule.color} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{appModule.name}</p>
        <p className="text-muted-foreground truncate text-xs">{appModule.description}</p>
      </div>

      {!isAvailable && (
        <Badge variant="outline" className="shrink-0">
          Rejada
        </Badge>
      )}
    </div>
  );

  if (!isAvailable) return content;

  return (
    <Link href={appModule.href} className="block rounded-2xl transition-transform active:scale-[0.99]">
      {content}
    </Link>
  );
}
