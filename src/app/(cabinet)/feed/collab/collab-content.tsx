'use client';

import { BadgeCheck, Check, Handshake, MessageCircle, Undo2, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatRelativeUz } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  COLLAB_STATUS_LABELS,
  type CollabBoxName,
  type CollabOffersResponse,
  type CollabOfferView,
} from '@/modules/collab/collab.types';

const BOXES: { value: CollabBoxName; label: string }[] = [
  { value: 'IN', label: 'Menga kelgan' },
  { value: 'OUT', label: 'Men yuborgan' },
];

/**
 * Hamkorlik takliflari.
 *
 * ── Nima uchun IKKI quti ──────────────────────────────────────────────
 * Bitta odam ham ijodkor, ham biznes egasi bo'lishi mumkin: usta o'z
 * do'koni haqida video joylaydi va boshqa blogerga taklif yuboradi.
 *
 * Bitta ro'yxatda ikkalasi aralashsa, "menga kim yozdi?" degan
 * savolga javob topish qiyinlashardi.
 *
 * ── Nima uchun javob kutayotganlar YUQORIDA ───────────────────────────
 * Faqat ular harakat talab qiladi. Vaqt bo'yicha tartiblasak, eski
 * javobsiz taklif javob berilgan yangilar ostida qolib ketardi.
 */
export function CollabContent() {
  const request = useApiClient();

  const [box, setBox] = useState<CollabBoxName>('IN');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: loadError, setData } = useApiQuery<CollabOffersResponse>(
    `/api/v1/collab/offers?box=${box}`,
  );

  const offers = data?.offers ?? [];

  /**
   * Javob berish — OPTIMISTIK emas.
   *
   * Server holatni tekshiradi: ikkinchi qurilmadan allaqachon javob
   * berilgan bo'lishi mumkin. Oldindan o'zgartirsak, ekranda
   * "qabul qilindi" turib, serverda "rad etilgan" bo'lib qolardi.
   */
  async function respond(offer: CollabOfferView, action: 'ACCEPT' | 'DECLINE' | 'WITHDRAW') {
    setBusyId(offer.id);
    setError(null);

    try {
      const result = await request<{ offer: CollabOfferView }>(`/api/v1/collab/offers/${offer.id}`, {
        method: 'PATCH',
        body: { action },
      });

      setData((current) => ({
        offers: (current?.offers ?? []).map((item) => (item.id === offer.id ? result.offer : item)),
        // Javob berilgan taklif endi kutmaydi.
        pendingCount: Math.max(0, (current?.pendingCount ?? 0) - (offer.isIncoming ? 1 : 0)),
      }));
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AppHeader title="Hamkorlik" showBack backHref="/feed/profile" />

      <div className="space-y-4 px-4 pt-4 pb-tabbar">
        <div role="tablist" aria-label="Takliflar" className="border-border flex gap-1 border-b">
          {BOXES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={box === item.value}
              onClick={() => setBox(item.value)}
              className={cn(
                'relative -mb-px border-b-2 px-3 py-2.5 text-sm transition-colors',
                box === item.value
                  ? 'border-primary text-foreground font-medium'
                  : 'text-muted-foreground border-transparent',
              )}
            >
              {item.label}

              {/* Javob kutayotganlar soni — FAQAT kelgan qutida. */}
              {item.value === 'IN' && (data?.pendingCount ?? 0) > 0 && (
                <span className="bg-primary text-primary-foreground ml-1.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums">
                  {data?.pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        {loadError && <Alert variant="error">{loadError}</Alert>}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-32 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && !loadError && offers.length === 0 && (
          <EmptyState
            icon={Handshake}
            title={box === 'IN' ? "Hozircha taklif yo'q" : 'Taklif yubormagansiz'}
            description={
              box === 'IN'
                ? "Profilingizda «Hamkorlikka ochiqman» ni belgilasangiz, biznes sizni katalogda topadi."
                : 'Ijodkorlar katalogidan mos blogerni tanlab, taklif yuboring.'
            }
            action={
              box === 'IN' ? undefined : (
                <Button asChild>
                  <Link href="/feed/creators">Ijodkorlarni ko&apos;rish</Link>
                </Button>
              )
            }
          />
        )}

        <div className="space-y-3">
          {offers.map((offer) => {
            const isBusy = busyId === offer.id;
            const isPending = offer.status === 'PENDING';

            return (
              <article
                key={offer.id}
                className={cn(
                  'bg-card border-border rounded-2xl border p-4',
                  // Javob kutayotgani AJRALIB turadi.
                  isPending && 'border-primary/40',
                )}
              >
                <div className="flex items-start gap-3">
                  <Link href={`/u/${offer.person.username}`} className="shrink-0">
                    <Avatar src={offer.person.avatarUrl} name={offer.person.fullName} size="sm" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link href={`/u/${offer.person.username}`} className="flex items-baseline gap-1.5">
                      <span className="truncate text-sm font-semibold hover:underline">
                        {offer.person.fullName ?? `@${offer.person.username}`}
                      </span>

                      {offer.person.isVerified && (
                        <BadgeCheck className="text-primary size-4 shrink-0" aria-label="Tasdiqlangan" />
                      )}
                    </Link>

                    <p className="text-muted-foreground text-xs">{formatRelativeUz(offer.createdAt)}</p>
                  </div>

                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-xs',
                      isPending
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {COLLAB_STATUS_LABELS[offer.status]}
                  </span>
                </div>

                <h3 className="mt-3 text-sm font-semibold">{offer.subject}</h3>

                <p className="text-muted-foreground mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {offer.message}
                </p>

                {/*
                  Qabul qilingandan keyin — SUHBATGA havola.

                  Kelishuv shu yerda davom etadi: u yerda rasm ham,
                  ovoz ham, tarix ham bor.
                */}
                {offer.status === 'ACCEPTED' && offer.conversationId && (
                  <Button variant="outline" fullWidth className="mt-3" asChild>
                    <Link href={`/messages/${offer.conversationId}`}>
                      <MessageCircle className="size-4" aria-hidden="true" />
                      Suhbatni ochish
                    </Link>
                  </Button>
                )}

                {isPending && offer.isIncoming && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      className="flex-1"
                      isLoading={isBusy}
                      onClick={() => void respond(offer, 'ACCEPT')}
                    >
                      <Check className="size-4" aria-hidden="true" />
                      Qabul qilish
                    </Button>

                    <Button variant="outline" disabled={isBusy} onClick={() => void respond(offer, 'DECLINE')}>
                      <X className="size-4" aria-hidden="true" />
                      Rad etish
                    </Button>
                  </div>
                )}

                {isPending && !offer.isIncoming && (
                  <Button
                    variant="ghost"
                    fullWidth
                    className="mt-3"
                    isLoading={isBusy}
                    onClick={() => void respond(offer, 'WITHDRAW')}
                  >
                    <Undo2 className="size-4" aria-hidden="true" />
                    Qaytarib olish
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
