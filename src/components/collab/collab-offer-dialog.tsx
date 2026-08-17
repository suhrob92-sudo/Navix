'use client';

import { Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { dialogCancelHandler } from '@/lib/dialog';
import {
  COLLAB_MESSAGE_MAX_LENGTH,
  COLLAB_SUBJECT_MAX_LENGTH,
} from '@/modules/collab/collab.schemas';

export interface CollabOfferDialogProps {
  username: string;
  /** Ekranda ko'rinadigan ism — "kimga yozyapman?" savoliga javob. */
  name: string;
  onClose: () => void;
  onSent?: () => void;
}

/** Matn kamida shuncha belgi — server ham aynan shu chegarani qo'yadi. */
const MIN_MESSAGE_LENGTH = 20;

/**
 * Hamkorlik taklifini yozish oynasi.
 *
 * ── Nima uchun oddiy xabar emas ───────────────────────────────────────
 * Suhbatda yozilgan taklif boshqa xabarlar orasida yo'qolib ketardi.
 * Ijodkor kuniga o'nlab xabar oladi va ular orasida "bu javob talab
 * qiladi" degani ajralib turmasdi.
 *
 * Taklif esa alohida yozuv: u qutida javob kutib turadi va javobsiz
 * qolsa ham ko'rinib turadi.
 *
 * ── Nima uchun matn MAJBURIY va uzunroq ───────────────────────────────
 * "Hamkorlik qilamizmi?" degan bo'sh taklif javob berib bo'lmaydigan
 * savol. Ijodkorga qaror qabul qilish uchun shart kerak: nima
 * kerak, qancha, qachon.
 */
export function CollabOfferDialog({ username, name, onClose, onSent }: CollabOfferDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const request = useApiClient();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();
  const isReady = trimmedSubject.length >= 3 && trimmedMessage.length >= MIN_MESSAGE_LENGTH;

  async function send() {
    if (!isReady || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      await request('/api/v1/collab/offers', {
        method: 'POST',
        body: { username, subject: trimmedSubject, message: trimmedMessage },
      });

      setIsSent(true);
      onSent?.();
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={dialogCancelHandler(onClose)}
      className="glass animate-scale-in text-foreground m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl p-5 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Hamkorlik taklifi</h2>

        <Button variant="ghost" size="icon" aria-label="Yopish" onClick={onClose}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      <p className="text-muted-foreground mb-4 text-xs">{`${name} ga yuboriladi`}</p>

      {isSent ? (
        <>
          <Alert variant="success">
            Taklif yuborildi. Javob kelganda bildirishnoma olasiz.
          </Alert>

          {/*
            Cheklov HALOL aytiladi.

            Odam javob kutib, ikkinchi taklif yuborishga urinsa va
            rad javobini olsa, buni buzuqlik deb o'ylardi.
          */}
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Javob kelmaguncha bu ijodkorga yangi taklif yubora olmaysiz — bu spamning oldini
            oladi.
          </p>

          <Button fullWidth className="mt-4" onClick={onClose}>
            Yopish
          </Button>
        </>
      ) : (
        <>
          <label htmlFor="collab-subject" className="text-muted-foreground mb-1.5 block text-xs">
            Sarlavha
          </label>
          <Input
            id="collab-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={COLLAB_SUBJECT_MAX_LENGTH}
            placeholder="Restoranimiz haqida video"
            disabled={isSending}
          />

          <label htmlFor="collab-message" className="text-muted-foreground mt-3 mb-1.5 block text-xs">
            Shartlar
          </label>
          <Textarea
            id="collab-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            maxLength={COLLAB_MESSAGE_MAX_LENGTH}
            placeholder="Nima kerak, qancha to'laymiz, qachongacha. Qanchalik aniq yozsangiz, javob shunchalik tez keladi."
            disabled={isSending}
          />

          <p className="text-muted-foreground mt-1.5 text-xs tabular-nums">
            {trimmedMessage.length < MIN_MESSAGE_LENGTH
              ? `Yana ${MIN_MESSAGE_LENGTH - trimmedMessage.length} ta belgi`
              : `${trimmedMessage.length} / ${COLLAB_MESSAGE_MAX_LENGTH}`}
          </p>

          {error && (
            <Alert variant="error" className="mt-3">
              {error}
            </Alert>
          )}

          {/*
            To'lov haqidagi cheklov OCHIQ aytiladi.

            Odam "Navix pulni ushlab turadi" deb o'ylashi mumkin va
            keyin aldanganday his qilardi. Halol yozuv esa
            kutilmagan holatning oldini oladi.
          */}
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Navix to&apos;lovga aralashmaydi: pulni ijodkor bilan o&apos;zingiz kelishasiz.
            Taklif qabul qilinsa, suhbat avtomatik ochiladi.
          </p>

          <Button
            fullWidth
            className="mt-4"
            disabled={!isReady}
            isLoading={isSending}
            loadingText="Yuborilmoqda..."
            onClick={() => void send()}
          >
            <Send className="size-4" aria-hidden="true" />
            Yuborish
          </Button>
        </>
      )}
    </dialog>
  );
}
