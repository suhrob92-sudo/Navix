'use client';

import { ArrowLeft, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { OtpInput } from '@/components/ui/otp-input';
import { PasswordInput } from '@/components/ui/password-input';
import { ApiClientError, apiRequest, toUserMessage } from '@/lib/api-client';
import { formatUzPhone } from '@/lib/phone';
import { useCountdown } from '@/hooks/use-countdown';
import { phoneSchema, resetPasswordFormSchema } from '@/modules/auth/auth.schemas';
import type { FieldErrors } from '@/lib/api/errors';

interface ResendResponse {
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

/** Yangi parol o'rnatish formasi (SMS kod bilan). */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resendCountdown = useCountdown();

  const parsedPhone = phoneSchema.safeParse(searchParams.get('phone') ?? '');
  const phone = parsedPhone.success ? parsedPhone.data : null;

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    resendCountdown.start(60);
    // Faqat bir marta — sahifa ochilganda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phone) return;

    setFormError(null);
    setFieldErrors({});

    const parsed = resetPasswordFormSchema.safeParse({ phone, code, password, passwordConfirm });

    if (!parsed.success) {
      const errors: FieldErrors = {};

      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || '_root';
        errors[key] = [...(errors[key] ?? []), issue.message];
      }

      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest('/api/v1/auth/password/reset', {
        method: 'POST',
        body: { phone: parsed.data.phone, code: parsed.data.code, password: parsed.data.password },
      });

      router.push('/auth/login?reset=1');
    } catch (error) {
      if (error instanceof ApiClientError && error.details) {
        setFieldErrors(error.details);
      }

      setFormError(toUserMessage(error));
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!phone || resendCountdown.isRunning) return;

    setFormError(null);
    setNotice(null);
    setIsResending(true);

    try {
      const result = await apiRequest<ResendResponse>('/api/v1/auth/password/forgot', {
        method: 'POST',
        body: { phone },
      });

      resendCountdown.start(result.resendAfterSeconds);
      setNotice('Yangi kod yuborildi.');
      setCode('');
    } catch (error) {
      setFormError(toUserMessage(error));
    } finally {
      setIsResending(false);
    }
  }

  if (!phone) {
    return (
      <div className="space-y-5">
        <Alert variant="error" title="Telefon raqami topilmadi">
          Iltimos, avval parolni tiklash so&apos;rovini yuboring.
        </Alert>

        <Button fullWidth asChild>
          <Link href="/auth/forgot-password">Parolni tiklash</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <p className="text-muted-foreground text-center text-sm leading-relaxed">
        <span className="text-foreground font-medium">{formatUzPhone(phone)}</span> raqamiga kod yuborildi.
      </p>

      {formError && <Alert variant="error">{formError}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <div className="space-y-2">
        <span className="block text-sm font-medium">Tasdiqlash kodi</span>
        <OtpInput
          value={code}
          onValueChange={setCode}
          disabled={isSubmitting}
          hasError={Boolean(fieldErrors.code)}
        />
        {fieldErrors.code?.map((message) => (
          <p key={message} role="alert" className="text-destructive text-xs">
            {message}
          </p>
        ))}
      </div>

      <Field
        id="password"
        label="Yangi parol"
        required
        hint="Kamida 8 ta belgi, harf va raqam aralash"
        errors={fieldErrors.password}
      >
        <PasswordInput
          id="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          hasError={Boolean(fieldErrors.password)}
          disabled={isSubmitting}
        />
      </Field>

      <Field id="passwordConfirm" label="Parolni takrorlang" required errors={fieldErrors.passwordConfirm}>
        <PasswordInput
          id="passwordConfirm"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          autoComplete="new-password"
          hasError={Boolean(fieldErrors.passwordConfirm)}
          disabled={isSubmitting}
        />
      </Field>

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} loadingText="Saqlanmoqda...">
        Parolni o&apos;zgartirish
      </Button>

      <div className="text-center">
        {resendCountdown.isRunning ? (
          <p className="text-muted-foreground text-sm">
            Yangi kod so&apos;rash: <span className="tabular-nums">{resendCountdown.secondsLeft}</span> soniya
          </p>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={handleResend} isLoading={isResending}>
            <RotateCcw aria-hidden="true" />
            Kodni qayta yuborish
          </Button>
        )}
      </div>

      <Link
        href="/auth/login"
        className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Kirish sahifasiga qaytish
      </Link>
    </form>
  );
}
