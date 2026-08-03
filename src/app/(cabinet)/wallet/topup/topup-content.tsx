'use client';

import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { AmountInput } from '@/components/wallet/amount-input';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { MAX_TOP_UP_SOM, MIN_TOP_UP_SOM, formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import { TOP_UP_METHODS, createIdempotencyKey, type TopUpMethod } from '@/modules/wallet/wallet.schemas';
import type { WalletTransaction } from '@/modules/wallet/wallet.types';

/** Tez tanlash uchun eng ko'p ishlatiladigan summalar. */
const PRESETS = [10_000, 50_000, 100_000, 500_000] as const;

/**
 * Hamyonni to'ldirish.
 *
 * To'lov provayderi hozircha SIMULYATSIYA qilinadi — real Payme/Click
 * ulanishi alohida bosqichda qo'shiladi. Foydalanuvchi uchun oqim esa
 * allaqachon yakuniy ko'rinishda.
 */
export function TopUpContent() {
  const router = useRouter();
  const request = useApiClient();

  const [amount, setAmount] = useState<number | null>(50_000);
  const [method, setMethod] = useState<TopUpMethod>('CARD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<WalletTransaction | null>(null);

  /**
   * Kalit HAR BIR urinish uchun emas, har bir TO'LOV uchun yaratiladi.
   *
   * Nima uchun holatda saqlanadi: so'rov yuborilib javob yo'qolsa,
   * foydalanuvchi qayta bosadi va AYNAN SHU kalit qayta yuboriladi —
   * server esa uni takror deb tanib, pulni ikkinchi marta qo'shmaydi.
   */
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);

  const isAmountValid = amount !== null && amount >= MIN_TOP_UP_SOM && amount <= MAX_TOP_UP_SOM;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!isAmountValid) {
      setFormError(
        `Summa ${MIN_TOP_UP_SOM.toLocaleString('uz-UZ')} dan ${MAX_TOP_UP_SOM.toLocaleString('uz-UZ')} so'mgacha bo'lishi kerak.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const transaction = await request<WalletTransaction>('/api/v1/wallet/topup', {
        method: 'POST',
        body: { amount, method, idempotencyKey },
      });

      setResult(transaction);
      // Keyingi to'lov uchun yangi kalit — aks holda u ham "takror" deb hisoblanardi.
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
        <AppHeader title="To'ldirish" showBack backHref="/wallet" />

        <div className="px-4 pt-4">
          <Card variant="glass" className="animate-fade-up text-center">
            <span className="bg-success/12 text-success mx-auto inline-flex size-16 items-center justify-center rounded-full">
              <Check className="size-8" aria-hidden="true" />
            </span>

            <h2 className="mt-4 text-xl font-semibold">Hisob to&apos;ldirildi</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Hamyoningizga {formatTiyin(result.amount)} qo&apos;shildi.
            </p>

            <p className="bg-secondary mt-5 rounded-xl px-4 py-3 text-sm">
              Yangi balans: <span className="font-semibold tabular-nums">{formatTiyin(result.balanceAfter)}</span>
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={() => router.push('/wallet')}>Hamyonga qaytish</Button>
              <Button variant="ghost" onClick={() => setResult(null)}>
                Yana to&apos;ldirish
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
      <AppHeader title="To'ldirish" showBack backHref="/wallet" />

      <form onSubmit={handleSubmit} noValidate className="px-4 pt-4">
        {formError && (
          <Alert variant="error" className="mb-4">
            {formError}
          </Alert>
        )}

        <Card variant="glass" className="animate-fade-up">
          <label htmlFor="amount" className="text-sm font-medium">
            Qancha to&apos;ldirasiz?
          </label>

          <AmountInput
            id="amount"
            value={amount}
            onChange={setAmount}
            presets={PRESETS}
            disabled={isSubmitting}
            hasError={Boolean(formError) && !isAmountValid}
            className="mt-3"
          />
        </Card>

        <Card variant="glass" className="animate-fade-up mt-4" style={{ animationDelay: '80ms' }}>
          <p className="text-sm font-medium">To&apos;lov usuli</p>

          <div className="mt-3 space-y-2">
            {TOP_UP_METHODS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMethod(option.value)}
                disabled={isSubmitting}
                aria-pressed={method === option.value}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:opacity-60',
                  method === option.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary',
                )}
              >
                <span className="font-medium">{option.label}</span>

                <span
                  className={cn(
                    'inline-flex size-5 items-center justify-center rounded-full border-2',
                    method === option.value ? 'border-primary bg-primary' : 'border-border',
                  )}
                  aria-hidden="true"
                >
                  {method === option.value && <Check className="text-primary-foreground size-3" />}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Alert variant="info" className="animate-fade-up mt-4">
          Hozircha to&apos;lov <strong>sinov rejimida</strong> bajariladi — haqiqiy pul yechilmaydi. Payme va Click
          ulanishi keyingi bosqichda qo&apos;shiladi.
        </Alert>

        <Button
          type="submit"
          className="mt-5 w-full"
          size="lg"
          isLoading={isSubmitting}
          loadingText="Bajarilmoqda..."
          disabled={!isAmountValid}
        >
          {isAmountValid ? `${formatTiyin(amount * 100)} to'ldirish` : "To'ldirish"}
        </Button>
      </form>
    </>
  );
}
