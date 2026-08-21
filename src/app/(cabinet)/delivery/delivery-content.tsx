'use client';

import { ArrowRight, Package, Send } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { DELIVERY_REGIONS, DELIVERY_TARIFF } from '@/config/delivery';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { ApiClientError, toUserMessage } from '@/lib/api-client';
import { formatRelativeUz } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import type { FieldErrors } from '@/lib/api/errors';
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_VARIANTS } from '@/modules/courier/courier.types';
import { formatWeight, type ParcelQuoteResponse, type ParcelsResponse } from '@/modules/parcel/parcel.types';

const REGION_OPTIONS = DELIVERY_REGIONS.map((region) => ({ value: region, label: region }));

/**
 * Posilka jo'natish — asosiy sahifa.
 *
 * ── Nima uchun narx JONLI ko'rinadi ───────────────────────────────────
 * Foydalanuvchi "qancha turadi?" degan savolga javobni oxirida emas,
 * hoziroq bilishi kerak. Aks holda u butun formani to'ldirib, keyin
 * narxni ko'rib voz kechardi — va bu his qoldirardi: "meni aldashdi".
 *
 * Shuning uchun hudud va og'irlik tanlangan zahoti narx serverdan
 * so'raladi va ekranda turadi.
 */
export function DeliveryContent() {
  const request = useApiClient();

  const [fromRegion, setFromRegion] = useState<string>(DELIVERY_REGIONS[0]);
  const [toRegion, setToRegion] = useState<string>(DELIVERY_REGIONS[0]);
  const [weightInput, setWeightInput] = useState('1000');

  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [description, setDescription] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  /**
   * Idempotentlik kaliti forma OCHILGANDA yaratiladi.
   *
   * Har bosishda yangisi yasalsa, ikki marta bosilgan tugma ikkita
   * jo'natma va ikkita to'lov yasardi. Kalit esa ikkinchi so'rovni
   * "bu allaqachon bajarilgan" deb qaytaradi.
   */
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const weightGrams = Number.parseInt(weightInput.replace(/\D/g, ''), 10);
  const isWeightValid =
    Number.isInteger(weightGrams) &&
    weightGrams >= DELIVERY_TARIFF.minWeightGrams &&
    weightGrams <= DELIVERY_TARIFF.maxWeightGrams;

  const quoteUrl = isWeightValid
    ? `/api/v1/parcels/quote?fromRegion=${encodeURIComponent(fromRegion)}&toRegion=${encodeURIComponent(toRegion)}&weightGrams=${weightGrams}`
    : null;

  const quote = useApiQuery<ParcelQuoteResponse>(quoteUrl);

  const parcels = useApiQuery<ParcelsResponse>('/api/v1/parcels?pageSize=20');

  // Jo'natilgandan keyin ro'yxat yangilanishi uchun.
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (refreshToken === 0) return;

    parcels.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const items = parcels.data?.parcels ?? [];

  const canSubmit = useMemo(
    () =>
      isWeightValid &&
      fromAddress.trim().length >= 10 &&
      toAddress.trim().length >= 10 &&
      recipientName.trim().length >= 2 &&
      recipientPhone.replace(/\D/g, '').length >= 9 &&
      description.trim().length >= 3,
    [isWeightValid, fromAddress, toAddress, recipientName, recipientPhone, description],
  );

  async function send() {
    setIsSending(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await request('/api/v1/parcels', {
        method: 'POST',
        body: {
          fromRegion,
          fromAddress: fromAddress.trim(),
          toRegion,
          toAddress: toAddress.trim(),
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          description: description.trim(),
          weightGrams,
          idempotencyKey,
        },
      });

      // Forma tozalanadi va YANGI kalit yasaladi.
      setFromAddress('');
      setToAddress('');
      setRecipientName('');
      setRecipientPhone('');
      setDescription('');
      setIdempotencyKey(crypto.randomUUID());
      setRefreshToken((current) => current + 1);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.details) {
        setFieldErrors(caught.details);
      }

      setFormError(toUserMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <AppHeader title="Yetkazib berish" />

      <div className="space-y-5 px-4 pt-4">
        {formError && <Alert variant="error">{formError}</Alert>}

        {/* Yo'nalish */}
        <section className="bg-card border-border animate-fade-up rounded-2xl border p-4">
          <h2 className="text-sm font-semibold">Yo&apos;nalish</h2>

          <div className="mt-3 space-y-3">
            <Field id="fromRegion" label="Qayerdan" required>
              <Select
                id="fromRegion"
                value={fromRegion}
                onChange={(event) => setFromRegion(event.target.value)}
                options={REGION_OPTIONS}
                disabled={isSending}
              />
            </Field>

            <Field id="fromAddress" label="Olib ketish manzili" required errors={fieldErrors.fromAddress}>
              <Input
                id="fromAddress"
                value={fromAddress}
                onChange={(event) => setFromAddress(event.target.value)}
                placeholder="Ko'cha, uy, mo'ljal"
                hasError={Boolean(fieldErrors.fromAddress)}
                disabled={isSending}
              />
            </Field>

            <div className="text-muted-foreground flex items-center justify-center py-1">
              <ArrowRight className="size-4 rotate-90" aria-hidden="true" />
            </div>

            <Field id="toRegion" label="Qayerga" required>
              <Select
                id="toRegion"
                value={toRegion}
                onChange={(event) => setToRegion(event.target.value)}
                options={REGION_OPTIONS}
                disabled={isSending}
              />
            </Field>

            <Field id="toAddress" label="Yetkazish manzili" required errors={fieldErrors.toAddress}>
              <Input
                id="toAddress"
                value={toAddress}
                onChange={(event) => setToAddress(event.target.value)}
                placeholder="Ko'cha, uy, mo'ljal"
                hasError={Boolean(fieldErrors.toAddress)}
                disabled={isSending}
              />
            </Field>
          </div>
        </section>

        {/* Posilka */}
        <section className="bg-card border-border rounded-2xl border p-4">
          <h2 className="text-sm font-semibold">Posilka</h2>

          <div className="mt-3 space-y-3">
            <Field
              id="description"
              label="Ichida nima bor"
              required
              hint="Kuryer nima olib ketayotganini bilishi kerak"
              errors={fieldErrors.description}
            >
              <Textarea
                id="description"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Masalan: hujjatlar papkasi"
                hasError={Boolean(fieldErrors.description)}
                disabled={isSending}
              />
            </Field>

            <Field
              id="weight"
              label="Og'irligi (gramm)"
              required
              hint={`${DELIVERY_TARIFF.minWeightGrams} g dan ${DELIVERY_TARIFF.maxWeightGrams / 1_000} kg gacha`}
              errors={fieldErrors.weightGrams}
            >
              <Input
                id="weight"
                inputMode="numeric"
                value={weightInput}
                onChange={(event) => setWeightInput(event.target.value)}
                hasError={Boolean(fieldErrors.weightGrams) || (weightInput !== '' && !isWeightValid)}
                disabled={isSending}
              />
            </Field>
          </div>
        </section>

        {/* Qabul qiluvchi */}
        <section className="bg-card border-border rounded-2xl border p-4">
          <h2 className="text-sm font-semibold">Kim qabul qiladi</h2>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Kuryer yetib borgach shu raqamga qo&apos;ng&apos;iroq qiladi.
          </p>

          <div className="mt-3 space-y-3">
            <Field id="recipientName" label="Ismi" required errors={fieldErrors.recipientName}>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="Masalan: Aziz Karimov"
                hasError={Boolean(fieldErrors.recipientName)}
                disabled={isSending}
              />
            </Field>

            <Field id="recipientPhone" label="Telefon raqami" required errors={fieldErrors.recipientPhone}>
              <Input
                id="recipientPhone"
                inputMode="tel"
                value={recipientPhone}
                onChange={(event) => setRecipientPhone(event.target.value)}
                placeholder="90 123 45 67"
                hasError={Boolean(fieldErrors.recipientPhone)}
                disabled={isSending}
              />
            </Field>
          </div>
        </section>

        {/* Narx */}
        <section className="bg-secondary/50 border-border rounded-2xl border p-4">
          {quote.isLoading && <Skeleton className="h-7 w-40" />}

          {!quote.isLoading && quote.data && (
            <>
              <p className="text-2xl font-semibold tabular-nums">{formatTiyin(quote.data.quote.priceTiyin)}</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {quote.data.quote.breakdown.isCrossRegion ? 'Viloyatlararo' : 'Hudud ichida'}
                {quote.data.quote.breakdown.extraKilograms > 0 &&
                  ` · og'irlik uchun +${quote.data.quote.breakdown.extraWeightSom.toLocaleString('en-US').replace(/,/g, ' ')} so'm`}
              </p>
            </>
          )}

          {!isWeightValid && (
            <p className="text-muted-foreground text-sm">Narxni ko&apos;rish uchun og&apos;irlikni kiriting.</p>
          )}
        </section>

        <Button
          fullWidth
          size="lg"
          onClick={send}
          isLoading={isSending}
          loadingText="Yuborilmoqda..."
          disabled={!canSubmit}
        >
          <Send className="size-4" aria-hidden="true" />
          Jo&apos;natish
        </Button>

        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          To&apos;lov hamyoningizdan yechiladi. Kuryer olib chiqmaguncha bekor qilib, pulni qaytarib olishingiz
          mumkin.
        </p>

        {/* Mening jo'natmalarim */}
        <section>
          <h2 className="mb-3 text-sm font-semibold">Jo&apos;natmalarim</h2>

          {parcels.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          )}

          {!parcels.isLoading && items.length === 0 && (
            <EmptyState
              icon={Package}
              title="Hali jo'natma yo'q"
              description="Birinchi posilkangizni yuqoridagi forma orqali jo'nating."
            />
          )}

          <ul className="space-y-2">
            {items.map((parcel, index) => (
              <li key={parcel.id}>
                <Link
                  href={`/delivery/${parcel.id}`}
                  className="bg-card border-border animate-fade-up block rounded-2xl border p-4 transition-transform active:scale-[0.99]"
                  style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{`${parcel.fromRegion} → ${parcel.toRegion}`}</p>
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {`${parcel.description} · ${formatWeight(parcel.weightGrams)}`}
                      </p>
                    </div>

                    <Badge variant={DELIVERY_STATUS_VARIANTS[parcel.status]} className="shrink-0">
                      {DELIVERY_STATUS_LABELS[parcel.status]}
                    </Badge>
                  </div>

                  <div className="border-border/60 mt-3 flex items-center justify-between gap-3 border-t pt-3">
                    <span className="text-muted-foreground font-mono text-xs">{parcel.parcelNumber}</span>
                    <span className="text-muted-foreground text-xs">{formatRelativeUz(parcel.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
