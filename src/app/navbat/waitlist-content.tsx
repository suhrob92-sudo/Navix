'use client';

import { ArrowRight, Check, PartyPopper, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { WAITLIST_BENEFITS, WAITLIST_SOURCES, type WaitlistSource } from '@/config/waitlist';
import { siteConfig } from '@/config/site';
import { ApiClientError, apiRequest, toUserMessage } from '@/lib/api-client';
import type { FieldErrors } from '@/lib/api/errors';
import {
  formatPosition,
  type WaitlistJoinResponse,
  type WaitlistStatsResponse,
} from '@/modules/waitlist/waitlist.types';

/** `?from=instagram` — ro'yxatdagi qiymatlargina qabul qilinadi. */
function readSource(value: string | null): WaitlistSource | undefined {
  if (!value) return undefined;

  return (WAITLIST_SOURCES as readonly string[]).includes(value) ? (value as WaitlistSource) : undefined;
}

/**
 * Navbatga yozilish formasi.
 *
 * ── Nima uchun faqat TELEFON majburiy ─────────────────────────────────
 * Har bir qo'shimcha maydon yozilishni kamaytiradi. Ism va shahar
 * so'raladi, lekin ular bo'sh qolsa ham yozilish o'tadi.
 *
 * ── Nima uchun `apiRequest`, `useApiClient` emas ──────────────────────
 * Bu sahifa KIRMAGAN odam uchun. `useApiClient` token biriktiradi va
 * 401 da uni yangilashga urinadi — bu yerda token yo'q va bo'lmasligi
 * ham kerak.
 */
export function WaitlistContent() {
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<WaitlistJoinResponse | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  const source = readSource(searchParams.get('from'));

  /**
   * Navbatdagilar soni.
   *
   * Xatosi jimgina yutiladi: bu ikkinchi darajali ma'lumot va uning
   * yuklanmasligi tufayli asosiy ish — yozilish — to'xtab qolmasligi
   * kerak.
   */
  useEffect(() => {
    let cancelled = false;

    apiRequest<WaitlistStatsResponse>('/api/v1/waitlist')
      .then((stats) => {
        if (!cancelled) setTotal(stats.total);
      })
      .catch(() => {
        if (!cancelled) setTotal(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function join(event: React.FormEvent) {
    event.preventDefault();

    setIsSaving(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await apiRequest<WaitlistJoinResponse>('/api/v1/waitlist', {
        method: 'POST',
        body: {
          phone,
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(city.trim() ? { city: city.trim() } : {}),
          ...(source ? { source } : {}),
        },
      });

      setResult(response);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.details) {
        setFieldErrors(caught.details);
      }

      setFormError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  if (result) {
    return (
      <Container className="py-16 sm:py-24">
        <div className="animate-fade-up mx-auto max-w-md text-center">
          <span className="from-primary to-accent shadow-primary/30 mx-auto inline-flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg">
            <PartyPopper className="text-brand-foreground size-8" aria-hidden="true" />
          </span>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance">
            {result.alreadyJoined ? 'Siz allaqachon navbatdasiz' : 'Siz navbatdasiz!'}
          </h1>

          <p className="text-muted-foreground mt-3 leading-relaxed">
            {result.alreadyJoined
              ? "Bu raqam ro'yxatda bor. Ikki marta yozilish shart emas — o'rningiz saqlanib turibdi."
              : 'Ilova ochilgan kuni shu raqamga xabar yuboramiz.'}
          </p>

          <div className="bg-card border-border mt-8 rounded-2xl border p-8">
            <p className="text-muted-foreground text-sm">Navbatdagi o&apos;rningiz</p>
            <p className="text-primary mt-1 text-5xl font-semibold tabular-nums">
              {formatPosition(result.position)}
            </p>
          </div>

          <p className="text-muted-foreground mt-8 text-sm leading-relaxed">
            Yangiliklarni kuzatib boring — ochilish sanasi birinchi bo&apos;lib e&apos;lon qilinadi.
          </p>

          <Button variant="outline" className="mt-4" asChild>
            <Link href="/">
              {siteConfig.name} haqida
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
        {/* Chap tomon — nima uchun */}
        <div className="animate-fade-up text-center lg:text-left">
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Tez orada ochiladi
          </Badge>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {siteConfig.name} ochilganda birinchi bo&apos;lib bilib oling
          </h1>

          <p className="text-muted-foreground mt-4 text-lg leading-relaxed text-balance">
            {siteConfig.tagline}. Raqamingizni qoldiring — ishga tushgan kuni sizga xabar beramiz.
          </p>

          <ul className="mt-8 space-y-4 text-left">
            {WAITLIST_BENEFITS.map((benefit) => (
              <li key={benefit.title} className="flex gap-3">
                <span className="bg-primary/10 text-primary mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-3.5" aria-hidden="true" />
                </span>
                <span>
                  <span className="font-medium">{benefit.title}</span>
                  <span className="text-muted-foreground block text-sm leading-relaxed">
                    {benefit.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {/*
            Son faqat ma'noli bo'lgandan keyin ko'rsatiladi — sabab
            `src/config/waitlist.ts` da.
          */}
          {total !== null && (
            <p className="text-muted-foreground mt-8 text-sm">
              <span className="text-foreground font-semibold tabular-nums">{total}</span> kishi allaqachon navbatda
            </p>
          )}
        </div>

        {/* O'ng tomon — forma */}
        <div className="bg-card/80 border-border animate-fade-up rounded-2xl border p-6 backdrop-blur-xl sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">Navbatga yozilish</h2>
          <p className="text-muted-foreground mt-1 text-sm">Bir daqiqadan kam vaqt oladi.</p>

          {formError && (
            <Alert variant="error" className="mt-4">
              {formError}
            </Alert>
          )}

          <form onSubmit={join} className="mt-6 space-y-4">
            <Field id="phone" label="Telefon raqami" required errors={fieldErrors.phone}>
              <PhoneInput
                id="phone"
                value={phone}
                onValueChange={setPhone}
                hasError={Boolean(fieldErrors.phone)}
                disabled={isSaving}
                autoComplete="tel"
              />
            </Field>

            <Field id="name" label="Ismingiz" hint="Ixtiyoriy" errors={fieldErrors.name}>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Masalan: Aziz"
                hasError={Boolean(fieldErrors.name)}
                disabled={isSaving}
                autoComplete="given-name"
              />
            </Field>

            <Field id="city" label="Shahringiz" hint="Ixtiyoriy" errors={fieldErrors.city}>
              <Input
                id="city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Masalan: Toshkent"
                hasError={Boolean(fieldErrors.city)}
                disabled={isSaving}
              />
            </Field>

            <Button type="submit" fullWidth size="lg" isLoading={isSaving} loadingText="Yozilmoqda...">
              Navbatga yozilish
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </form>

          <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
            Raqamingiz faqat ochilish haqida xabar berish uchun ishlatiladi. Reklama yuborilmaydi va raqamingiz
            uchinchi shaxslarga berilmaydi.
          </p>
        </div>
      </div>
    </Container>
  );
}
