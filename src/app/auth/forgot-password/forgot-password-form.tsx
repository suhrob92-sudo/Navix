'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PhoneInput, toE164 } from '@/components/ui/phone-input';
import { apiRequest, toUserMessage } from '@/lib/api-client';
import { forgotPasswordSchema } from '@/modules/auth/auth.schemas';

/** Parolni tiklash uchun SMS kod so'rash formasi. */
export function ForgotPasswordForm() {
  const router = useRouter();

  const [phoneDigits, setPhoneDigits] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldError(null);

    const parsed = forgotPasswordSchema.safeParse({ phone: toE164(phoneDigits) });

    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Telefon raqami noto'g'ri");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest('/api/v1/auth/password/forgot', { method: 'POST', body: parsed.data });

      router.push(`/auth/reset-password?phone=${encodeURIComponent(parsed.data.phone)}`);
    } catch (error) {
      setFormError(toUserMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <Field
        id="phone"
        label="Telefon raqami"
        required
        hint="Hisobingizga bog'langan raqamni kiriting"
        errors={fieldError ? [fieldError] : undefined}
      >
        <PhoneInput
          id="phone"
          value={phoneDigits}
          onValueChange={setPhoneDigits}
          hasError={Boolean(fieldError)}
          disabled={isSubmitting}
          autoFocus
        />
      </Field>

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} loadingText="Yuborilmoqda...">
        Kod yuborish
        <ArrowRight aria-hidden="true" />
      </Button>

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
