'use client';

import { Store, UtensilsCrossed, Hotel, Ban, Check } from 'lucide-react';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { FilterChip } from '@/components/admin/filter-chip';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Permission } from '@/config/rbac';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { RequireAdmin } from '@/modules/admin/require-admin';
import type { AdminBusinessItem, BusinessKind } from '@/modules/admin/business.service';

interface BusinessesResponse {
  businesses: AdminBusinessItem[];
}

const KIND_TABS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'SHOP', label: "Do'konlar" },
  { value: 'RESTAURANT', label: 'Restoranlar' },
  { value: 'HOTEL', label: 'Mehmonxonalar' },
] as const;

const STATUS_TABS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'ACTIVE', label: 'Ochiq' },
  { value: 'INACTIVE', label: 'Yopiq' },
] as const;

const KIND_ICONS: Record<BusinessKind, typeof Store> = {
  SHOP: Store,
  RESTAURANT: UtensilsCrossed,
  HOTEL: Hotel,
};

const KIND_LABELS: Record<BusinessKind, string> = {
  SHOP: "Do'kon",
  RESTAURANT: 'Restoran',
  HOTEL: 'Mehmonxona',
};

/**
 * Do'kon, restoran va mehmonxonalarni boshqarish.
 *
 * ── Nima uchun O'CHIRISH tugmasi yo'q ─────────────────────────────────
 * Biznesni bazadan o'chirib bo'lmaydi: unga bog'langan buyurtmalar,
 * to'lovlar va sharhlar bor. O'chirilsa, mijozning buyurtmalar tarixi
 * buzilardi va buxgalteriya yozuvlari yo'qolardi.
 *
 * Shuning uchun bu yerda faqat YOPISH bor: yopilgan biznes ro'yxatda
 * ko'rinmaydi, qidiruvda topilmaydi va unga yangi buyurtma berib
 * bo'lmaydi — amalda o'chirilgan bilan bir xil, lekin tarix saqlanadi.
 */
export function AdminBusinessesContent() {
  return (
    <RequireAdmin permission={Permission.PLATFORM_BUSINESS_MANAGE}>
      <BusinessesBody />
    </RequireAdmin>
  );
}

function BusinessesBody() {
  const request = useApiClient();

  const [kind, setKind] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const query = new URLSearchParams({ kind, status });
  if (search.trim()) query.set('search', search.trim());

  const { data, isLoading, error, reload } = useApiQuery<BusinessesResponse>(
    `/api/v1/admin/businesses?${query.toString()}`,
  );

  const [closingId, setClosingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const businesses = data?.businesses ?? [];

  async function apply(item: AdminBusinessItem, isActive: boolean, why?: string) {
    setBusyId(item.id);
    setActionError(null);

    try {
      await request(`/api/v1/admin/businesses/${item.kind}/${item.id}`, {
        method: 'PATCH',
        body: { isActive, ...(why ? { reason: why } : {}) },
      });

      setClosingId(null);
      setReason('');
      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AdminHeader title="Bizneslar" showBack backHref="/admin" />

      <div className="px-4 pt-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nomi bo'yicha qidirish"
          aria-label="Biznes qidirish"
        />

        <div className="-mx-4 mt-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {KIND_TABS.map((tab) => (
            <FilterChip key={tab.value} label={tab.label} active={kind === tab.value} onClick={() => setKind(tab.value)} />
          ))}
        </div>

        <div className="-mx-4 mt-2 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {STATUS_TABS.map((tab) => (
            <FilterChip
              key={tab.value}
              label={tab.label}
              active={status === tab.value}
              onClick={() => setStatus(tab.value)}
            />
          ))}
        </div>

        {actionError && (
          <Alert variant="error" title="Bajarilmadi" className="mb-4">
            {actionError}
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Ro'yxatni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && businesses.length === 0 && (
          <EmptyState icon={Store} title="Biznes topilmadi" description="Filtrni yoki qidiruv so'zini o'zgartiring." />
        )}

        <ul className="space-y-2 pb-4">
          {businesses.map((item, index) => {
            const Icon = KIND_ICONS[item.kind];
            const isBusy = busyId === item.id;
            const isClosing = closingId === item.id;

            return (
              <li
                key={`${item.kind}-${item.id}`}
                className={cn(
                  'bg-card border-border animate-fade-up rounded-2xl border p-3',
                  !item.isActive && 'border-destructive/40 bg-destructive/5',
                )}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl',
                      item.isActive ? 'bg-secondary text-muted-foreground' : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      {!item.isActive && <Badge variant="destructive">Yopiq</Badge>}
                    </div>

                    <p className="text-muted-foreground truncate text-xs">
                      {KIND_LABELS[item.kind]}
                      {item.city ? ` · ${item.city}` : ''}
                      {item.ownerName ? ` · ${item.ownerName}` : ' · egasi biriktirilmagan'}
                    </p>

                    {/*
                      Faol buyurtmalar soni — yopishdan OLDIN bilish kerak.
                      Yopish ularni to'xtatmaydi, lekin xodim nima
                      bo'layotganini bilishi shart.
                    */}
                    {item.activeOrders > 0 && (
                      <p className="text-warning mt-0.5 text-xs">{item.activeOrders} ta faol buyurtma bor</p>
                    )}
                  </div>
                </div>

                {isClosing ? (
                  <div className="mt-3 space-y-3">
                    <Field id={`reason-${item.id}`} label="Yopish sababi" hint="Jurnalga yoziladi" required>
                      <Textarea
                        id={`reason-${item.id}`}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Masalan: Sanitariya talablari buzilgani aniqlandi"
                        rows={2}
                        maxLength={200}
                      />
                    </Field>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        isLoading={isBusy}
                        disabled={reason.trim().length < 5}
                        onClick={() => void apply(item, false, reason.trim())}
                      >
                        Yopish
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setClosingId(null);
                          setReason('');
                        }}
                      >
                        Bekor qilish
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    {item.isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setClosingId(item.id);
                          setReason('');
                          setActionError(null);
                        }}
                      >
                        <Ban className="size-4" aria-hidden="true" />
                        Vaqtincha yopish
                      </Button>
                    ) : (
                      <Button size="sm" isLoading={isBusy} onClick={() => void apply(item, true)}>
                        <Check className="size-4" aria-hidden="true" />
                        Qayta ochish
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
