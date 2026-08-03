'use client';

import { useEffect, useRef, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import type { AdminPaymentItem } from '@/modules/admin/admin.types';

export interface RefundDialogProps {
  /** Qaytariladigan to'lov. `null` — oyna yopiq. */
  payment: AdminPaymentItem | null;
  onClose: () => void;
  onRefunded: () => void;
}

/**
 * Pulni qaytarish oynasi.
 *
 * ── Nima uchun oddiy `ConfirmDialog` emas ─────────────────────────────
 * Bu yerda SABAB majburiy: pulni qaytarish qaytarib bo'lmaydigan
 * moliyaviy amal va nizo chiqqanda "nima uchun qaytarilgan?" degan
 * savolga javob bo'lishi kerak. Sabab audit jurnaliga yoziladi.
 *
 * Shuning uchun oynada summa va mijoz KATTA yozilgan — xodim
 * tasdiqlashdan oldin noto'g'ri to'lovni tanlamaganiga ishonch hosil
 * qilishi kerak.
 */
export function RefundDialog({ payment, onClose, onRefunded }: RefundDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const open = payment !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onClose();
      }}
      className="glass animate-scale-in text-foreground m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-6 backdrop:bg-black/50"
    >
      {/*
        `key` — forma har safar YANGI to'lov uchun toza holatda ochilishi
        uchun. Holatni effekt ichida tozalash o'rniga komponentni qayta
        yaratamiz: bu React'ning tavsiya qilgan usuli va ortiqcha
        qayta chizishga olib kelmaydi.
      */}
      {payment && (
        <RefundForm
          key={payment.id}
          payment={payment}
          onClose={onClose}
          onRefunded={onRefunded}
          onSavingChange={setIsSaving}
        />
      )}
    </dialog>
  );
}

interface RefundFormProps {
  payment: AdminPaymentItem;
  onClose: () => void;
  onRefunded: () => void;
  /** Saqlash davomida oynani Escape bilan yopib bo'lmasligi uchun. */
  onSavingChange: (saving: boolean) => void;
}

function RefundForm({ payment, onClose, onRefunded, onSavingChange }: RefundFormProps) {
  const request = useApiClient();

  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setSaving(value: boolean) {
    setIsSaving(value);
    onSavingChange(value);
  }

  async function submit() {
    if (reason.trim().length < 5) {
      setError('Sababni batafsilroq yozing (kamida 5 ta belgi)');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await request(`/api/v1/admin/payments/${payment.id}/refund`, {
        method: 'POST',
        body: { reason: reason.trim() },
      });

      onRefunded();
    } catch (caught) {
      setError(toUserMessage(caught));
      setSaving(false);
    }
  }

  return (
    <>
      <h2 className="text-lg font-semibold tracking-tight">Pulni qaytarish</h2>

      <p className="mt-1 text-3xl font-semibold tabular-nums">{formatTiyin(payment.amount)}</p>

      <dl className="border-border/60 mt-4 space-y-2 border-y py-4 text-sm">
        <Row label="Xizmat" value={payment.providerName} />
        <Row label="Hisob raqami" value={payment.accountNumber} />
        <Row label="Chek" value={payment.receiptNumber} />
        <Row label="Mijoz" value={payment.user.fullName ?? formatUzPhone(payment.user.phone)} />
      </dl>

      <Field id="refund-reason" label="Sabab" required hint="Audit jurnaliga yoziladi" className="mt-4">
        <Input
          id="refund-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Masalan: provayder qabul qilmadi"
          disabled={isSaving}
        />
      </Field>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
        Summa mijozning hamyoniga qaytariladi va u xabar oladi. Amalni bekor qilib bo&apos;lmaydi.
      </p>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Bekor qilish
        </Button>
        <Button variant="destructive" onClick={submit} isLoading={isSaving} loadingText="Qaytarilmoqda...">
          Pulni qaytarish
        </Button>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground shrink-0 text-xs">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </div>
  );
}
