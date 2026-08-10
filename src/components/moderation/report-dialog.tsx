'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_REASONS, type ReportReasonName } from '@/modules/moderation/moderation.types';

/** Izohning eng ko'p uzunligi — server tekshiruvi bilan bir xil. */
const NOTE_MAX_LENGTH = 500;

export interface ReportDialogProps {
  /** Kim ustidan shikoyat qilinmoqda — sarlavhada ko'rsatiladi. */
  subject: string;
  isLoading?: boolean;
  onSubmit: (reason: ReportReasonName, note: string) => void;
  onCancel: () => void;
}

/**
 * Shikoyat oynasi.
 *
 * ── Nima uchun `ConfirmDialog` ishlatilmadi ───────────────────────────
 * Tasdiqlash oynasida tanlov yo'q — "ha" yoki "yo'q". Bu yerda esa
 * sabab tanlanadi va izoh yoziladi. Tasdiqlash oynasiga maydon qo'shish
 * uni har xil holatga moslashuvchan, ya'ni murakkab qilib yuborardi.
 *
 * Brauzerning o'z `<dialog>` elementi ustiga qurilgan: fokusni ushlab
 * turish, Escape bilan yopish va orqa fonni bloklash bepul keladi.
 *
 * ── Nima uchun `open` xossasi YO'Q ────────────────────────────────────
 * Oyna KERAK BO'LGANDA joylashtiriladi va yopilganda olib tashlanadi.
 * Shu sababli maydonlarni qo'lda tozalash shart emas: har ochilishda
 * komponent yangidan tug'iladi. Oldingi izoh keyingi odam haqidagi
 * shikoyatga tushib qolishi mumkin bo'lgan xato shu bilan butunlay
 * yo'q qilinadi.
 */
export function ReportDialog({ subject, isLoading = false, onSubmit, onCancel }: ReportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [reason, setReason] = useState<ReportReasonName>('SPAM');
  const [note, setNote] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (!isLoading) onCancel();
      }}
      className="glass animate-scale-in text-foreground m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-6 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <h2 className="text-lg font-semibold tracking-tight">Shikoyat yuborish</h2>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {`${subject} haqidagi shikoyatingizni moderator ko'rib chiqadi. Shikoyat maxfiy — u odamga ko'rinmaydi.`}
      </p>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(reason, note.trim());
        }}
      >
        <Field id="report-reason" label="Sabab" required>
          <Select
            id="report-reason"
            options={REPORT_REASONS}
            value={reason}
            disabled={isLoading}
            onChange={(event) => setReason(event.target.value as ReportReasonName)}
          />
        </Field>

        <Field id="report-note" label="Izoh" hint={`Ixtiyoriy. ${note.length}/${NOTE_MAX_LENGTH} belgi.`}>
          <Textarea
            id="report-note"
            rows={4}
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            disabled={isLoading}
            placeholder="Nima bo'lganini qisqacha yozing"
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Bekor qilish
          </Button>
          <Button type="submit" variant="destructive" isLoading={isLoading} loadingText="Yuborilmoqda...">
            Yuborish
          </Button>
        </div>
      </form>
    </dialog>
  );
}
