'use client';

import { ArrowRight, MapPin, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AiBanner } from '@/components/app/ai-banner';
import { AppHeader } from '@/components/app/app-header';
import { SearchBar } from '@/components/app/search-bar';
import { Section } from '@/components/app/section';
import { ServiceGrid } from '@/components/app/service-grid';
import { ServiceIcon } from '@/components/app/service-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { getModuleById } from '@/config/modules';
import { useApiQuery } from '@/hooks/use-api';
import { formatUZS } from '@/lib/utils';
import { useAuth } from '@/modules/auth/auth-context';

interface AddressesResponse {
  addresses: { id: string; label: string; isDefault: boolean }[];
}

/** Kunning vaqtiga qarab salomlashish. */
function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 6) return 'Xayrli tun';
  if (hour < 12) return 'Xayrli tong';
  if (hour < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

/**
 * Hozircha ko'rsatiladigan takliflar.
 *
 * Ular ataylab statik: aksiyalar moduli hali yozilmagan. Bo'sh joy qoldirish
 * o'rniga ilovaning kelajakdagi ko'rinishini ko'rsatamiz. Modul tayyor bo'lgach
 * shu ro'yxat API'dan keladi.
 */
const PROMOS = [
  {
    id: 'delivery',
    title: 'Bepul yetkazib berish',
    description: "50 000 so'mdan yuqori buyurtmalarga",
    moduleId: 'food',
  },
  {
    id: 'cashback',
    title: 'Cashback 10%',
    description: "Kommunal to'lovlardan qaytim",
    moduleId: 'payments',
  },
  {
    id: 'taxi',
    title: 'Birinchi safar chegirmasi',
    description: 'Taksi buyurtmangizga 30% chegirma',
    moduleId: 'taxi',
  },
] as const;

/** Ilovaning bosh sahifasi. */
export function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();

  const addresses = useApiQuery<AddressesResponse>('/api/v1/addresses');

  const displayName = user?.firstName ?? 'foydalanuvchi';
  const defaultAddress = addresses.data?.addresses.find((address) => address.isDefault);

  return (
    <>
      <AppHeader />

      <div className="space-y-6 px-4 pt-4">
        {/* Salomlashish */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {getGreeting()}, {displayName}!
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Bugun sizga qanday yordam bera olamiz?</p>
        </div>

        {/* Qidiruv — bosilganda qidiruv sahifasiga o'tadi */}
        <SearchBar
          readOnly
          placeholder="Xizmat yoki mahsulot qidiring..."
          onClick={() => router.push('/search')}
        />

        <AiBanner />

        {/* Tezkor xizmatlar */}
        <Section title="Tezkor xizmatlar">
          <ServiceGrid />
        </Section>

        {/* Hamyon va manzil — qisqacha holat */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/wallet"
            className="bg-card border-border block rounded-2xl border p-4 transition-transform active:scale-[0.98]"
          >
            <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400 inline-flex size-9 items-center justify-center rounded-lg">
              <Wallet className="size-4.5" aria-hidden="true" />
            </span>
            <p className="text-muted-foreground mt-3 text-xs">Hamyon balansi</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums">{formatUZS(0)}</p>
          </Link>

          <Link
            href="/addresses"
            className="bg-card border-border block rounded-2xl border p-4 transition-transform active:scale-[0.98]"
          >
            <span className="bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400 inline-flex size-9 items-center justify-center rounded-lg">
              <MapPin className="size-4.5" aria-hidden="true" />
            </span>
            <p className="text-muted-foreground mt-3 text-xs">Standart manzil</p>

            {addresses.isLoading ? (
              <Skeleton className="mt-1 h-5 w-20" />
            ) : (
              <p className="mt-0.5 truncate text-base font-semibold">
                {defaultAddress?.label ?? "Qo'shilmagan"}
              </p>
            )}
          </Link>
        </div>

        {/* Takliflar — gorizontal lenta */}
        <Section title="Siz uchun takliflar">
          {/* Chetlarga chiqarib, telefonda "cheksiz" lenta hissi beramiz */}
          <div className="scrollbar-slim -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
            {PROMOS.map((promo) => {
              const promoModule = getModuleById(promo.moduleId);

              return (
                <article
                  key={promo.id}
                  className="bg-card border-border w-60 shrink-0 snap-start rounded-2xl border p-4"
                >
                  {promoModule && <ServiceIcon icon={promoModule.icon} color={promoModule.color} size="sm" />}

                  <h3 className="mt-3 text-sm font-semibold">{promo.title}</h3>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{promo.description}</p>

                  <p className="text-muted-foreground mt-3 flex items-center gap-1 text-xs">
                    Tez orada
                    <ArrowRight className="size-3" aria-hidden="true" />
                  </p>
                </article>
              );
            })}
          </div>
        </Section>
      </div>
    </>
  );
}
