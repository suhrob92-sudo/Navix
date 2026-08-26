'use client';

import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { SearchBar } from '@/components/app/search-bar';
import { Section } from '@/components/app/section';
import { ServiceIcon } from '@/components/app/service-icon';
import { SearchGroupSection, SearchGroupSkeleton } from '@/components/search/search-group';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useApiQuery } from '@/hooks/use-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { MIN_QUERY_LENGTH, isPeopleQuery } from '@/config/search-groups';
import type { UnifiedSearchResponse } from '@/modules/search/search.types';
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
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  /*
    ── So'rov MANZILDA saqlanadi ───────────────────────────────────────
    Uni oddiy holatda saqlash mumkin edi, lekin o'shanda:
      · natijani do'stga yuborib bo'lmasdi;
      · bo'limdan qaytgan odam so'rovini yo'qotardi;
      · "Hammasi" havolasidan qaytish ham ishlamasdi.
  */
  const [query, setQuery] = useState(() => params.get('q') ?? '');
  const [activeCategory, setActiveCategory] = useState<ModuleCategoryValue | 'all'>('all');

  const normalizedQuery = query.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;

  /*
    Manzil yozish KECHIKTIRILADI: har harfda `replace` chaqirilsa,
    brauzer tarixi bilan ishlash sezilarli sekinlashadi.
  */
  const debouncedQuery = useDebouncedValue(query.trim(), 350);

  const writeUrl = useCallback(
    (value: string) => {
      router.replace(value ? `${pathname}?q=${encodeURIComponent(value)}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  /*
    Manzil BRAUZER TARIXIGA yoziladi — bu React holati emas, tashqi
    tizim. Shuning uchun u effektda yangilanadi va `replace`
    ishlatiladi: har harf uchun yangi tarix yozuvi qo'shilsa,
    "orqaga" tugmasi ishlamay qolardi.
  */
  useEffect(() => {
    writeUrl(debouncedQuery);
  }, [debouncedQuery, writeUrl]);

  const results = useMemo(() => {
    return getPublicModules().filter((appModule) => {
      if (activeCategory !== 'all' && appModule.category !== activeCategory) return false;
      if (!normalizedQuery) return true;

      return matchesQuery(appModule, normalizedQuery);
    });
  }, [normalizedQuery, activeCategory]);

  /**
   * So'rov "@" bilan boshlansa — odam qidirilyapti.
   *
   * Bunda xizmatlar ko'rsatilmaydi: "@aziz" deb yozgan odam taksi
   * yoki pizza izlamayotgani aniq, ro'yxat esa bekorga uzayardi.
   */
  const isPeopleOnly = isPeopleQuery(query);

  /**
   * ── Yagona qidiruv ────────────────────────────────────────────────
   * Bitta so'rov oltita katalogni ham qamrab oladi. Ilgari bu yerda
   * FAQAT odamlar so'ralardi va qolgan hammasi — mahsulot, taom,
   * mehmonxona, vakansiya, xabar — o'z sahifasida yashiringan edi.
   *
   * Xizmatlar (modullar) esa BRAUZERDA filtrlanadi: ularning
   * ro'yxati kichik va ilova ichida turadi, ya'ni so'rov ortiqcha
   * bo'lardi.
   */
  const { data, isLoading } = useApiQuery<UnifiedSearchResponse>(
    debouncedQuery.length >= MIN_QUERY_LENGTH
      ? `/api/v1/search?q=${encodeURIComponent(debouncedQuery)}`
      : null,
  );

  /**
   * Natija ESKI so'rovga tegishli bo'lsa ko'rsatilmaydi.
   *
   * Yozish davom etayotganda oldingi natijalar ekranda qolib, odam
   * "nega mos kelmayapti" deb o'ylardi.
   */
  const isStale = debouncedQuery !== query.trim();
  const groups = isStale ? [] : (data?.groups ?? []);
  const isBusy = hasQuery && normalizedQuery.length >= MIN_QUERY_LENGTH && (isStale || isLoading);

  /* Hech narsa topilmadimi — xizmatlar ham, katalog ham. */
  const isEmpty = hasQuery && !isBusy && groups.length === 0 && results.length === 0;

  return (
    <>
      <AppHeader title="Qidiruv" />

      <div className="space-y-6 px-4 pt-4">
        <SearchBar value={query} onValueChange={setQuery} placeholder="Taom, mahsulot, mehmonxona, ish, odam..." autoFocus />

        {/*
          ── Katalog natijalari XIZMATLARDAN oldin ─────────────────
          Odam "plov" deb yozganda taomni kutadi, "Ovqat yetkazish"
          degan bo'lim nomini emas. Xizmatlar pastda qolsa ham
          yo'qolmaydi.
        */}
        {isBusy && (
          <section>
            <h2 className="text-muted-foreground mb-2 text-sm">Qidirilmoqda...</h2>
            <SearchGroupSkeleton />
          </section>
        )}

        {!isBusy &&
          groups.map((group) => (
            <SearchGroupSection key={group.key} group={group} query={query.trim()} />
          ))}

        {/*
          ── Juda qisqa so'rov ────────────────────────────────────
          Sabab aytiladi. Jim qolish "hech narsa topilmadi" degan
          yolg'on taassurot berardi — aslida qidiruv umuman
          boshlanmagan.
        */}
        {hasQuery && normalizedQuery.length < MIN_QUERY_LENGTH && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {`Qidirish uchun kamida ${MIN_QUERY_LENGTH} ta harf yozing.`}
          </p>
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
                  className="bg-card border-border hover:border-ring inline-flex min-h-11 items-center rounded-full border px-3.5 py-2 text-sm font-medium transition-colors"
                >
                  {popular}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/*
          ── HAQIQIY XATO: filtr chiziqlari YUQORIDA turardi ────────
          Bu chiziqlar FAQAT xizmatlarni filtrlaydi. Ilgari xizmatlar
          sahifaning asosiy mazmuni edi va chiziqlar tepada mantiqli
          turardi.

          Yagona qidiruv qo'shilgach esa xizmatlar eng pastga tushdi,
          chiziqlar esa tepada qoldi — ular go'yo BUTUN natijani
          filtrlayotgandek ko'rinardi. "Savdo" ni bosgan odam taomlar
          yo'qolishini kutardi, lekin hech narsa o'zgarmasdi.

          Ekranda ko'rilganda aniqlandi. Endi ular o'z bo'limi
          yonida turadi.
        */}
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
              /*
                Katta "topilmadi" bloki FAQAT hamma joyda bo'sh
                bo'lganda. Katalogdan nimadir topilgan bo'lsa, u
                ekranning yarmini egallab, topilgan natijani pastga
                surib yuborardi.
              */
              isEmpty ? (
                <EmptyState
                  icon={SearchX}
                  title="Hech narsa topilmadi"
                  description={`"${query}" bo'yicha natija yo'q. Boshqacha yozib ko'ring.`}
                />
              ) : (
                <p className="text-muted-foreground py-2 text-sm leading-relaxed">
                  Bu so&apos;rov bo&apos;yicha xizmat yo&apos;q.
                </p>
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

function FilterChip({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors',
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
