'use client';

import { Mic, MicOff, Phone, PhoneOff, SwitchCamera, Video, VideoOff } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useCall } from '@/modules/call/call-provider';
import { participantCountText } from '@/config/group-call';
import { callStatusText, formatCallDuration, isCallOver } from '@/modules/call/call.types';
import type { CallParticipantView } from '@/modules/call/call.types';

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
  const {
    call,
    isConnecting,
    isMuted,
    isCameraOff,
    elapsedSeconds,
    error,
    localStream,
    remoteStream,
    remoteStreams,
    accept,
    joinGroup,
    hangUp,
    toggleMute,
    toggleCamera,
    switchCamera,
  } = useCall();

  if (!call) return null;

  const isGroup = call.isGroup;

  /**
   * Guruhda "chalinmoqda" holati BOSHQACHA aniqlanadi.
   *
   * Guruh suhbati serverda darhol "ketmoqda" bo'ladi (u xona kabi
   * ochiladi). Chaqirilgan odam uchun esa u baribir chaqiruv —
   * buni uning O'Z holati aytadi: "chaqirildi, hali kirmagan".
   */
  const me = call.participants.find((participant) => participant.isMe);
  const isGroupInvite = isGroup && me?.status === 'INVITED' && !isCallOver(call.status);

  const isIncomingRing = (call.status === 'RINGING' && !call.isOutgoing) || isGroupInvite;
  const isOutgoingRing = call.status === 'RINGING' && call.isOutgoing;
  const isActive = call.status === 'ACTIVE' && !isGroupInvite;
  const isOver = isCallOver(call.status);
  const isVideo = call.kind === 'VIDEO';

  /** Guruhda hozir suhbatda turganlar (o'zimdan tashqari). */
  const joined = call.participants.filter(
    (participant) => participant.status === 'JOINED' && !participant.isMe,
  );

  /** Suhbatdoshning tasviri chinakam kelayotganini bildiradi. */
  const hasRemoteVideo = isVideo && isActive && !isConnecting && remoteStream !== null;

  /** Guruh video suhbatida hech bo'lmasa bitta tasvir keldimi. */
  const hasGroupVideo = isGroup && isVideo && isActive && remoteStreams.size > 0;

  const statusLine = isOutgoingRing
    ? 'Chalinmoqda...'
    : isIncomingRing
      ? isGroup
        ? 'Guruhda suhbat ketyapti'
        : isVideo
          ? "Kiruvchi video qo'ng'iroq"
          : "Kiruvchi qo'ng'iroq"
      : isActive
        ? isConnecting
          ? 'Ulanmoqda...'
          : isGroup
            ? /**
               * Guruhda vaqt o'rniga ODAMLAR SONI ko'rsatiladi.
               *
               * Suhbat davomiyligi bu yerda kam ma'no beradi: odamlar
               * kirib-chiqib turadi va "5 daqiqa" kim uchun ekani
               * noaniq. Kim borligi esa har doim muhim.
               */
              `${participantCountText(joined.length + 1)} · ${formatCallDuration(elapsedSeconds)}`
            : formatCallDuration(elapsedSeconds)
        : callStatusText(call.status);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Qo'ng'iroq"
      className={cn(
        'pb-safe fixed inset-0 z-[100] flex flex-col',
        // Video kelayotganda fon qora: rasm atrofidagi rang uni buzmasligi kerak.
        hasRemoteVideo || hasGroupVideo ? 'bg-black' : 'bg-background/95 backdrop-blur-xl',
      )}
    >
      {/* Suhbatdoshning tasviri (ikki kishilik suhbat) */}
      {hasRemoteVideo && (
        <StreamVideo
          stream={remoteStream}
          className="absolute inset-0 size-full object-cover"
          aria-label="Suhbatdosh tasviri"
        />
      )}

      {/*
        Guruhdagi tasvirlar — panjara ko'rinishida.

        ── Nima uchun ikki ustun ────────────────────────────────────────
        Telefon ekrani tor. Uch ustunda har bir oyna shu qadar kichrayib
        ketardiki, odamning yuzini ajratib bo'lmasdi. Ikki ustun esa
        to'rt kishigacha (chegara) qulay joylashadi.
      */}
      {hasGroupVideo && (
        <div className="absolute inset-0 grid auto-rows-fr grid-cols-2 gap-0.5">
          {joined.map((participant) => {
            const stream = remoteStreams.get(participant.userId) ?? null;

            return (
              <div key={participant.userId} className="relative overflow-hidden bg-neutral-900">
                {stream ? (
                  <StreamVideo
                    stream={stream}
                    className="size-full object-cover"
                    aria-label={`${participant.name} tasviri`}
                  />
                ) : (
                  /*
                    Tasvir hali kelmadi — odam ulanmoqda.

                    Bo'sh qora kvadrat o'rniga avatar turishi kerak:
                    aks holda "kim bu?" degan savol qoladi.
                  */
                  <div className="flex size-full items-center justify-center">
                    <Avatar src={participant.avatarUrl} name={participant.name} size="lg" />
                  </div>
                )}

                <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded-md bg-black/50 px-1.5 py-0.5 text-xs text-white">
                  {participant.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/*
        O'zini ko'rish oynasi.

        Chalinayotganda ham ko'rsatiladi: odam suhbat boshlanishidan
        OLDIN o'zi qanday ko'rinishini bilishi kerak.
      */}
      {isVideo && localStream && !isOver && (
        <StreamVideo
          stream={localStream}
          muted
          aria-label="Sizning tasvingiz"
          className={cn(
            'border-background/20 absolute z-10 rounded-2xl border object-cover shadow-lg',
            /*
              Pastki o'ng burchak — tugmalar ustida.

              Yuqorida turganda u ism va holat yozuvi bilan yonma-yon
              tushib, tor telefon ekranida ikkalasi ham siqilib qolardi.
            */
            // 36 = tugmalar balandligi (14 + 16) ustidan bo'sh joy.
            'right-4 bottom-36 h-40 w-28',
            // Kamera o'chirilganda oyna qora qoladi — buni bildirib turamiz.
            isCameraOff && 'opacity-40',
            /*
              O'z tasviri KO'ZGUDEK ko'rsatiladi.

              Odam o'zini ko'zguda ko'rishga o'rgangan. Aks holda qo'lini
              o'ngga qimirlatsa, ekranda chapga ketardi va bu bezovta
              qilardi. Suhbatdoshga esa tasvir odatdagidek boradi.
            */
            '-scale-x-100',
          )}
        />
      )}

      {/* Ism va holat */}
      <div
        className={cn(
          'relative z-10 flex flex-1 flex-col items-center px-8 text-center',
          hasRemoteVideo || hasGroupVideo ? 'justify-start pt-10' : 'justify-center gap-5',
        )}
      >
        {!hasRemoteVideo && !hasGroupVideo && (
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
        )}

        <div
          className={cn(
            'space-y-1.5',
            (hasRemoteVideo || hasGroupVideo) && 'rounded-2xl bg-black/40 px-4 py-2 backdrop-blur-sm',
          )}
        >
          <h1
            className={cn(
              'text-2xl font-semibold tracking-tight',
              (hasRemoteVideo || hasGroupVideo) && 'text-white',
            )}
          >
            {call.peer.name}
          </h1>

          <p
            className={cn(
              'text-base tabular-nums',
              hasRemoteVideo
                ? 'text-white/80'
                : isActive && !isConnecting
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground',
            )}
            aria-live="polite"
          >
            {statusLine}
          </p>

          {/*
            Qo'ng'iroq turi FAQAT holat satrida aytilmagan bo'lsa
            ko'rsatiladi. Aks holda "Kiruvchi video qo'ng'iroq" ning
            ostida yana "Video qo'ng'iroq" turib, bir xil ma'lumot ikki
            marta yozilardi.
          */}
          {!hasRemoteVideo && !statusLine.toLowerCase().includes('video') && (
            <p className="text-muted-foreground text-xs">{isVideo ? "Video qo'ng'iroq" : "Ovozli qo'ng'iroq"}</p>
          )}
        </div>

        {/*
          Guruhda kim borligi — ovozli suhbatda ham ko'rinishi kerak.

          Ovozli suhbatda tasvir yo'q, ya'ni odam kim bilan
          gaplashayotganini boshqa hech qayerdan bilmasdi.
        */}
        {isGroup && !hasGroupVideo && !isOver && joined.length > 0 && (
          <ul className="mt-2 flex flex-wrap items-center justify-center gap-3" aria-label="Suhbatdagilar">
            {joined.map((participant) => (
              <li key={participant.userId} className="flex flex-col items-center gap-1">
                <Avatar src={participant.avatarUrl} name={participant.name} size="md" />
                <span className="text-muted-foreground max-w-20 truncate text-xs">{participant.name}</span>
              </li>
            ))}
          </ul>
        )}

        {/*
          Chaqirilgan, lekin hali kirmaganlar — kulrang.

          Ular hali telefoniga qaramagan bo'lishi mumkin: "hech kim
          yo'q" degan taassurot bermaslik kerak.
        */}
        {isGroup && !hasGroupVideo && !isOver && (
          <GroupWaitingList participants={call.participants} />
        )}

        {error && (
          <p
            className={cn(
              'mt-3 max-w-xs text-sm leading-relaxed',
              hasRemoteVideo || hasGroupVideo ? 'text-white' : 'text-destructive',
            )}
          >
            {error}
          </p>
        )}
      </div>

      {/* Boshqaruv tugmalari */}
      <div className="relative z-10 flex items-center justify-center gap-4 px-6 pb-14">
        {isActive && (
          <ControlButton
            onClick={toggleMute}
            label={isMuted ? 'Mikrofonni yoqish' : "Mikrofonni o'chirish"}
            isPressed={isMuted}
            onDark={hasRemoteVideo || hasGroupVideo}
          >
            {isMuted ? (
              <MicOff className="size-6" aria-hidden="true" />
            ) : (
              <Mic className="size-6" aria-hidden="true" />
            )}
          </ControlButton>
        )}

        {isVideo && isActive && (
          <>
            <ControlButton
              onClick={toggleCamera}
              label={isCameraOff ? 'Kamerani yoqish' : "Kamerani o'chirish"}
              isPressed={isCameraOff}
              onDark={hasRemoteVideo || hasGroupVideo}
            >
              {isCameraOff ? (
                <VideoOff className="size-6" aria-hidden="true" />
              ) : (
                <Video className="size-6" aria-hidden="true" />
              )}
            </ControlButton>

            <ControlButton
              onClick={() => void switchCamera()}
              label="Kamerani almashtirish"
              isPressed={false}
              onDark={hasRemoteVideo || hasGroupVideo}
            >
              <SwitchCamera className="size-6" aria-hidden="true" />
            </ControlButton>
          </>
        )}

        {isIncomingRing && (
          <button
            type="button"
            onClick={() => void (isGroup ? joinGroup() : accept())}
            aria-label="Javob berish"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition-transform active:scale-95"
          >
            <Phone className="size-7" aria-hidden="true" />
          </button>
        )}

        {!isOver && (
          <button
            type="button"
            onClick={() => void hangUp()}
            aria-label={isIncomingRing ? 'Rad etish' : "Qo'ng'iroqni tugatish"}
            className="bg-destructive flex size-16 shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-95"
          >
            <PhoneOff className="size-7" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Hali javob bermaganlar ro'yxati.
 *
 * ── Nima uchun KERAK ──────────────────────────────────────────────────
 * Guruhda birinchi kirgan odam yolg'iz qoladi va "hech kim
 * qo'shilmadi shekilli" deb chiqib ketishi mumkin. Aslida qolganlar
 * hali telefoniga qaramagan bo'ladi.
 *
 * Bu ro'yxat aynan shu savolga javob beradi.
 */
function GroupWaitingList({ participants }: { participants: CallParticipantView[] }) {
  const waiting = participants.filter((participant) => participant.status === 'INVITED');

  if (waiting.length === 0) return null;

  return (
    <p className="text-muted-foreground mt-3 max-w-xs text-xs leading-relaxed">
      {waiting.length === 1
        ? `${waiting[0].name} kutilmoqda...`
        : `${waiting.length} kishi kutilmoqda...`}
    </p>
  );
}

/**
 * Oqimni ko'rsatadigan video oynasi.
 *
 * ── Nima uchun alohida komponent ──────────────────────────────────────
 * `srcObject` ni JSX orqali berib bo'lmaydi — u oddiy xossa emas,
 * uni elementga kod bilan yozish kerak. Shu ish ikki joyda (suhbatdosh
 * va o'zini ko'rish) takrorlangani uchun bir joyga chiqarildi.
 */
function StreamVideo({
  stream,
  muted = false,
  className,
  'aria-label': ariaLabel,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
  'aria-label': string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    element.srcObject = stream;

    // Ijro rad etilishi mumkin — rasmsiz qolish yiqilishdan yaxshiroq.
    void element.play().catch(() => undefined);

    return () => {
      element.srcObject = null;
    };
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      aria-label={ariaLabel}
      className={cn('bg-black', className)}
    />
  );
}

/** Dumaloq boshqaruv tugmasi — barcha rejimlarda bir xil ko'rinadi. */
function ControlButton({
  onClick,
  label,
  isPressed,
  onDark,
  children,
}: {
  onClick: () => void;
  label: string;
  isPressed: boolean;
  /** Tugma qora fon (video) ustida turibdimi. */
  onDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isPressed}
      className={cn(
        'flex size-16 shrink-0 items-center justify-center rounded-full transition-colors',
        isPressed
          ? 'bg-foreground text-background'
          : onDark
            ? 'bg-white/15 text-white backdrop-blur-sm'
            : 'bg-secondary text-secondary-foreground',
      )}
    >
      {children}
    </button>
  );
}
