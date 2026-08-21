'use client';

import { Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { RequireAuth } from '@/modules/auth/require-auth';
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_VARIANTS,
  isTicketClosed,
  type SupportTicketView,
} from '@/modules/support/support.types';

interface TicketResponse {
  ticket: SupportTicketView;
}

/**
 * Bitta murojaat — yozishma va javob yozish.
 *
 * ── Nima uchun CHATGA o'xshamaydi ─────────────────────────────────────
 * Chatda xabarlar tez-tez keladi va oxirgisi doim pastda turadi.
 * Bu yerda esa yozishma qisqa (odatda ikki-uch xabar) va odam uni
 * BOSHIDAN o'qiydi: o'zi nima yozganini va javobda nima deyilganini.
 *
 * Shuning uchun oddiy ro'yxat — avtomatik pastga siljish yo'q.
 */
export function TicketContent({ ticketId }: { ticketId: string }) {
  return (
    <RequireAuth>
      <TicketBody ticketId={ticketId} />
    </RequireAuth>
  );
}

function TicketBody({ ticketId }: { ticketId: string }) {
  const request = useApiClient();
  const { data, isLoading, error, reload } = useApiQuery<TicketResponse>(`/api/v1/support/${ticketId}`);

  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const ticket = data?.ticket ?? null;
  const closed = ticket ? isTicketClosed(ticket.status) : false;

  async function handleSend(event: FormEvent) {
    event.preventDefault();

    const text = message.trim();
    if (!text) return;

    setIsSending(true);
    setSendError(null);

    try {
      await request(`/api/v1/support/${ticketId}`, { method: 'POST', body: { message: text } });
      setMessage('');
      reload();
    } catch (caught) {
      setSendError(toUserMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <AppHeader title={ticket?.ticketNumber ?? 'Murojaat'} showBack backHref="/support" />

      <div className="px-4 pt-4 pb-8">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Murojaatni ochib bo'lmadi">
            {error}
          </Alert>
        )}

        {ticket && (
          <>
            <div className="bg-card border-border animate-fade-up mb-4 rounded-2xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold">{ticket.subject}</h1>
                <Badge variant={SUPPORT_STATUS_VARIANTS[ticket.status]}>
                  {SUPPORT_STATUS_LABELS[ticket.status]}
                </Badge>
              </div>

              <p className="text-muted-foreground mt-1 text-xs">
                {`${SUPPORT_CATEGORY_LABELS[ticket.category]} · ${formatUzDateTime(ticket.createdAt)}`}
              </p>
            </div>

            <ul className="space-y-3">
              {ticket.messages.map((entry) => (
                <li
                  key={entry.id}
                  className={cn(
                    'animate-fade-up rounded-2xl border p-3',
                    entry.isStaff ? 'border-primary/30 bg-primary/5' : 'bg-card border-border',
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className={cn('text-xs font-medium', entry.isStaff && 'text-primary')}>
                      {entry.authorName ?? 'Siz'}
                    </span>
                    <span className="text-muted-foreground text-xs">{formatUzDateTime(entry.createdAt)}</span>
                  </div>

                  {/*
                    `whitespace-pre-wrap` — odam yozgan qatorlar
                    saqlanadi. Usiz ro'yxat yoki abzatslar bitta uzun
                    gapga aylanib qolardi.
                  */}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.body}</p>
                </li>
              ))}
            </ul>

            {closed ? (
              <Alert variant="info" title="Murojaat yakunlangan" className="mt-4">
                Savolingiz qolgan bo&apos;lsa, yangi murojaat oching.
              </Alert>
            ) : (
              <form onSubmit={handleSend} className="mt-4 space-y-3">
                {sendError && (
                  <Alert variant="error" title="Yuborilmadi">
                    {sendError}
                  </Alert>
                )}

                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Javob yozing…"
                  rows={3}
                  maxLength={2000}
                  aria-label="Javob matni"
                  disabled={isSending}
                />

                <Button type="submit" fullWidth isLoading={isSending} disabled={message.trim().length === 0}>
                  <Send className="size-4.5" aria-hidden="true" />
                  Yuborish
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </>
  );
}
