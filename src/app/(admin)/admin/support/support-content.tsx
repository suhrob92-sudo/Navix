'use client';

import { Check, ChevronRight, LifeBuoy, Send, X } from 'lucide-react';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { FilterChip } from '@/components/admin/filter-chip';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Permission } from '@/config/rbac';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatRelativeUz, formatUzDateTime } from '@/lib/date';
import { formatUzPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { RequireAdmin } from '@/modules/admin/require-admin';
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_VARIANTS,
  isTicketClosed,
  type SupportTicketListItem,
  type SupportTicketView,
} from '@/modules/support/support.types';

interface AdminTicketsResponse {
  tickets: (SupportTicketListItem & { customerName: string; customerPhone: string })[];
  openCount: number;
}

const STATUS_TABS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'OPEN', label: 'Javob kutmoqda' },
  { value: 'ANSWERED', label: 'Javob berilgan' },
  { value: 'RESOLVED', label: 'Hal qilingan' },
  { value: 'CLOSED', label: 'Yopilgan' },
] as const;

/**
 * Murojaatlar — xodim tomoni.
 *
 * ── Nima uchun bitta sahifa ───────────────────────────────────────────
 * Ro'yxat va yozishma alohida sahifalarda bo'lishi mumkin edi. Lekin
 * xodimning ishi — ketma-ket bir nechta murojaatga javob berish;
 * har safar orqaga qaytib, ro'yxatni qayta yuklash uni sekinlashtiradi.
 *
 * Shuning uchun murojaat SHU YERDA, ro'yxat ustida ochiladi.
 */
export function AdminSupportContent() {
  return (
    <RequireAdmin permission={Permission.PLATFORM_SUPPORT_MANAGE}>
      <SupportBody />
    </RequireAdmin>
  );
}

function SupportBody() {
  const request = useApiClient();

  const [status, setStatus] = useState<string>('OPEN');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const query = new URLSearchParams({ status });
  if (search.trim()) query.set('search', search.trim());

  const { data, isLoading, error, reload } = useApiQuery<AdminTicketsResponse>(
    `/api/v1/admin/support?${query.toString()}`,
  );

  const tickets = data?.tickets ?? [];

  return (
    <>
      <AdminHeader title="Murojaatlar" showBack backHref="/admin" />

      <div className="px-4 pt-4">
        {(data?.openCount ?? 0) > 0 && (
          <Alert variant="warning" title={`${data?.openCount} ta murojaat javob kutmoqda`} className="mb-4">
            Javobsiz qolgan murojaat — bu ketgan mijoz.
          </Alert>
        )}

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Raqam, mavzu yoki telefon"
          aria-label="Murojaat qidirish"
        />

        <div className="-mx-4 mt-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {STATUS_TABS.map((tab) => (
            <FilterChip
              key={tab.value}
              label={tab.label}
              active={status === tab.value}
              onClick={() => {
                setStatus(tab.value);
                setOpenId(null);
              }}
            />
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
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
          <EmptyState icon={LifeBuoy} title="Murojaat yo'q" description="Bu filtr bo'yicha hech narsa topilmadi." />
        )}

        <ul className="space-y-2 pb-4">
          {tickets.map((ticket, index) => (
            <li
              key={ticket.id}
              className="bg-card border-border animate-fade-up rounded-2xl border"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <button
                type="button"
                onClick={() => setOpenId(openId === ticket.id ? null : ticket.id)}
                aria-expanded={openId === ticket.id}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{ticket.subject}</p>
                    <Badge variant={SUPPORT_STATUS_VARIANTS[ticket.status]}>
                      {SUPPORT_STATUS_LABELS[ticket.status]}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground truncate text-xs">
                    {`${SUPPORT_CATEGORY_LABELS[ticket.category]} · ${ticket.customerName} · ${formatUzPhone(ticket.customerPhone)}`}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {`${ticket.ticketNumber} · ${formatRelativeUz(ticket.lastMessageAt)}`}
                  </p>
                </div>

                <ChevronRight
                  className={cn(
                    'text-muted-foreground size-4 shrink-0 transition-transform',
                    openId === ticket.id && 'rotate-90',
                  )}
                  aria-hidden="true"
                />
              </button>

              {openId === ticket.id && (
                <TicketThread
                  ticketId={ticket.id}
                  onChanged={() => {
                    reload();
                  }}
                  request={request}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/** Ochilgan murojaatning yozishmasi va javob maydoni. */
function TicketThread({
  ticketId,
  onChanged,
  request,
}: {
  ticketId: string;
  onChanged: () => void;
  request: ReturnType<typeof useApiClient>;
}) {
  const { data, isLoading, error, reload } = useApiQuery<{ ticket: SupportTicketView }>(
    `/api/v1/admin/support/${ticketId}`,
  );

  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const ticket = data?.ticket ?? null;
  const closed = ticket ? isTicketClosed(ticket.status) : false;

  async function send() {
    const text = message.trim();
    if (!text) return;

    setBusy(true);
    setActionError(null);

    try {
      await request(`/api/v1/admin/support/${ticketId}`, { method: 'POST', body: { message: text } });
      setMessage('');
      reload();
      onChanged();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function finish(status: 'RESOLVED' | 'CLOSED') {
    setBusy(true);
    setActionError(null);

    try {
      await request(`/api/v1/admin/support/${ticketId}`, { method: 'PATCH', body: { status } });
      reload();
      onChanged();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-border/60 space-y-3 border-t p-3">
      {isLoading && <Skeleton className="h-24 rounded-xl" />}

      {!isLoading && error && (
        <Alert variant="error" title="Ochib bo'lmadi">
          {error}
        </Alert>
      )}

      {actionError && (
        <Alert variant="error" title="Bajarilmadi">
          {actionError}
        </Alert>
      )}

      {ticket && (
        <>
          <ul className="space-y-2">
            {ticket.messages.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  'rounded-xl border p-2.5',
                  entry.isStaff ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/30',
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className={cn('text-xs font-medium', entry.isStaff && 'text-primary')}>
                    {entry.isStaff ? (entry.authorName ?? 'Xodim') : (ticket.customer?.name ?? 'Mijoz')}
                  </span>
                  <span className="text-muted-foreground text-xs">{formatUzDateTime(entry.createdAt)}</span>
                </div>

                <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.body}</p>
              </li>
            ))}
          </ul>

          {closed ? (
            <p className="text-muted-foreground text-xs">
              Murojaat yakunlangan{ticket.assigneeName ? ` · ${ticket.assigneeName}` : ''}
            </p>
          ) : (
            <>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Javob yozing…"
                rows={3}
                maxLength={2000}
                aria-label="Javob matni"
                disabled={busy}
              />

              <div className="flex flex-wrap gap-2">
                <Button size="sm" isLoading={busy} disabled={message.trim().length === 0} onClick={() => void send()}>
                  <Send className="size-4" aria-hidden="true" />
                  Javob berish
                </Button>

                <Button size="sm" variant="outline" disabled={busy} onClick={() => void finish('RESOLVED')}>
                  <Check className="size-4" aria-hidden="true" />
                  Hal qilindi
                </Button>

                {/*
                  "Yopish" — javobsiz yakunlash (spam yoki takroriy
                  murojaat). Foydalanuvchiga xabar yuborilmaydi:
                  bunday murojaat egasiga "yopildi" deyish faqat
                  yangi savol tug'dirardi.
                */}
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => void finish('CLOSED')}>
                  <X className="size-4" aria-hidden="true" />
                  Javobsiz yopish
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
