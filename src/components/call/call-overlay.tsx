'use client';

import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useCall } from '@/modules/call/call-provider';
import { callStatusText, formatCallDuration, isCallOver } from '@/modules/call/call.types';

/**
 * Qo'ng'iroq ekrani.
 *
 * ── Nima uchun butun ekranni egallaydi ────────────────────────────────
 * Qo'ng'iroq — ilovadagi eng ustuvor amal. U kichik oynada ko'rsatilsa,
 * odam adashib boshqa tugmani bosib qo'yardi va suhbat uzilardi.
 *
 * ── Nima uchun ekran O'ZI yo'qolmaydi ─────────────────────────────────
 * Tugagandan keyin ekran bir-ikki soniya turadi va natijani ko'rsatadi
 * ("Rad etildi", "Javob berilmadi"). Darhol yo'qolsa, odam nima
 * bo'lganini bilmay qolardi.
 */
export function CallOverlay() {
  const { call, isConnecting, isMuted, elapsedSeconds, error, accept, hangUp, toggleMute } = useCall();

  if (!call) return null;

  const isIncomingRing = call.status === 'RINGING' && !call.isOutgoing;
  const isOutgoingRing = call.status === 'RINGING' && call.isOutgoing;
  const isActive = call.status === 'ACTIVE';
  const isOver = isCallOver(call.status);

  const statusLine = isOutgoingRing
    ? 'Chalinmoqda...'
    : isIncomingRing
      ? "Kiruvchi qo'ng'iroq"
      : isActive
        ? isConnecting
          ? 'Ulanmoqda...'
          : formatCallDuration(elapsedSeconds)
        : callStatusText(call.status);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Qo'ng'iroq"
      className="bg-background/95 fixed inset-0 z-[100] flex flex-col backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Suhbatdosh */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
        <div className="relative">
          {/*
            Chalinayotganda avatar atrofida to'lqin — ovozsiz rejimda
            ham qo'ng'iroq kelayotgani ko'rinib turishi uchun.
          */}
          {!isOver && (
            <span
              aria-hidden="true"
              className={cn(
                'bg-primary/20 absolute inset-0 rounded-full',
                call.status === 'RINGING' && 'animate-ping',
              )}
            />
          )}

          <Avatar src={call.peer.avatarUrl} name={call.peer.name} size="xl" className="relative" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{call.peer.name}</h1>

          <p
            className={cn(
              'text-base tabular-nums',
              isActive && !isConnecting ? 'text-primary font-medium' : 'text-muted-foreground',
            )}
            aria-live="polite"
          >
            {statusLine}
          </p>

          <p className="text-muted-foreground text-xs">Ovozli qo&apos;ng&apos;iroq</p>
        </div>

        {error && <p className="text-destructive max-w-xs text-sm leading-relaxed">{error}</p>}
      </div>

      {/* Boshqaruv tugmalari */}
      <div className="flex items-center justify-center gap-6 px-8 pb-14">
        {isActive && (
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Mikrofonni yoqish' : "Mikrofonni o'chirish"}
            aria-pressed={isMuted}
            className={cn(
              'flex size-16 items-center justify-center rounded-full transition-colors',
              isMuted ? 'bg-foreground text-background' : 'bg-secondary text-secondary-foreground',
            )}
          >
            {isMuted ? (
              <MicOff className="size-6" aria-hidden="true" />
            ) : (
              <Mic className="size-6" aria-hidden="true" />
            )}
          </button>
        )}

        {isIncomingRing && (
          <button
            type="button"
            onClick={() => void accept()}
            aria-label="Javob berish"
            className="flex size-16 items-center justify-center rounded-full bg-emerald-500 text-white transition-transform active:scale-95"
          >
            <Phone className="size-7" aria-hidden="true" />
          </button>
        )}

        {!isOver && (
          <button
            type="button"
            onClick={() => void hangUp()}
            aria-label={isIncomingRing ? 'Rad etish' : "Qo'ng'iroqni tugatish"}
            className="bg-destructive flex size-16 items-center justify-center rounded-full text-white transition-transform active:scale-95"
          >
            <PhoneOff className="size-7" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
