'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { PhoneInput, toE164 } from '@/components/ui/phone-input';
import { ApiClientError, apiRequest, toUserMessage } from '@/lib/api-client';
import { loginSchema } from '@/modules/auth/auth.schemas';
import { useAuth } from '@/modules/auth/auth-context';
import type { FieldErrors } from '@/lib/api/errors';
import type { AuthSession } from '@/modules/auth/auth-context';

/** Kirish formasi. */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();

  const [phoneDigits, setPhoneDigits] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Kirgandan keyin qaysi sahifaga o'tish kerak. */
  const redirectTo = searchParams.get('next') ?? '/';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ phone: toE164(phoneDigits), password });

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
      const session = await apiRequest<AuthSession>('/api/v1/auth/login', {
        method: 'POST',
        body: parsed.data,
      });

      setSession(session);
      router.push(redirectTo);
    } catch (error) {
      // Telefon tasdiqlanmagan bo'lsa — tasdiqlash sahifasiga yo'naltiramiz.
      if (error instanceof ApiClientError && error.message.includes('tasdiqlanmagan')) {
        router.push(`/auth/verify?phone=${encodeURIComponent(parsed.data.phone)}`);
        return;
      }

      setFormError(toUserMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <Field id="phone" label="Telefon raqami" required errors={fieldErrors.phone}>
        <PhoneInput
          id="phone"
          value={phoneDigits}
          onValueChange={setPhoneDigits}
          hasError={Boolean(fieldErrors.phone)}
          disabled={isSubmitting}
          autoFocus
        />
      </Field>

      <Field id="password" label="Parol" required errors={fieldErrors.password}>
        <PasswordInput
          id="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          hasError={Boolean(fieldErrors.password)}
          disabled={isSubmitting}
        />
      </Field>

      <div className="flex justify-end">
        <Link href="/auth/forgot-password" className="text-primary text-sm font-medium hover:underline">
          Parolni unutdingizmi?
        </Link>
      </div>

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} loadingText="Kirilmoqda...">
        Kirish
        <ArrowRight aria-hidden="true" />
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Hisobingiz yo&apos;qmi?{' '}
        <Link href="/auth/register" className="text-primary font-medium hover:underline">
          Ro&apos;yxatdan o&apos;tish
        </Link>
      </p>
    </form>
  );
}
