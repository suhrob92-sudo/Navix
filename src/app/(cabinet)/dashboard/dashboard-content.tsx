'use client';

import { ArrowRight, Bell, MapPin, Wallet } from 'lucide-react';
import Link from 'next/link';

import { ModuleCard } from '@/components/shared/module-card';
import { PageHeader } from '@/components/shared/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_MODULES, MODULE_CATEGORIES, getModulesByCategory } from '@/config/modules';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzPhone } from '@/lib/phone';
import { formatUZS } from '@/lib/utils';
import { useAuth } from '@/modules/auth/auth-context';

interface AddressesResponse {
  addresses: { id: string; label: string; isDefault: boolean }[];
}

interface NotificationsResponse {
  unreadCount: number;
}

/** Kunning vaqtiga qarab salomlashish. */
function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 6) return 'Xayrli tun';
  if (hour < 12) return 'Xayrli tong';
  if (hour < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

/** Kabinetning bosh sahifasi. */
export function DashboardContent() {
  const { user } = useAuth();

  const addresses = useApiQuery<AddressesResponse>('/api/v1/addresses');
  const notifications = useApiQuery<NotificationsResponse>('/api/v1/notifications?pageSize=1');

  const displayName = user?.firstName ?? 'foydalanuvchi';
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || null;

  return (
    <>
      <PageHeader
        title={`${getGreeting()}, ${displayName}!`}
        description="Bugun sizga qanday yordam bera olamiz?"
      />

      {/* Qisqacha ma'lumot kartochkalari */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card variant="glass" padding="sm" className="animate-fade-up">
          <div className="flex items-center gap-3">
            <Avatar src={user?.avatarUrl} name={fullName ?? user?.phone} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{fullName ?? 'Ism kiritilmagan'}</p>
              <p className="text-muted-foreground truncate text-xs">
                {user?.phone ? formatUzPhone(user.phone) : ''}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="mt-3 -ml-3" asChild>
            <Link href="/profile">
              Profilni tahrirlash
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </Card>

        <StatCard
          icon={<MapPin className="size-4" aria-hidden="true" />}
          label="Saqlangan manzillar"
          value={addresses.isLoading ? null : String(addresses.data?.addresses.length ?? 0)}
          href="/addresses"
          linkLabel="Manzillarim"
          delay={90}
        />

        <StatCard
          icon={<Bell className="size-4" aria-hidden="true" />}
          label="O'qilmagan xabarlar"
          value={notifications.isLoading ? null : String(notifications.data?.unreadCount ?? 0)}
          href="/notifications"
          linkLabel="Bildirishnomalar"
          delay={180}
        />
      </div>

      {/* Hamyon — hozircha faqat ko'rinish, moduli keyingi bosqichda */}
      <Card variant="glass" className="animate-fade-up mt-4" style={{ animationDelay: '270ms' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="from-primary/15 to-accent/15 text-primary ring-primary/10 inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ring-1">
              <Wallet className="size-5" aria-hidden="true" />
            </span>
            <div>
              <CardDescription>Hamyon balansi</CardDescription>
              <CardTitle className="mt-0.5 text-xl tabular-nums">{formatUZS(0)}</CardTitle>
            </div>
          </div>

          <p className="text-muted-foreground text-xs">Hamyon moduli keyingi bosqichda ishga tushadi</p>
        </div>
      </Card>

      {/* Xizmatlar */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Xizmatlar</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {APP_MODULES.length} ta modul rejalashtirilgan, ular bosqichma-bosqich ishga tushiriladi.
        </p>

        <div className="mt-6 space-y-8">
          {MODULE_CATEGORIES.map((category) => {
            const modules = getModulesByCategory(category.id);
            if (modules.length === 0) return null;

            return (
              <div key={category.id}>
                <h3 className="mb-3 text-sm font-semibold">{category.name}</h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {modules.map((appModule, index) => (
                    <ModuleCard key={appModule.id} module={appModule} index={index} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  /** `null` — hali yuklanmoqda. */
  value: string | null;
  href: string;
  linkLabel: string;
  delay: number;
}

function StatCard({ icon, label, value, href, linkLabel, delay }: StatCardProps) {
  return (
    <Card variant="glass" padding="sm" className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-3">
        <span className="bg-secondary text-muted-foreground inline-flex size-11 items-center justify-center rounded-xl">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">{label}</p>
          {value === null ? (
            <Skeleton className="mt-1 h-6 w-8" />
          ) : (
            <p className="text-xl font-semibold tabular-nums">{value}</p>
          )}
        </div>
      </div>

      <Button variant="ghost" size="sm" className="mt-3 -ml-3" asChild>
        <Link href={href}>
          {linkLabel}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </Card>
  );
}
