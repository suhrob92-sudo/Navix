'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ProviderIcon } from '@/components/payments/provider-icon';
import { AmountInput } from '@/components/wallet/amount-input';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { ApiClientError, toUserMessage } from '@/lib/api-client';
import { formatUzDateTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { createIdempotencyKey } from '@/modules/wallet/wallet.schemas';
import type { FieldErrors } from '@/lib/api/errors';
import type { ServicePaymentItem, ServiceProviderItem } from '@/modules/payment/payment.types';
import type { WalletSummary } from '@/modules/wallet/wallet.types';

/** Tez tanlash uchun summalar (so'mda). */
const PRESETS = [10_000, 50_000, 100_000, 200_000] as const;

export interface PayContentProps {
  providerId: string;
}

/**
 * Xizmat uchun to'lov formasi.
 *
 * Hisob raqami URL'dan ham kelishi mumkin (`?account=...`) — saqlangan
 * hisobdan o'tilganda foydalanuvchi raqamni qayta yozmaydi.
 */
export function PayContent({ providerId }: PayContentProps) {
  const router = useRouter();
  const request = useApiClient();
  const searchParams = useSearchParams();

  const provider = useApiQuery<ServiceProviderItem>(`/api/v1/payments/providers/${providerId}`);
  const wallet = useApiQuery<WalletSummary>('/api/v1/wallet');

  const [accountNumber, setAccountNumber] = useState(() => searchParams.get('account') ?? '');
  const [amount, setAmount] = useState<number | null>(null);
  const [saveAccount, setSaveAccount] = useState(false);
  const [accountLabel, setAccountLabel] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ServicePaymentItem | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);

  const data = provider.data;
  const available = wallet.data?.available ?? 0;
  const amountTiyin = amount === null ? 0 : amount * 100;

  const isAmountInRange =
    data !== null && data !== undefined && amountTiyin >= data.minAmount && amountTiyin <= data.maxAmount;
  const hasEnough = amountTiyin <= available;
  const canSubmit = accountNumber.trim().length >= 3 && isAmountInRange && hasEnough && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!canSubmit || !data) return;

    setIsSubmitting(true);

    try {
      const payment = await request<ServicePaymentItem>('/api/v1/payments', {
        method: 'POST',
        body: {
          providerId: data.id,
          accountNumber: accountNumber.trim(),
          amount,
          saveAccount,
          accountLabel: saveAccount ? accountLabel.trim() || data.name : undefined,
          idempotencyKey,
        },
      });

      setResult(payment);
      // Keyingi to'lov uchun yangi kalit.
      setIdempotencyKey(createIdempotencyKey());
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.details) {
        setFieldErrors(caught.details);
      }

      setFormError(toUserMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Muvaffaqiyat ekrani ──────────────────────────────────────────────
  if (result) {
    return (
      <>
        <AppHeader title="To'lov" showBack backHref="/payments" />

        <div className="px-4 pt-4">
          <Card variant="glass" className="animate-fade-up text-center">
            <span className="bg-success/12 text-success mx-auto inline-flex size-16 items-center justify-center rounded-full">
              <Check className="size-8" aria-hidden="true" />
            </span>

            <h2 className="mt-4 text-xl font-semibold">To&apos;lov bajarildi</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {result.provider.name} — {result.accountNumber}
            </p>

            <p className="mt-4 text-2xl font-semibold tabular-nums">{formatTiyin(result.amount)}</p>

            <dl className="bg-secondary mt-5 space-y-2 rounded-xl px-4 py-3 text-left text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Chek raqami</dt>
                <dd className="font-mono text-xs">{result.receiptNumber}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Sana</dt>
                <dd>{formatUzDateTime(result.createdAt)}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-2">
              <Button asChild>
                <Link href={`/payments/receipt/${result.id}`}>Chekni ko&apos;rish</Link>
              </Button>
              <Button variant="ghost" onClick={() => router.push('/payments')}>
                To&apos;lovlarga qaytish
              </Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  // ── Yuklanmoqda / xatolik ────────────────────────────────────────────
  if (provider.isLoading) {
    return (
      <>
        <AppHeader title="To'lov" showBack backHref="/payments" />
        <div className="space-y-4 px-4 pt-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </>
    );
  }

  if (provider.error || !data) {
    return (
      <>
        <AppHeader title="To'lov" showBack backHref="/payments" />
        <div className="px-4 pt-4">
          <Alert variant="error" title="Xizmat topilmadi">
            {provider.error ?? "Bu xizmat mavjud emas yoki vaqtincha o'chirilgan."}
          </Alert>
        </div>
      </>
    );
  }

  // ── Forma ────────────────────────────────────────────────────────────
  return (
    <>
      <AppHeader title={data.name} showBack backHref="/payments" />

      <form onSubmit={handleSubmit} noValidate className="px-4 pt-4">
        {formError && (
          <Alert variant="error" className="mb-4">
            {formError}
          </Alert>
        )}

        {/* Xizmat */}
        <Card variant="glass" className="animate-fade-up">
          <div className="flex items-center gap-3">
            <ProviderIcon provider={data} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-medium">{data.name}</p>
              {data.description && <p className="text-muted-foreground truncate text-xs">{data.description}</p>}
            </div>
          </div>

          <div className="mt-5">
            <Field
              id="accountNumber"
              label={data.accountLabel}
              required
              hint={`Namuna: ${data.accountHint}`}
              errors={fieldErrors.accountNumber}
            >
              <Input
                id="accountNumber"
                inputMode="numeric"
                autoComplete="off"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                placeholder={data.accountHint}
                hasError={Boolean(fieldErrors.accountNumber)}
                disabled={isSubmitting}
              />
            </Field>
          </div>
        </Card>

        {/* Summa */}
        <Card variant="glass" className="animate-fade-up mt-4" style={{ animationDelay: '80ms' }}>
          <label htmlFor="amount" className="text-sm font-medium">
            Qancha to&apos;laysiz?
          </label>

          <AmountInput
            id="amount"
            value={amount}
            onChange={setAmount}
            presets={PRESETS}
            disabled={isSubmitting}
            hasError={amount !== null && (!isAmountInRange || !hasEnough)}
            className="mt-3"
          />

          <p className="text-muted-foreground mt-3 text-xs">
            Chegara: {formatTiyin(data.minAmount)} — {formatTiyin(data.maxAmount)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Hamyonda: <span className="tabular-nums">{formatTiyin(available)}</span>
          </p>

          {amount !== null && !hasEnough && (
            <Alert variant="warning" className="mt-3">
              Mablag&apos; yetarli emas.{' '}
              <Link href="/wallet/topup" className="font-medium underline">
                Hisobni to&apos;ldirish
              </Link>
            </Alert>
          )}
        </Card>

        {/* Hisobni saqlash */}
        <Card variant="glass" className="animate-fade-up mt-4" style={{ animationDelay: '160ms' }}>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={saveAccount}
              onChange={(event) => setSaveAccount(event.target.checked)}
              disabled={isSubmitting}
              className="accent-primary mt-0.5 size-4.5 shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">Bu hisobni saqlash</span>
              <span className="text-muted-foreground block text-xs">Keyingi safar raqamni qayta kiritmaysiz</span>
            </span>
          </label>

          {saveAccount && (
            <div className="mt-4">
              <Field id="accountLabel" label="Nomi" hint="Masalan: Uy gazi">
                <Input
                  id="accountLabel"
                  value={accountLabel}
                  onChange={(event) => setAccountLabel(event.target.value)}
                  placeholder={data.name}
                  maxLength={60}
                  disabled={isSubmitting}
                />
              </Field>
            </div>
          )}
        </Card>

        <Alert variant="info" className="animate-fade-up mt-4">
          Hozircha to&apos;lov <strong>sinov rejimida</strong> bajariladi — provayderga haqiqiy so&apos;rov
          yuborilmaydi.
        </Alert>

        <Button
          type="submit"
          className="mt-5 w-full"
          size="lg"
          isLoading={isSubmitting}
          loadingText="To'lanmoqda..."
          disabled={!canSubmit}
        >
          {isAmountInRange && hasEnough ? `${formatTiyin(amountTiyin)} to'lash` : "To'lash"}
        </Button>
      </form>
    </>
  );
}
