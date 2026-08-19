'use client';

import { BadgeCheck, Bell, BellOff, Radio, Square, Trash2, Video } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  LIVE_DESCRIPTION_MAX_LENGTH,
  LIVE_MIN_LEAD_MINUTES,
  LIVE_STATUS_LABELS,
  LIVE_TITLE_MAX_LENGTH,
  MAX_SCHEDULED_LIVES,
  type LiveStatus,
} from '@/config/live';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { RequireAuth } from '@/modules/auth/require-auth';
import { authorDisplayName } from '@/modules/feed/feed.types';
import type { LiveStreamView } from '@/modules/live/live.service';

/**
 * Jonli efir e'lonlari.
 *
 * ── Nima uchun efirning O'ZI hali yo'q ────────────────────────────────
 * Video oqimi alohida katta ish: media server, tarmoq kanallari va
 * ularning puli. Uni hozir qurish erta — avval lentada odam
 * yig'ilishi kerak.
 *
 * Lekin efirning ENG QIYIN qismi texnika emas: odamlarni aynan o'sha
 * vaqtda ekran oldiga yig'ish. Bloger "bugun soat 20:00 da efir" deb
 * yozadi va uni hech kim ko'rmaydi.
 *
 * Shu sababdan avval o'sha qism quriladi. Efirning o'zi qo'shilganda,
 * tomoshabin allaqachon tayyor bo'ladi.
 */
export function LiveContent() {
  return (
    <RequireAuth>
      <LiveBody />
    </RequireAuth>
  );
}

interface StreamsResponse {
  streams: LiveStreamView[];
}

function LiveBody() {
  const request = useApiClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: loadError, reload, setData } =
    useApiQuery<StreamsResponse>('/api/v1/live');

  const streams = data?.streams ?? [];
  const isEmpty = !isLoading && !loadError && streams.length === 0;

  /** Ro'yxatdagi bitta efirni serverga murojaat qilmasdan yangilaydi. */
  function patch(streamId: string, changes: Partial<LiveStreamView>) {
    setData((current) => ({
      streams: (current?.streams ?? []).map((item) =>
        item.id === streamId ? { ...item, ...changes } : item,
      ),
    }));
  }

  async function toggleReminder(stream: LiveStreamView) {
    if (busyId) return;

    setBusyId(stream.id);
    setError(null);

    try {
      const result = await request<{ isReminded: boolean; reminderCount: number }>(
        `/api/v1/live/${stream.id}/reminder`,
        { method: stream.isReminded ? 'DELETE' : 'POST', ...(stream.isReminded ? {} : { body: {} }) },
      );

      patch(stream.id, result);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function changeStatus(stream: LiveStreamView, status: LiveStatus) {
    if (busyId) return;

    setBusyId(stream.id);
    setError(null);

    try {
      const result = await request<{ stream: LiveStreamView }>(`/api/v1/live/${stream.id}/status`, {
        method: 'PUT',
        body: { status },
      });

      patch(stream.id, result.stream);
    } catch (caught) {
      setError(toUserMessage(caught));

      /*
        Xatodan keyin ro'yxat QAYTA o'qiladi.

        Xatoning eng ehtimolli sababi — holat boshqa qurilmadan
        allaqachon o'zgargani. Ekrandagi eski holat qolib ketsa,
        odam yana o'sha tugmani bosib, yana xato olardi.
      */
      reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AppHeader title="Jonli efirlar" showBack backHref="/feed" />

      <div className="space-y-4 px-4 pt-4 pb-24">
        {/*
          Halol ogohlantirish — ENG TEPADA.

          ── Nima uchun buni yashirmaymiz ──────────────────────────
          Odam "Jonli efir" yozuvini ko'rib, video kutadi. Kutgani
          chiqmasa, u ilovani buzuq deb hisoblaydi.

          Nima ishlashini va nima hali yo'qligini ochiq aytish esa
          ishonchni saqlaydi.
        */}
        <Alert variant="info" title="Efir e'lonlari">
          Hozircha efirning o&apos;zi Navix ichida ko&apos;rsatilmaydi: bu bo&apos;lim e&apos;lon qilish va
          eslatma uchun. Efir vaqti kelganda sizga xabar keladi.
        </Alert>

        {error && <Alert variant="error">{error}</Alert>}
        {loadError && (
          <Alert variant="error" title="Efirlarni yuklab bo'lmadi">
            {loadError}
          </Alert>
        )}

        <Button fullWidth onClick={() => setIsFormOpen((current) => !current)}>
          <Video className="size-4" aria-hidden="true" />
          {isFormOpen ? 'Yopish' : "Efir e'lon qilish"}
        </Button>

        {isFormOpen && (
          <LiveForm
            onCreated={(stream) => {
              setIsFormOpen(false);
              setData((current) => ({ streams: [stream, ...(current?.streams ?? [])] }));
            }}
          />
        )}

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        )}

        {isEmpty && (
          <EmptyState
            icon={Radio}
            title="Hozircha efir yo'q"
            description="Birinchi bo'lib efir e'lon qiling — obunachilaringiz eslatma qo'yadi va vaqti kelganda xabar oladi."
          />
        )}

        <ul className="space-y-3">
          {streams.map((stream) => (
            <li key={stream.id}>
              <StreamCard
                stream={stream}
                isBusy={busyId === stream.id}
                onToggleReminder={() => void toggleReminder(stream)}
                onChangeStatus={(status) => void changeStatus(stream, status)}
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/** Bitta efir kartochkasi. */
function StreamCard({
  stream,
  isBusy,
  onToggleReminder,
  onChangeStatus,
}: {
  stream: LiveStreamView;
  isBusy: boolean;
  onToggleReminder: () => void;
  onChangeStatus: (status: LiveStatus) => void;
}) {
  const isLive = stream.status === 'LIVE';
  const isOver = stream.status === 'ENDED' || stream.status === 'CANCELLED';

  return (
    <div
      className={cn(
        'bg-card border-border rounded-2xl border p-4',
        isLive && 'border-destructive/40',
      )}
    >
      <div className="flex items-start gap-3">
        <Link href={`/u/${stream.host.username}`} className="shrink-0">
          <Avatar src={stream.host.avatarUrl} name={stream.host.fullName} size="md" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/u/${stream.host.username}`}
              className="truncate text-sm font-semibold hover:underline"
            >
              {authorDisplayName(stream.host)}
            </Link>

            {stream.host.isVerified && (
              <BadgeCheck className="text-primary size-4 shrink-0" aria-label="Tasdiqlangan profil" />
            )}

            {/*
              "Efirda" belgisi — KO'ZGA TASHLANADIGAN.

              Bu yagona holat "hozir kirish mumkin" degani. Qolgan
              holatlar kulrang: ular ma'lumot, chaqiruv emas.
            */}
            {isLive && (
              <span className="bg-destructive flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white">
                <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                {LIVE_STATUS_LABELS.LIVE}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm leading-relaxed font-medium break-words">{stream.title}</p>

          {stream.description && (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed break-words">
              {stream.description}
            </p>
          )}

          <p className="text-muted-foreground mt-2 text-xs">
            {isOver
              ? LIVE_STATUS_LABELS[stream.status]
              : formatUzDateTime(stream.scheduledAt, 'long')}
            {stream.reminderCount > 0 && ` · ${stream.reminderCount} ta eslatma`}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {/*
          Eslatma — FAQAT begona efirda.

          O'z efiriga eslatma qo'yish kulgili bo'lardi: bloger
          o'zi boshlaydi va o'ziga xabar kelishi keraksiz.
        */}
        {!stream.isMine && !isOver && (
          <Button variant={stream.isReminded ? 'outline' : 'primary'} size="sm" disabled={isBusy} onClick={onToggleReminder}>
            {stream.isReminded ? (
              <BellOff className="size-4" aria-hidden="true" />
            ) : (
              <Bell className="size-4" aria-hidden="true" />
            )}
            {stream.isReminded ? "Eslatma qo'yilgan" : "Eslatib qo'y"}
          </Button>
        )}

        {stream.isMine && stream.status === 'SCHEDULED' && (
          <>
            <Button size="sm" disabled={isBusy} onClick={() => onChangeStatus('LIVE')}>
              <Radio className="size-4" aria-hidden="true" />
              Efirni boshlash
            </Button>

            <Button variant="ghost" size="sm" disabled={isBusy} onClick={() => onChangeStatus('CANCELLED')}>
              <Trash2 className="size-4" aria-hidden="true" />
              Bekor qilish
            </Button>
          </>
        )}

        {stream.isMine && isLive && (
          <Button variant="outline" size="sm" disabled={isBusy} onClick={() => onChangeStatus('ENDED')}>
            <Square className="size-4" aria-hidden="true" />
            Efirni tugatish
          </Button>
        )}
      </div>
    </div>
  );
}

/** Yangi efir e'loni. */
function LiveForm({ onCreated }: { onCreated: (stream: LiveStreamView) => void }) {
  const request = useApiClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (isSending || title.trim().length === 0 || when.length === 0) return;

    setIsSending(true);
    setError(null);

    try {
      const result = await request<{ stream: LiveStreamView }>('/api/v1/live', {
        method: 'POST',
        body: {
          title: title.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          /*
            Vaqt UTC ga aylantiriladi.

            `datetime-local` maydoni telefondagi MAHALLIY vaqtni
            beradi va u vaqt mintaqasini o'z ichiga olmaydi. To'g'ridan
            to'g'ri yuborilsa, server uni UTC deb o'qib, efirni besh
            soat oldinga surib yuborardi.
          */
          scheduledAt: new Date(when).toISOString(),
        },
      });

      onCreated(result.stream);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="bg-card border-border space-y-3 rounded-2xl border p-4">
      <div>
        <label htmlFor="live-title" className="mb-1.5 block text-xs font-medium">
          Nima haqida?
        </label>

        <Input
          id="live-title"
          value={title}
          maxLength={LIVE_TITLE_MAX_LENGTH}
          disabled={isSending}
          placeholder="Masalan: Osh pishirish sirlari"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="live-when" className="mb-1.5 block text-xs font-medium">
          Qachon?
        </label>

        <Input
          id="live-when"
          type="datetime-local"
          value={when}
          disabled={isSending}
          onChange={(event) => setWhen(event.target.value)}
        />

        <p className="text-muted-foreground mt-1 text-xs">
          {`Kamida ${LIVE_MIN_LEAD_MINUTES} daqiqadan keyin. Bir vaqtda ${MAX_SCHEDULED_LIVES} tagacha efir rejalashtirish mumkin.`}
        </p>
      </div>

      <div>
        <label htmlFor="live-description" className="mb-1.5 block text-xs font-medium">
          Qo&apos;shimcha izoh (ixtiyoriy)
        </label>

        <Textarea
          id="live-description"
          value={description}
          maxLength={LIVE_DESCRIPTION_MAX_LENGTH}
          rows={3}
          disabled={isSending}
          placeholder="Efirda nimalar bo'ladi?"
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Button
        fullWidth
        isLoading={isSending}
        loadingText="Yuborilmoqda..."
        disabled={title.trim().length === 0 || when.length === 0}
        onClick={() => void submit()}
      >
        E&apos;lon qilish
      </Button>
    </div>
  );
}
