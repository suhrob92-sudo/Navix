'use client';

import { Check, TriangleAlert, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { AmountInput } from '@/components/wallet/amount-input';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { MAX_TRANSFER_SOM, MIN_TOP_UP_SOM, formatTiyin } from '@/lib/money';
import { createIdempotencyKey } from '@/modules/wallet/wallet.schemas';
import type { TransferRecipient, WalletSummary, WalletTransaction } from '@/modules/wallet/wallet.types';

/** O'zbek raqamining prefiksiz uzunligi: 90 123 45 67 */
const LOCAL_PHONE_LENGTH = 9;

const PRESETS = [10_000, 50_000, 100_000] as const;

/**
 * Boshqa foydalanuvchiga pul o'tkazish.
 *
 * ── Nima uchun ikki bosqichli ─────────────────────────────────────────
 * Pul o'tkazmasi QAYTARIB BO'LMAYDIGAN amal. Bitta xato raqam — pul
 * begonada. Shuning uchun raqam to'liq kiritilishi bilan qabul
 * qiluvchining ISMI ko'rsatiladi va foydalanuvchi tasdiqlaydi.
 */
export function TransferContent() {
  const router = useRouter();
  const request = useApiClient();

  const [phoneDigits, setPhoneDigits] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<WalletTransaction | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);

  const { data: wallet } = useApiQuery<WalletSummary>('/api/v1/wallet');

  // Raqam to'liq bo'lgandagina qabul qiluvchi so'raladi.
  const isPhoneComplete = phoneDigits.length === LOCAL_PHONE_LENGTH;
  const {
    data: recipient,
    isLoading: isLookingUp,
    error: lookupError,
  } = useApiQuery<TransferRecipient>(
    isPhoneComplete ? `/api/v1/wallet/transfer?phone=${encodeURIComponent(`+998${phoneDigits}`)}` : null,
  );

  const available = wallet?.available ?? 0;
  const amountTiyin = amount === null ? 0 : amount * 100;

  const isAmountValid = amount !== null && amount >= MIN_TOP_UP_SOM && amount <= MAX_TRANSFER_SOM;
  const hasEnough = amountTiyin <= available;
  const canSubmit = isPhoneComplete && Boolean(recipient) && !recipient?.isSelf && isAmountValid && hasEnough;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!canSubmit) return;

    setIsSubmitting(true);

    try {
      const transaction = await request<WalletTransaction>('/api/v1/wallet/transfer', {
        method: 'POST',
        body: {
          phone: `+998${phoneDigits}`,
          amount,
          note: note.trim() === '' ? undefined : note.trim(),
          idempotencyKey,
        },
      });

      setResult(transaction);
      setIdempotencyKey(createIdempotencyKey());
    } catch (caught) {
      setFormError(toUserMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Muvaffaqiyat ekrani ──────────────────────────────────────────────
  if (result) {
    return (
      <>
        <AppHeader title="O'tkazma" showBack backHref="/wallet" />

        <div className="px-4 pt-4">
          <Card variant="glass" className="animate-fade-up text-center">
            <span className="bg-success/12 text-success mx-auto inline-flex size-16 items-center justify-center rounded-full">
              <Check className="size-8" aria-hidden="true" />
            </span>

            <h2 className="mt-4 text-xl font-semibold">Pul yuborildi</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">{result.description}</p>

            <p className="bg-secondary mt-5 rounded-xl px-4 py-3 text-sm">
              Qolgan balans: <span className="font-semibold tabular-nums">{formatTiyin(result.balanceAfter)}</span>
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={() => router.push('/wallet')}>Hamyonga qaytish</Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setResult(null);
                  setAmount(null);
                  setNote('');
                }}
              >
                Yana o&apos;tkazish
              </Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  // ── Forma ────────────────────────────────────────────────────────────
  return (
    <>
      <AppHeader title="Pul o'tkazish" showBack backHref="/wallet" />

      <form onSubmit={handleSubmit} noValidate className="px-4 pt-4">
        {formError && (
          <Alert variant="error" className="mb-4">
            {formError}
          </Alert>
        )}

        <Card variant="glass" className="animate-fade-up">
          <Field id="phone" label="Kimga yuborasiz?" required>
            <PhoneInput
              id="phone"
              value={phoneDigits}
              onValueChange={(digits) => {
                setPhoneDigits(digits);
                // Raqam o'zgarsa eski xatolik qolib ketmasligi kerak.
                setFormError(null);
              }}
              disabled={isSubmitting}
            />
          </Field>

          {/* Qabul qiluvchini tasdiqlash — xato raqamdan himoya */}
          {isPhoneComplete && (
            <div className="mt-3">
              {isLookingUp && <Skeleton className="h-12 rounded-xl" />}

              {!isLookingUp && lookupError && (
                <p className="text-destructive flex items-center gap-2 text-sm">
                  <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
                  Bu raqam bilan foydalanuvchi topilmadi
                </p>
              )}

              {!isLookingUp && recipient && !recipient.isSelf && (
                <div className="bg-success/10 text-success flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
                  <UserCheck className="size-4 shrink-0" aria-hidden="true" />
                  <span className="font-medium">{recipient.name}</span>
                </div>
              )}

              {!isLookingUp && recipient?.isSelf && (
                <p className="text-destructive flex items-center gap-2 text-sm">
                  <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
                  Bu sizning raqamingiz
                </p>
              )}
            </div>
          )}
        </Card>

        <Card variant="glass" className="animate-fade-up mt-4" style={{ animationDelay: '80ms' }}>
          <label htmlFor="amount" className="text-sm font-medium">
            Qancha yuborasiz?
          </label>

          <AmountInput
            id="amount"
            value={amount}
            onChange={setAmount}
            presets={PRESETS}
            disabled={isSubmitting}
            hasError={amount !== null && (!isAmountValid || !hasEnough)}
            className="mt-3"
          />

          <p className="text-muted-foreground mt-3 text-xs">
            Sarflash mumkin: <span className="tabular-nums">{formatTiyin(available)}</span>
          </p>

          {amount !== null && !hasEnough && (
            <p className="text-destructive mt-2 text-xs">
              Mablag&apos; yetarli emas. Avval hisobni to&apos;ldiring.
            </p>
          )}

          <div className="mt-4">
            <Field id="note" label="Izoh" hint="Ixtiyoriy — qabul qiluvchi ko'radi">
              <Input
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={140}
                placeholder="Masalan: qarz uchun"
                disabled={isSubmitting}
              />
            </Field>
          </div>
        </Card>

        <Button
          type="submit"
          className="mt-5 w-full"
          size="lg"
          isLoading={isSubmitting}
          loadingText="Yuborilmoqda..."
          disabled={!canSubmit}
        >
          {canSubmit ? `${formatTiyin(amountTiyin)} yuborish` : 'Yuborish'}
        </Button>
      </form>
    </>
  );
}
