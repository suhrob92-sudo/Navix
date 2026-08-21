'use client';

import { ChevronRight, LifeBuoy, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { FilterChip } from '@/components/ui/filter-chip';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatRelativeUz } from '@/lib/date';
import { RequireAuth } from '@/modules/auth/require-auth';
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_VARIANTS,
  type SupportTicketListItem,
} from '@/modules/support/support.types';

interface TicketsResponse {
  tickets: SupportTicketListItem[];
}

const TABS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'ACTIVE', label: 'Faol' },
  { value: 'FINISHED', label: 'Yakunlangan' },
] as const;

/**
 * Yordam bo'limi — murojaatlar ro'yxati.
 *
 * ── Nima uchun bu bo'lim kerak edi ────────────────────────────────────
 * Ilgari savoli bor odamning boradigan joyi yo'q edi: pastki menyuda
 * elektron pochta manzili yozilgan, xolos. Telefonda ishlaydigan odam
 * uchun bu amalda "murojaat yo'q" degani — u pochta ilovasini ochib,
 * xat yozib, javobini kutishi kerak edi.
 */
export function SupportContent() {
  return (
    <RequireAuth>
      <SupportBody />
    </RequireAuth>
  );
}

function SupportBody() {
  const [status, setStatus] = useState<string>('ALL');
  const { data, isLoading, error } = useApiQuery<TicketsResponse>(`/api/v1/support?status=${status}`);

  const tickets = data?.tickets ?? [];

  return (
    <>
      <AppHeader title="Yordam" showBack backHref="/profile" />

      <div className="px-4 pt-4">
        <Button asChild fullWidth size="lg" className="mb-4">
          <Link href="/support/new">
            <Plus className="size-4.5" aria-hidden="true" />
            Yangi murojaat
          </Link>
        </Button>

        <div className="-mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {TABS.map((tab) => (
            <FilterChip
              key={tab.value}
              label={tab.label}
              active={status === tab.value}
              onClick={() => setStatus(tab.value)}
            />
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Murojaatlarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && tickets.length === 0 && (
          <EmptyState
            icon={LifeBuoy}
            title="Murojaat yo'q"
            description="Savolingiz yoki muammoyingiz bo'lsa, yangi murojaat oching — javob beramiz."
          />
        )}

        <ul className="space-y-2 pb-4">
          {tickets.map((ticket, index) => (
            <li key={ticket.id}>
              <Link
                href={`/support/${ticket.id}`}
                className="bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-3 transition-transform active:scale-[0.99]"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{ticket.subject}</p>
                    <Badge variant={SUPPORT_STATUS_VARIANTS[ticket.status]}>
                      {SUPPORT_STATUS_LABELS[ticket.status]}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground truncate text-xs">
                    {`${SUPPORT_CATEGORY_LABELS[ticket.category]} · ${ticket.ticketNumber}`}
                  </p>
                  <p className="text-muted-foreground text-xs">{formatRelativeUz(ticket.lastMessageAt)}</p>
                </div>

                <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
