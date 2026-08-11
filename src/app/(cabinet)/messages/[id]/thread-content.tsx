/* eslint-disable @next/next/no-img-element */
'use client';

import {
  ArrowLeft,
  ArrowDown,
  BadgeCheck,
  CornerUpLeft,
  Mic,
  Pencil,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  SendHorizontal,
  Store,
  Video,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type UIEvent,
} from 'react';

import { ServiceIcon } from '@/components/app/service-icon';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageActions } from '@/components/chat/message-actions';
import { VoicePlayer } from '@/components/chat/voice-player';
import { VoiceRecorderBar } from '@/components/chat/voice-recorder-bar';
import { ImageAttach } from '@/components/upload/image-attach';
import { resolveWallpaper } from '@/config/chat-wallpapers';
import { useApiClient } from '@/hooks/use-api';
import { useChatStream } from '@/hooks/use-chat-stream';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useLongPress } from '@/hooks/use-long-press';
import { useVoiceRecorder, isVoiceRecordingSupported } from '@/hooks/use-voice-recorder';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDayLabel, formatUzTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { useCall } from '@/modules/call/call-provider';
import { callSummaryText, type CallView } from '@/modules/call/call.types';
import {
  DELETED_MESSAGE_TEXT,
  peerStatusText,
  quotePreview,
  statusMark,
  type MessageView,
  type SendMessageResponse,
} from '@/modules/chat/chat.types';

export interface ThreadContentProps {
  conversationId: string;
}

/** "Yozmoqda" belgisi shuncha oraliqda yangilanadi. */
const TYPING_PING_MS = 3_000;

/**
 * Pastdan shuncha piksel ichida bo'lsa "pastdaman" hisoblanadi.
 *
 * Aniq nol qilinsa, brauzerlarning kasrli o'lchovi tufayli u deyarli
 * hech qachon bajarilmasdi va "pastga tushish" tugmasi ko'rinib
 * turaverardi.
 */
const BOTTOM_THRESHOLD_PX = 80;

/** Havola bosilganda asl xabar shuncha vaqt yoritiladi. */
const HIGHLIGHT_MS = 1_400;

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

  /** Javob berilayotgan xabar — yozish maydoni ustida ko'rinadi. */
  const [replyTo, setReplyTo] = useState<MessageView | null>(null);

  /** Tahrirlanayotgan xabar. Bo'lsa, yozish maydoni shuni o'zgartiradi. */
  const [editing, setEditing] = useState<MessageView | null>(null);

  /** Amallar varag'i ochilgan xabar. */
  const [actionsFor, setActionsFor] = useState<MessageView | null>(null);

  /** O'chirish tasdig'i so'ralayotgan xabar. */
  const [deleteFor, setDeleteFor] = useState<MessageView | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Tahrirlangan xabarlarning YANGI ko'rinishi.
   *
   * ── Nima uchun kerak ────────────────────────────────────────────────
   * Tahrir serverga darhol yetadi, lekin xabarning o'zi jonli oqimdan
   * keladi va oqim bir yarim soniyada bir marta tekshiradi. Usiz
   * o'sha oraliqda ekranda ESKI matn turardi va odam "saqlanmadi"
   * deb o'ylab, ikkinchi marta tahrirlashga urinardi.
   */
  const [edited, setEdited] = useState<Record<string, MessageView>>({});

  /** Iqtibos bosilganda asl xabar qisqa vaqt yoritiladi. */
  const [highlightId, setHighlightId] = useState<string | null>(null);

  /** "Pastga tushish" tugmasi ko'rinadimi. */
  const [showScrollDown, setShowScrollDown] = useState(false);

  const image = useFileUpload('CHAT');
  const voiceUpload = useFileUpload('VOICE');
  const recorder = useVoiceRecorder();

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingAt = useRef(0);
  const readMarkedFor = useRef<string | null>(null);

  /**
   * Ro'yxat pastida turibmizmi.
   *
   * ── Nima uchun REF, holat emas ──────────────────────────────────────
   * Bu qiymat faqat "yangi xabarda pastga suraymizmi?" degan qarorda
   * ishlatiladi. Holat qilinsa, u effekt bog'lanishlariga tushib,
   * har surishda qayta chizishga sabab bo'lardi.
   */
  const isAtBottomRef = useRef(true);

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
    ? [
        ...thread.messages.map((real) => applyEdit(real, edited[real.id])),
        ...pending.filter((item) => !thread.messages.some((real) => real.id === item.id)),
      ]
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
   * ── Nima uchun HAR DOIM emas ────────────────────────────────────────
   * Odam eski xabarlarni o'qib turgan bo'lishi mumkin. Shunda yangi
   * xabar kelishi bilan ekran pastga sakrab, o'qilayotgan joy
   * yo'qolardi — bu eng bezovta qiladigan xatolardan biri.
   *
   * Shuning uchun faqat PASTDA turganda suriladi. Yuqorida bo'lsa,
   * o'rniga "pastga tushish" tugmasi ko'rinadi.
   */
  useEffect(() => {
    if (!isAtBottomRef.current) return;

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

  /** Surilganda holatni yangilaymiz. */
  function handleScroll(event: UIEvent<HTMLDivElement>): void {
    const element = event.currentTarget;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    const isAtBottom = distance <= BOTTOM_THRESHOLD_PX;

    isAtBottomRef.current = isAtBottom;
    setShowScrollDown(!isAtBottom);
  }

  function scrollToBottom(): void {
    isAtBottomRef.current = true;
    setShowScrollDown(false);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  /**
   * Iqtibos bosilganda asl xabarga o'tadi.
   *
   * Uzun suhbatda "nimaga javob berilgan?" degan savol shu bilan
   * yopiladi: bir bosishda asl xabar ko'rinadi va qisqa vaqt
   * yoritiladi — ko'z uni darhol topadi.
   */
  function jumpToMessage(messageId: string): void {
    const element = listRef.current?.querySelector(`[data-message-id="${messageId}"]`);

    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(messageId);

    setTimeout(() => setHighlightId((current) => (current === messageId ? null : current)), HIGHLIGHT_MS);
  }

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

  /** Javob berishni boshlaydi. */
  function beginReply(message: MessageView): void {
    setActionsFor(null);
    setEditing(null);
    setReplyTo(message);
    composerRef.current?.focus();
  }

  /** Tahrirlashni boshlaydi — matn yozish maydoniga qo'yiladi. */
  function beginEdit(message: MessageView): void {
    setActionsFor(null);
    setReplyTo(null);
    setEditing(message);
    setDraft(message.body);
    composerRef.current?.focus();
  }

  /** Tahrirni bekor qiladi va yozilgan matnni tashlaydi. */
  function cancelEdit(): void {
    setEditing(null);
    setDraft('');
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteFor) return;

    setIsDeleting(true);
    setError(null);

    try {
      await request(`/api/v1/chat/conversations/${conversationId}/messages/${deleteFor.id}`, {
        method: 'DELETE',
      });

      /**
       * Tahrir nusxasi ham TOZALANADI.
       *
       * Aks holda o'chirilgan xabar o'rnida eski tahrirlangan matn
       * ko'rinib turardi — ya'ni "o'chirdim" degani yolg'on bo'lardi.
       */
      setEdited((current) => {
        const next = { ...current };
        delete next[deleteFor.id];

        return next;
      });

      // Shu xabarga javob yozilayotgan bo'lsa, iqtibos ham ketadi.
      setReplyTo((current) => (current?.id === deleteFor.id ? null : current));

      if (editing?.id === deleteFor.id) cancelEdit();

      setDeleteFor(null);
    } catch (caught) {
      setError(toUserMessage(caught));
      setDeleteFor(null);
    } finally {
      setIsDeleting(false);
    }
  }

  /**
   * Yozib olingan ovozni yuboradi.
   *
   * ── Nima uchun vaqtinchalik xabar YO'Q ───────────────────────────────
   * Matn va rasmda nusxa darhol ekranda paydo bo'ladi. Ovozda esa
   * fayl avval yuklanishi kerak va bu bir necha soniya olishi mumkin.
   * Nusxa qo'yilsa, u tinglab bo'lmaydigan holatda turardi — bu esa
   * "buzilgan" degan taassurot berardi.
   *
   * Shuning uchun tugma "yuborilmoqda" holatiga o'tadi va xabar
   * tayyor bo'lgach paydo bo'ladi.
   */
  async function sendVoice(): Promise<void> {
    if (isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const recording = await recorder.stop();

      if (!recording) {
        setError("Ovoz yozilmadi. Qaytadan urinib ko'ring.");

        return;
      }

      /**
       * `Blob` dan `File` yasaymiz: yuklash maydoni nom kutadi.
       * Nom faqat kengaytma uchun kerak — serverda u ishlatilmaydi.
       */
      const extension = recording.blob.type.includes('mp4') ? 'm4a' : 'webm';
      const file = new File([recording.blob], `ovoz.${extension}`, { type: recording.blob.type });

      const url = await voiceUpload.upload(file);

      if (!url) {
        setError(voiceUpload.error ?? "Ovozni yuklab bo'lmadi.");

        return;
      }

      await request<SendMessageResponse>(`/api/v1/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: {
          body: '',
          voiceUrl: url,
          voiceSeconds: recording.seconds,
          ...(replyTo ? { replyToId: replyTo.id } : {}),
        },
      });

      setReplyTo(null);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  /** Tahrirni saqlaydi. */
  async function saveEdit(message: MessageView, body: string): Promise<void> {
    setIsSending(true);
    setError(null);

    try {
      const result = await request<SendMessageResponse>(
        `/api/v1/chat/conversations/${conversationId}/messages/${message.id}`,
        { method: 'PATCH', body: { body } },
      );

      setEdited((current) => ({ ...current, [message.id]: result.message }));
      setEditing(null);
      setDraft('');
    } catch (caught) {
      // Yozilgan matn yo'qolmasin — odam uni qaytadan terishi kerak emas.
      setDraft(body);
      setError(toUserMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  async function send(event: FormEvent): Promise<void> {
    event.preventDefault();

    const body = draft.trim();
    const attached = imageUrl;

    if (isSending || image.isUploading) return;

    /**
     * Tahrir rejimida BOSHQA yo'l bilan yuboriladi.
     *
     * Bu yerda tekshirilishi shart: yozish maydoni ikkala holatda ham
     * bitta va tugmasi ham bitta.
     */
    if (editing) {
      if (!body) return;

      await saveEdit(editing, body);

      return;
    }

    // Rasm o'zi ham xabar: matn shart emas.
    if (!body && !attached) return;

    const quoted = replyTo;

    setIsSending(true);
    setError(null);
    setDraft('');
    setImageUrl(null);
    setReplyTo(null);

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
      voiceUrl: null,
      voiceSeconds: null,
      replyTo: quoted
        ? {
            id: quoted.id,
            authorName: quoted.isMine ? 'Siz' : (thread?.peer.name ?? 'Foydalanuvchi'),
            preview: quotePreview(
              quoted.body,
              quoted.voiceUrl ? 'VOICE' : quoted.imageUrl ? 'IMAGE' : 'TEXT',
              quoted.isDeleted,
            ),
            isDeleted: quoted.isDeleted,
          }
        : null,
      editedAt: null,
      isMine: true,
      createdAt: new Date().toISOString(),
      status: 'SENT',
      isDeleted: false,
    };

    setPending((current) => [...current, temporary]);

    // Yangi xabar yozilganda doim pastga tushamiz — u ko'rinishi kerak.
    isAtBottomRef.current = true;

    try {
      const result = await request<SendMessageResponse>(`/api/v1/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: {
          body,
          ...(attached ? { imageUrl: attached } : {}),
          ...(quoted ? { replyToId: quoted.id } : {}),
        },
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
      // Yozilgan matn, biriktirilgan rasm va iqtibos yo'qolmasin.
      setDraft(body);
      setImageUrl(attached);
      setReplyTo(quoted);
      setError(toUserMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  /**
   * Brauzer ovoz yozishni qo'llab-quvvatlaydimi.
   *
   * ── Nima uchun `useSyncExternalStore` ───────────────────────────────
   * Tekshiruv `window` va `MediaRecorder` ga qaraydi — ular serverda
   * yo'q. To'g'ridan-to'g'ri hisoblansa, server "yo'q" deb chizardi,
   * brauzer esa "bor" deb, va React bu farqni xato deb hisoblardi
   * (hydration mismatch).
   *
   * Bu hook aynan shu holat uchun: u serverga va brauzerga ALOHIDA
   * javob berish imkonini beradi. Effekt ichida holat o'zgartirish
   * ham mumkin edi, lekin u ortiqcha qayta chizishga olib keladi va
   * React uni ataylab man qiladi.
   */
  const canRecord = useSyncExternalStore(
    // Qiymat hech qachon o'zgarmaydi — obuna bo'sh.
    () => () => undefined,
    isVoiceRecordingSupported,
    () => false,
  );

  const peer = thread?.peer ?? null;

  /** Qo'ng'iroq faqat odam bilan suhbatda va suhbat yuklangach mumkin. */
  const canCall = peer?.kind === 'DIRECT';

  const wallpaper = resolveWallpaper(thread?.wallpaper);

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

        Fon SHU YERDA: u butun kenglikni egallashi kerak, xabarlar
        ro'yxati esa o'qish qulay bo'lishi uchun markazda va tor.

        `min-h-0` shart: usiz flex bolasi o'z mazmuniga qarab cho'zilib,
        surish ichkarida emas, butun oynada sodir bo'lardi.
      */}
      <div className={cn('relative min-h-0 flex-1', wallpaper.className)}>
        <div ref={listRef} onScroll={handleScroll} className="mx-auto h-full max-w-lg overflow-y-auto px-4 py-4">
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
            {timeline.map((item) => {
              if (item.type === 'day') {
                return (
                  <li key={`day-${item.key}`} className="flex justify-center py-2">
                    {/*
                      Kun ajratkichi fon ustida ham o'qilishi kerak,
                      shuning uchun o'z fonchasi bor.
                    */}
                    <span className="glass text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">
                      {item.label}
                    </span>
                  </li>
                );
              }

              if (item.type === 'call') {
                return (
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
                );
              }

              return (
                <MessageBubble
                  key={item.message.id}
                  message={item.message}
                  isHighlighted={highlightId === item.message.id}
                  onOpenActions={() => setActionsFor(item.message)}
                  onQuoteClick={jumpToMessage}
                />
              );
            })}
          </ul>

          {thread?.isPeerTyping && (
            <p className="text-muted-foreground mt-2 text-xs" aria-live="polite">
              {`${thread.peer.name} yozmoqda...`}
            </p>
          )}

          <div ref={bottomRef} />
        </div>

        {/*
          "Pastga tushish" tugmasi.

          Eski xabarlarni o'qib turganda yangi xabar kelsa, ekran
          sakramaydi (yuqoriga qarang) — lekin odam suhbatning
          oxiriga tez qaytishi kerak. Uzun suhbatda barmoq bilan
          surish o'nlab harakat degani.
        */}
        {showScrollDown && (
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label="Oxirgi xabarlarga tushish"
            className="glass animate-fade-in absolute right-4 bottom-4 flex size-10 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
          >
            <ArrowDown className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Yozish maydoni — DOIM pastda, qimirlamaydi */}
      <form
        onSubmit={send}
        className="glass-chrome shrink-0 border-t"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/*
          Javob yoki tahrir belgisi — yozish maydonining USTIDA.

          Odam nima qilayotganini ko'rib turishi kerak: aks holda
          "javob bermoqchi edim, oddiy xabar ketdi" degan holat
          tez-tez uchrardi.
        */}
        {!recorder.isRecording && (replyTo || editing) && (
          <div className="border-border/60 mx-auto flex max-w-lg items-center gap-2.5 border-b px-3 py-2">
            {editing ? (
              <Pencil className="text-primary size-4 shrink-0" aria-hidden="true" />
            ) : (
              <CornerUpLeft className="text-primary size-4 shrink-0" aria-hidden="true" />
            )}

            <div className="min-w-0 flex-1">
              <p className="text-primary text-xs font-medium">
                {editing ? 'Tahrirlanmoqda' : `Javob: ${quoteAuthor(replyTo, thread?.peer.name)}`}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {editing
                  ? editing.body
                  : quotePreview(
                      replyTo?.body ?? '',
                      replyTo?.voiceUrl ? 'VOICE' : replyTo?.imageUrl ? 'IMAGE' : 'TEXT',
                      replyTo?.isDeleted ?? false,
                    )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => (editing ? cancelEdit() : setReplyTo(null))}
              aria-label={editing ? 'Tahrirni bekor qilish' : 'Javobni bekor qilish'}
              className="hover:bg-secondary inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="mx-auto flex max-w-lg items-end gap-2 px-3 py-2.5">
          {recorder.isRecording ? (
            <VoiceRecorderBar
              seconds={recorder.seconds}
              isSending={isSending}
              onCancel={recorder.cancel}
              onSend={() => void sendVoice()}
            />
          ) : (
            <>
              {/*
                Tahrir rejimida rasm biriktirish YO'Q: tahrirlash faqat
                matnni o'zgartiradi.
              */}
              {!editing && (
                <ImageAttach
                  value={imageUrl}
                  isUploading={image.isUploading}
                  disabled={isSending}
                  onSelect={(file) => void attachImage(file)}
                  onRemove={() => setImageUrl(null)}
                  className="shrink-0"
                />
              )}

              <textarea
                ref={composerRef}
                value={draft}
                onChange={(event) => handleDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  // Telefonda Enter yangi qator, kompyuterda yuborish.
                  if (event.key === 'Enter' && !event.shiftKey && window.innerWidth >= 640) {
                    void send(event);
                  }

                  // Escape — tahrir yoki javobdan chiqish.
                  if (event.key === 'Escape') {
                    if (editing) cancelEdit();
                    else setReplyTo(null);
                  }
                }}
                placeholder={editing ? 'Xabarni tahrirlang...' : 'Xabar yozing...'}
                aria-label={editing ? 'Xabar matnini tahrirlash' : 'Xabar matni'}
                rows={1}
                className="bg-card/60 border-border focus-visible:ring-ring max-h-32 min-h-11 flex-1 resize-none rounded-2xl border px-4 py-2.5 text-base outline-none focus-visible:ring-2"
              />

              {/*
            Matn bo'sh bo'lsa MIKROFON, aks holda YUBORISH ko'rinadi.

            ── Nima uchun ikkalasi bir joyda ──────────────────────────
            Telefon ekranida joy kam. Ikkala tugma yonma-yon tursa,
            ular kichrayadi va noto'g'ri bosish osonlashadi.

            Bu yechim barcha mashhur chat ilovalarida qo'llaniladi va
            odamlarga tanish.
          */}
              {canRecord && !editing && !draft.trim() && !imageUrl ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={isSending}
                  onClick={() => void recorder.start()}
                  aria-label="Ovozli xabar yozish"
                  className="text-muted-foreground hover:text-foreground shrink-0 rounded-full"
                >
                  <Mic className="size-5" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={(!draft.trim() && !imageUrl) || isSending || image.isUploading}
                  aria-label={editing ? 'Tahrirni saqlash' : 'Yuborish'}
                  className="shrink-0 rounded-full"
                >
                  <SendHorizontal className="size-5" aria-hidden="true" />
                </Button>
              )}
            </>
          )}
        </div>

        {(image.error || recorder.error || voiceUpload.error) && (
          <p className="text-destructive px-4 pb-2 text-xs" role="alert">
            {image.error ?? recorder.error ?? voiceUpload.error}
          </p>
        )}

        {/*
          Ulanish uzilganini YASHIRMAYMIZ: odam xabari yetmayotganini
          bilishi kerak.
        */}
        {thread && !isLive && <p className="text-muted-foreground pb-2 text-center text-xs">Qayta ulanmoqda...</p>}
      </form>

      {/*
        Amallar varag'i FAQAT kerak bo'lganda chiziladi.

        Doim turgan, lekin yashirin komponent har xabar uchun bittadan
        bo'lardi — yuzta xabarli suhbatda yuzta ochilmagan oyna.
      */}
      {actionsFor && (
        <MessageActions
          message={actionsFor}
          onReply={() => beginReply(actionsFor)}
          onEdit={() => beginEdit(actionsFor)}
          onDelete={() => {
            setDeleteFor(actionsFor);
            setActionsFor(null);
          }}
          onClose={() => setActionsFor(null)}
        />
      )}

      <ConfirmDialog
        open={deleteFor !== null}
        title="Xabarni o'chirish"
        description="Xabar ikkala tomonda ham o'chadi. Uni qaytarib bo'lmaydi."
        confirmLabel="O'chirish"
        isDestructive
        isLoading={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteFor(null)}
      />
    </div>
  );
}

/** Iqtibosdagi ism: o'zimniki bo'lsa "Siz". */
function quoteAuthor(message: MessageView | null, peerName: string | undefined): string {
  if (!message) return '';

  return message.isMine ? 'Siz' : (peerName ?? 'Foydalanuvchi');
}

/**
 * Tahrirlangan nusxani qo'llaydi.
 *
 * ── Nima uchun SHART bilan ──────────────────────────────────────────
 * Oqimdan kelgan xabar nusxadan yangiroq bo'lsa (`editedAt` kattaroq),
 * nusxa eskirgan — u qo'llanmasligi kerak. O'chirilgan xabarda ham
 * shunday: eski matn qaytib chiqmasligi kerak.
 */
function applyEdit(real: MessageView, patch: MessageView | undefined): MessageView {
  if (!patch || real.isDeleted) return real;

  if (real.editedAt && patch.editedAt && real.editedAt >= patch.editedAt) return real;

  return patch;
}

/**
 * Xabarlar, qo'ng'iroqlar va kun ajratkichlarini bitta ro'yxatga qo'shadi.
 *
 * Xabar va qo'ng'iroq ikkalasi ham ISO vaqtga ega, shuning uchun
 * taqqoslash oddiy matn taqqoslash bilan bajariladi — sana obyektlarini
 * yaratish shart emas.
 */
type TimelineItem =
  | { type: 'message'; message: MessageView }
  | { type: 'call'; call: CallView }
  | { type: 'day'; key: string; label: string };

function buildTimeline(messages: MessageView[], calls: CallView[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...messages.map((message): TimelineItem => ({ type: 'message', message })),
    ...calls.map((call): TimelineItem => ({ type: 'call', call })),
  ];

  items.sort((a, b) => itemTime(a).localeCompare(itemTime(b)));

  /**
   * Kun ajratkichlari SARALASHDAN KEYIN qo'shiladi.
   *
   * Oldin qo'shilsa, ular ham saralashda qatnashib, noto'g'ri joyga
   * tushib qolardi.
   */
  const result: TimelineItem[] = [];

  let lastLabel: string | null = null;

  for (const item of items) {
    const time = itemTime(item);
    const label = formatUzDayLabel(time);

    if (label !== lastLabel) {
      lastLabel = label;
      result.push({ type: 'day', key: time.slice(0, 10), label });
    }

    result.push(item);
  }

  return result;
}

/** Element vaqt chizig'idagi o'rnini belgilaydigan vaqt. */
function itemTime(item: TimelineItem): string {
  if (item.type === 'message') return item.message.createdAt;
  if (item.type === 'call') return item.call.startedAt;

  return item.key;
}

interface MessageBubbleProps {
  message: MessageView;
  isHighlighted: boolean;
  onOpenActions: () => void;
  onQuoteClick: (messageId: string) => void;
}

/** Bitta xabar puffagi. */
function MessageBubble({ message, isHighlighted, onOpenActions, onQuoteClick }: MessageBubbleProps) {
  /**
   * Amallar UZOQ BOSISH bilan ochiladi.
   *
   * Har puffak yoniga uch nuqtali tugma qo'yish ham mumkin edi, lekin
   * u suhbatni belgilar bilan to'ldirardi va tor ekranda matn joyini
   * yeb qo'yardi.
   *
   * ── Nima uchun vaqtinchalik xabarda ISHLAMAYDI ──────────────────────
   * Uning `id` si hali haqiqiy emas — o'chirish yoki tahrirlash
   * so'rovi "topilmadi" bilan tugardi.
   */
  const isReady = !message.id.startsWith('pending-') && !message.isDeleted;
  const longPress = useLongPress(onOpenActions);

  return (
    <li
      data-message-id={message.id}
      className={cn('flex scroll-mt-4', message.isMine ? 'justify-end' : 'justify-start')}
    >
      <div
        {...(isReady ? longPress : {})}
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2 transition-shadow',
          message.isMine
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-secondary text-secondary-foreground rounded-bl-md',
          // Iqtibosdan o'tilganda xabar qisqa vaqt ajralib turadi.
          isHighlighted && 'ring-primary ring-2 ring-offset-2 ring-offset-transparent',
        )}
      >
        {/*
          Iqtibos — javob berilgan xabar.

          Bosilganda asl xabarga o'tadi. Bu WhatsApp va Telegram'da ham
          shunday va odamlar buni kutadi.
        */}
        {message.replyTo && (
          <button
            type="button"
            onClick={() => onQuoteClick(message.replyTo!.id)}
            className={cn(
              'mb-1.5 block w-full rounded-lg border-l-2 px-2 py-1 text-left',
              message.isMine ? 'border-white/60 bg-white/15' : 'border-primary bg-background/60',
            )}
          >
            <span
              className={cn(
                'block text-[0.6875rem] font-semibold',
                message.isMine ? 'text-white/90' : 'text-primary',
              )}
            >
              {message.replyTo.authorName}
            </span>
            <span
              className={cn(
                'block truncate text-xs',
                message.isMine ? 'text-white/75' : 'text-muted-foreground',
                message.replyTo.isDeleted && 'italic',
              )}
            >
              {message.replyTo.preview}
            </span>
          </button>
        )}

        {message.voiceUrl && message.voiceSeconds !== null && (
          <VoicePlayer url={message.voiceUrl} seconds={message.voiceSeconds} isMine={message.isMine} />
        )}

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
            {message.isDeleted ? DELETED_MESSAGE_TEXT : message.body}
          </p>
        )}

        <p
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[0.6875rem]',
            message.isMine ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          {/*
            "tahrirlangan" belgisi — MAJBURIY.

            Usiz matnni bilinmasdan o'zgartirish mumkin bo'lardi va
            suhbatdosh o'zi o'qigan gapga ishonch yo'qotardi.
          */}
          {message.editedAt && !message.isDeleted && <span>tahrirlangan</span>}

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
