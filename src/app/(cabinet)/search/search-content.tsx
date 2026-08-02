'use client';

import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { SearchBar } from '@/components/app/search-bar';
import { Section } from '@/components/app/section';
import { ServiceIcon } from '@/components/app/service-icon';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  APP_MODULES,
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
    return APP_MODULES.filter((appModule) => {
      if (activeCategory !== 'all' && appModule.category !== activeCategory) return false;
      if (!normalizedQuery) return true;

      return matchesQuery(appModule, normalizedQuery);
    });
  }, [normalizedQuery, activeCategory]);

  const hasQuery = normalizedQuery.length > 0;

  return (
    <>
      <AppHeader title="Qidiruv" />

      <div className="space-y-6 px-4 pt-4">
        <SearchBar
          value={query}
          onValueChange={setQuery}
          placeholder="Xizmat yoki mahsulot qidiring..."
          autoFocus
        />

        {/* Guruh bo'yicha filtr */}
        <div className="scrollbar-slim -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <FilterChip label="Hammasi" isActive={activeCategory === 'all'} onClick={() => setActiveCategory('all')} />

          {MODULE_CATEGORIES.map((category) => (
            <FilterChip
              key={category.id}
              label={category.name}
              isActive={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
            />
          ))}
        </div>

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

        {/* Natijalar */}
        <Section title={hasQuery ? `Natijalar (${results.length})` : 'Barcha xizmatlar'}>
          {results.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Hech narsa topilmadi"
              description={`"${query}" bo'yicha xizmat yo'q. Boshqacha yozib ko'ring yoki guruhni o'zgartiring.`}
            />
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
      </div>
    </>
  );
}

function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
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
