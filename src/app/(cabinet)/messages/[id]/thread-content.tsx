/* eslint-disable @next/next/no-img-element */
'use client';

import {
  ArrowLeft,
  BadgeCheck,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  SendHorizontal,
  Store,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ServiceIcon } from '@/components/app/service-icon';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageAttach } from '@/components/upload/image-attach';
import { useApiClient } from '@/hooks/use-api';
import { useChatStream } from '@/hooks/use-chat-stream';
import { useImageUpload } from '@/hooks/use-image-upload';
import { toUserMessage } from '@/lib/api-client';
import { formatUzTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { useCall } from '@/modules/call/call-provider';
import { callSummaryText, type CallView } from '@/modules/call/call.types';
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
  const { start } = useCall();

  const [draft, setDraft] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<MessageView[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const image = useImageUpload('CHAT');

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
   * Xabarlar va qo'ng'iroqlar BITTA vaqt chizig'ida.
   *
   * Ular alohida ro'yxatlarda ko'rsatilsa, "qo'ng'iroq qildim, javob
   * bo'lmagach yozdim" ketma-ketligi buzilib, suhbat mantiqsiz
   * ko'rinardi.
   */
  const timeline = buildTimeline(messages, thread?.calls ?? []);

  /**
   * Yangi xabar kelganda pastga suramiz.
   *
   * `messages.length` ga bog'langan: matn o'zgarganda emas, YANGI
   * xabar qo'shilganda ishlaydi.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [timeline.length]);

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

  async function attachImage(file: File): Promise<void> {
    const url = await image.upload(file);

    if (url) setImageUrl(url);
  }

  async function send(event: FormEvent): Promise<void> {
    event.preventDefault();

    const body = draft.trim();
    const attached = imageUrl;

    // Rasm o'zi ham xabar: matn shart emas.
    if ((!body && !attached) || isSending || image.isUploading) return;

    setIsSending(true);
    setError(null);
    setDraft('');
    setImageUrl(null);

    /**
     * Vaqtinchalik xabar — u faqat ekranda, bazada emas.
     *
     * `id` ataylab boshqacha (`pending-`): oqimdan kelgan haqiqiy
     * xabar bilan aralashib ketmasligi kerak.
     */
    const temporary: MessageView = {
      id: `pending-${Date.now()}`,
      body,
      imageUrl: attached,
      isMine: true,
      createdAt: new Date().toISOString(),
      status: 'SENT',
      isDeleted: false,
    };

    setPending((current) => [...current, temporary]);

    try {
      const result = await request<SendMessageResponse>(`/api/v1/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { body, ...(attached ? { imageUrl: attached } : {}) },
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
      // Yozilgan matn va biriktirilgan rasm yo'qolmasin.
      setDraft(body);
      setImageUrl(attached);
      setError(toUserMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  const peer = thread?.peer ?? null;

  /** Qo'ng'iroq faqat odam bilan suhbatda va suhbat yuklangach mumkin. */
  const canCall = peer?.kind === 'DIRECT';

  return (
    /*
      Suhbat oynasi — BUTUN ekranni egallaydi.

      ── Nima uchun `fixed`, oddiy sahifa emas ──────────────────────────
      Avval sahifa odatdagidek surilardi va yozish maydoni "sticky"
      bo'lgani uchun pastda turardi. Lekin sticky element faqat O'Z
      konteyneri ko'rinib turganda yopishadi: xabarlar ko'payib,
      sahifa surila boshlagach, yozish maydoni ekrandan chiqib ketardi.

      To'g'ri yechim — chat oynasini alohida qilib qurish: sarlavha
      tepada, yozish maydoni pastda QIMIRLAMAYDI, faqat o'rtadagi
      xabarlar ro'yxati suriladi. Barcha chat ilovalari shunday
      ishlaydi.

      ── Nima uchun pastki menyu ustidan ────────────────────────────────
      Suhbat ochilganda pastki menyu kerak emas: undan chiqish uchun
      sarlavhadagi "orqaga" tugmasi bor. Ikkalasi birga tursa, tor
      telefon ekranida ~64px bekorga ketardi va yozish maydoni yuqoriga
      siqilardi.
    */
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      {/* Sarlavha — qimirlamaydi */}
      <header className="glass-chrome shrink-0 border-b">
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
            Ovozli qo'ng'iroq faqat ODAM bilan suhbatda ishlaydi.

            Kompaniya suhbatida ikkinchi tomon — jadval yozuvi, telefoni
            bor odam emas. Tugmani yoqib qo'yish "qo'ng'iroq ketdi, lekin
            hech kim ko'tarmadi" degan yolg'on taassurot berardi.
          */}
          <Button
            variant="ghost"
            size="icon"
            disabled={!canCall}
            onClick={() => void start(conversationId, 'AUDIO')}
            aria-label={canCall ? "Ovozli qo'ng'iroq" : "Kompaniyaga qo'ng'iroq qilib bo'lmaydi"}
          >
            <Phone className="size-5" aria-hidden="true" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            disabled={!canCall}
            onClick={() => void start(conversationId, 'VIDEO')}
            aria-label={canCall ? "Video qo'ng'iroq" : "Kompaniyaga qo'ng'iroq qilib bo'lmaydi"}
          >
            <Video className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/*
        Xabarlar — FAQAT shu qism suriladi.

        `min-h-0` shart: usiz flex bolasi o'z mazmuniga qarab cho'zilib,
        surish ichkarida emas, butun oynada sodir bo'lardi.
      */}
      <div className="mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto px-4 py-4">
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

        {thread && timeline.length === 0 && (
          <p className="text-muted-foreground py-12 text-center text-sm leading-relaxed">
            Hali xabar yo&apos;q. Birinchi bo&apos;lib yozing.
          </p>
        )}

        <ul className="space-y-2" aria-label="Xabarlar">
          {timeline.map((item) =>
            item.type === 'call' ? (
              <li key={`call-${item.call.id}`} className="flex justify-center py-1">
                <span className="bg-secondary text-secondary-foreground inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs">
                  {item.call.status === 'MISSED' || item.call.status === 'DECLINED' ? (
                    <PhoneMissed className="text-destructive size-3.5 shrink-0" aria-hidden="true" />
                  ) : item.call.isOutgoing ? (
                    <PhoneOutgoing className="size-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <PhoneIncoming className="size-3.5 shrink-0" aria-hidden="true" />
                  )}

                  <span>{callSummaryText(item.call)}</span>
                  <span className="text-muted-foreground">{formatUzTime(item.call.startedAt)}</span>
                </span>
              </li>
            ) : (
              <MessageBubble key={item.message.id} message={item.message} />
            ),
          )}
        </ul>

        {thread?.isPeerTyping && (
          <p className="text-muted-foreground mt-2 text-xs" aria-live="polite">
            {`${thread.peer.name} yozmoqda...`}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Yozish maydoni — DOIM pastda, qimirlamaydi */}
      <form
        onSubmit={send}
        className="glass-chrome shrink-0 border-t"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-lg items-end gap-2 px-3 py-2.5">
          <ImageAttach
            value={imageUrl}
            isUploading={image.isUploading}
            disabled={isSending}
            onSelect={(file) => void attachImage(file)}
            onRemove={() => setImageUrl(null)}
            className="shrink-0"
          />

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
            disabled={(!draft.trim() && !imageUrl) || isSending || image.isUploading}
            aria-label="Yuborish"
            className="shrink-0 rounded-full"
          >
            <SendHorizontal className="size-5" aria-hidden="true" />
          </Button>
        </div>

        {image.error && (
          <p className="text-destructive px-4 pb-2 text-xs" role="alert">
            {image.error}
          </p>
        )}

        {/*
          Ulanish uzilganini YASHIRMAYMIZ: odam xabari yetmayotganini
          bilishi kerak.
        */}
        {thread && !isLive && <p className="text-muted-foreground pb-2 text-center text-xs">Qayta ulanmoqda...</p>}
      </form>
    </div>
  );
}

/**
 * Xabarlar va qo'ng'iroqlarni vaqt bo'yicha bitta ro'yxatga qo'shadi.
 *
 * Ikkalasi ham ISO vaqtga ega, shuning uchun taqqoslash oddiy matn
 * taqqoslash bilan bajariladi — sana obyektlarini yaratish shart emas.
 */
type TimelineItem = { type: 'message'; message: MessageView } | { type: 'call'; call: CallView };

function buildTimeline(messages: MessageView[], calls: CallView[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...messages.map((message): TimelineItem => ({ type: 'message', message })),
    ...calls.map((call): TimelineItem => ({ type: 'call', call })),
  ];

  return items.sort((a, b) => {
    const left = a.type === 'message' ? a.message.createdAt : a.call.startedAt;
    const right = b.type === 'message' ? b.message.createdAt : b.call.startedAt;

    return left.localeCompare(right);
  });
}

/** Bitta xabar puffagi. */
function MessageBubble({ message }: { message: MessageView }) {
  return (
    <li className={cn('flex', message.isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2',
          message.isMine
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-secondary text-secondary-foreground rounded-bl-md',
        )}
      >
        {message.imageUrl && (
          /*
            Rasm puffak ichida — matn bilan bir xil kenglikda. Balandligi
            cheklangan: baland rasm butun ekranni egallab, suhbatni
            aylantirishni qiyinlashtirardi.
          */
          <img
            src={message.imageUrl}
            alt=""
            loading="lazy"
            className={cn('max-h-72 w-full rounded-xl object-cover', message.body && 'mb-2')}
          />
        )}

        {(message.body.length > 0 || message.isDeleted) && (
          <p
            className={cn(
              'text-sm leading-relaxed break-words whitespace-pre-wrap',
              message.isDeleted && 'italic opacity-70',
            )}
          >
            {message.isDeleted ? "Xabar o'chirilgan" : message.body}
          </p>
        )}

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
                message.status === 'SEEN' ? "O'qildi" : message.status === 'DELIVERED' ? 'Yetkazildi' : 'Yuborildi'
              }
              className={cn(message.status === 'SEEN' && 'text-sky-300')}
            >
              {statusMark(message.status)}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}
