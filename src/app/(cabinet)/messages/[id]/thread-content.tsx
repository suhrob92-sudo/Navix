'use client';

import { ArrowLeft, BadgeCheck, Phone, SendHorizontal, Store, Video } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ServiceIcon } from '@/components/app/service-icon';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient } from '@/hooks/use-api';
import { useChatStream } from '@/hooks/use-chat-stream';
import { toUserMessage } from '@/lib/api-client';
import { formatUzTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { peerStatusText, statusMark, type MessageView, type SendMessageResponse } from '@/modules/chat/chat.types';

export interface ThreadContentProps {
  conversationId: string;
}

/** "Yozmoqda" belgisi shuncha oraliqda yangilanadi. */
const TYPING_PING_MS = 3_000;

/**
 * Suhbat oynasi.
 *
 * ── Nima uchun xabarlar OQIMDAN keladi ────────────────────────────────
 * Sahifa jonli ulanishga (`useChatStream`) ulanadi va butun suhbatni
 * undan oladi. Alohida "yuklash" so'rovi yo'q: oqim ochilishi bilan
 * birinchi holatni yuboradi.
 *
 * Shu tufayli ikkinchi tomon yozgan xabar bir-ikki soniya ichida
 * o'zi paydo bo'ladi — sahifani yangilash kerak emas.
 *
 * ── Nima uchun yuborilgan xabar DARHOL ko'rinadi ──────────────────────
 * Server javobini kutib turilsa, matn yozilib, tugma bosilgach bir
 * soniya hech narsa bo'lmasdi. Shuning uchun xabar avval ekranga
 * qo'yiladi, keyin serverga yuboriladi. Oqimdan haqiqiy holat
 * kelganda vaqtinchalik nusxa o'z-o'zidan almashadi.
 */
export function ThreadContent({ conversationId }: ThreadContentProps) {
  const request = useApiClient();
  const { thread, isLive } = useChatStream(conversationId);

  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<MessageView[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTypingAt = useRef(0);
  const readMarkedFor = useRef<string | null>(null);

  /**
   * Ekranda ko'rinadigan xabarlar.
   *
   * ── Nima uchun vaqtinchalik nusxa DARHOL olib tashlanmaydi ──────────
   * Server javobi tez keladi (bir necha yuz millisekund), lekin
   * xabarning O'ZI jonli oqimdan keladi va oqim bir-ikki soniyada bir
   * marta tekshiradi.
   *
   * Nusxa javob kelishi bilan o'chirilsa, xabar shu oraliqda ekrandan
   * YO'QOLIB turardi — odam "yuborilmadi shekilli" deb ikkinchi marta
   * yozardi. Shuning uchun nusxa faqat HAQIQIY xabar kelgach olinadi:
   * ikkalasining `id` si bir xil bo'ladi.
   */
  const messages = thread
    ? [...thread.messages, ...pending.filter((item) => !thread.messages.some((real) => real.id === item.id))]
    : pending;

  /**
   * Yangi xabar kelganda pastga suramiz.
   *
   * `messages.length` ga bog'langan: matn o'zgarganda emas, YANGI
   * xabar qo'shilganda ishlaydi.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  /**
   * Suhbat ochilganda uni o'qilgan deb belgilaymiz.
   *
   * Bir marta — `readMarkedFor` shu suhbat uchun belgilangach,
   * takroriy so'rov yuborilmaydi.
   */
  useEffect(() => {
    if (!thread || readMarkedFor.current === thread.id) return;

    readMarkedFor.current = thread.id;

    void request(`/api/v1/chat/conversations/${thread.id}/read`, { method: 'POST', body: {} }).catch(() => {
      // O'qilgan belgisi qo'yilmasa ham suhbat ishlayveradi.
    });
  }, [thread, request]);

  /**
   * Yozayotganimizni bildiramiz.
   *
   * Har bosilgan harfda emas: belgi Redis'da bir necha soniya
   * yashaydi, shuning uchun uch soniyada bir marta yangilash yetarli.
   * Aks holda har harf uchun so'rov ketardi.
   */
  function handleDraftChange(value: string): void {
    setDraft(value);

    if (!value.trim() || Date.now() - lastTypingAt.current < TYPING_PING_MS) return;

    lastTypingAt.current = Date.now();

    void request(`/api/v1/chat/conversations/${conversationId}/typing`, {
      method: 'POST',
      body: {},
    }).catch(() => {
      // "Yozmoqda" belgisi ikkinchi darajali — xatosi jimgina yutiladi.
    });
  }

  async function send(event: FormEvent): Promise<void> {
    event.preventDefault();

    const body = draft.trim();

    if (!body || isSending) return;

    setIsSending(true);
    setError(null);
    setDraft('');

    /**
     * Vaqtinchalik xabar — u faqat ekranda, bazada emas.
     *
     * `id` ataylab boshqacha (`pending-`): oqimdan kelgan haqiqiy
     * xabar bilan aralashib ketmasligi kerak.
     */
    const temporary: MessageView = {
      id: `pending-${Date.now()}`,
      body,
      isMine: true,
      createdAt: new Date().toISOString(),
      status: 'SENT',
      isDeleted: false,
    };

    setPending((current) => [...current, temporary]);

    try {
      const result = await request<SendMessageResponse>(`/api/v1/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { body },
      });

      /**
       * Nusxaga HAQIQIY `id` beriladi.
       *
       * Shundan keyin oqimdan o'sha `id` bilan xabar kelishi bilan
       * nusxa o'z-o'zidan yo'qoladi (yuqoridagi filtr) — ekranda esa
       * hech qanday sakrash bo'lmaydi.
       */
      setPending((current) => current.map((item) => (item.id === temporary.id ? { ...result.message } : item)));
    } catch (caught) {
      setPending((current) => current.filter((item) => item.id !== temporary.id));
      // Yozilgan matn yo'qolmasin — odam uni qaytadan yozmasin.
      setDraft(body);
      setError(toUserMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  const peer = thread?.peer ?? null;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Sarlavha */}
      <header className="glass-chrome sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-2">
          <Link
            href="/messages"
            aria-label="Orqaga"
            className="hover:bg-secondary inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>

          {peer ? (
            <Link href={peer.profileUrl} className="flex min-w-0 flex-1 items-center gap-2.5">
              {peer.kind === 'BUSINESS' && peer.color ? (
                <ServiceIcon icon={Store} color={peer.color} size="sm" />
              ) : (
                <Avatar src={peer.avatarUrl} name={peer.name} size="sm" />
              )}

              <span className="min-w-0">
                <span className="flex items-center gap-1">
                  <span className="truncate text-sm font-semibold">{peer.name}</span>
                  {peer.isVerified && (
                    <BadgeCheck className="text-primary size-3.5 shrink-0" aria-label="Tasdiqlangan" />
                  )}
                </span>
                <span
                  className={cn(
                    'block truncate text-xs',
                    thread?.isPeerTyping ? 'text-primary' : 'text-muted-foreground',
                  )}
                  aria-live="polite"
                >
                  {peer.kind === 'BUSINESS'
                    ? 'Kompaniya'
                    : peerStatusText(thread?.isPeerOnline ?? false, thread?.isPeerTyping ?? false)}
                </span>
              </span>
            </Link>
          ) : (
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-1.5 h-3 w-16" />
            </div>
          )}

          {/*
            Qo'ng'iroq tugmalari keyingi bosqichlarda ishga tushadi.
            Ular ko'rinib turadi, lekin bosilmaydi.
          */}
          <Button variant="ghost" size="icon" disabled aria-label="Audio qo'ng'iroq — tez orada">
            <Phone className="size-5" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" disabled aria-label="Video qo'ng'iroq — tez orada">
            <Video className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* Xabarlar */}
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
        {!thread && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
            <Skeleton className="h-10 w-3/5 rounded-2xl" />
          </div>
        )}

        {error && (
          <Alert variant="error" className="mb-3">
            {error}
          </Alert>
        )}

        {thread && messages.length === 0 && (
          <p className="text-muted-foreground py-12 text-center text-sm leading-relaxed">
            Hali xabar yo&apos;q. Birinchi bo&apos;lib yozing.
          </p>
        )}

        <ul className="space-y-2" aria-label="Xabarlar">
          {messages.map((message) => (
            <li key={message.id} className={cn('flex', message.isMine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-3.5 py-2',
                  message.isMine
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-secondary text-secondary-foreground rounded-bl-md',
                )}
              >
                <p
                  className={cn(
                    'text-sm leading-relaxed break-words whitespace-pre-wrap',
                    message.isDeleted && 'italic opacity-70',
                  )}
                >
                  {message.isDeleted ? "Xabar o'chirilgan" : message.body}
                </p>

                <p
                  className={cn(
                    'mt-1 flex items-center justify-end gap-1 text-[0.6875rem]',
                    message.isMine ? 'text-primary-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {formatUzTime(message.createdAt)}
                  {message.isMine && (
                    <span
                      aria-label={
                        message.status === 'SEEN'
                          ? "O'qildi"
                          : message.status === 'DELIVERED'
                            ? 'Yetkazildi'
                            : 'Yuborildi'
                      }
                      className={cn(message.status === 'SEEN' && 'text-sky-300')}
                    >
                      {statusMark(message.status)}
                    </span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {thread?.isPeerTyping && (
          <p className="text-muted-foreground mt-2 text-xs" aria-live="polite">
            {`${thread.peer.name} yozmoqda...`}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Yozish maydoni */}
      <form
        onSubmit={send}
        className="glass-chrome sticky bottom-0 border-t"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-lg items-end gap-2 px-3 py-2.5">
          <textarea
            value={draft}
            onChange={(event) => handleDraftChange(event.target.value)}
            onKeyDown={(event) => {
              // Telefonda Enter yangi qator, kompyuterda yuborish.
              if (event.key === 'Enter' && !event.shiftKey && window.innerWidth >= 640) {
                void send(event);
              }
            }}
            placeholder="Xabar yozing..."
            aria-label="Xabar matni"
            rows={1}
            className="bg-card/60 border-border focus-visible:ring-ring max-h-32 min-h-11 flex-1 resize-none rounded-2xl border px-4 py-2.5 text-base outline-none focus-visible:ring-2"
          />

          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim() || isSending}
            aria-label="Yuborish"
            className="shrink-0 rounded-full"
          >
            <SendHorizontal className="size-5" aria-hidden="true" />
          </Button>
        </div>

        {/*
          Ulanish uzilganini YASHIRMAYMIZ: odam xabari yetmayotganini
          bilishi kerak.
        */}
        {thread && !isLive && <p className="text-muted-foreground pb-2 text-center text-xs">Qayta ulanmoqda...</p>}
      </form>
    </div>
  );
}
