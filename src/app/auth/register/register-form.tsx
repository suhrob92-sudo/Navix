'use client';

import { ArrowRight, Phone, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { PhoneInput, toE164 } from '@/components/ui/phone-input';
import { PRIVACY_POLICY, TERMS_OF_USE, legalHref } from '@/config/legal';
import { ApiClientError, apiRequest, toUserMessage } from '@/lib/api-client';
import { registerFormSchema } from '@/modules/auth/auth.schemas';
import type { FieldErrors } from '@/lib/api/errors';

interface RegisterResponse {
  phone: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

/**
 * Ro'yxatdan o'tish formasi.
 *
 * Ma'lumotlar avval BRAUZERDA tekshiriladi (tez javob), keyin SERVERDA
 * qayta tekshiriladi (xavfsizlik). Ikkalasi ham bir xil Zod sxemasidan
 * foydalanadi — qoidalar hech qachon ikkiga bo'linmaydi.
 */
export function RegisterForm() {
  const router = useRouter();

  const [phoneDigits, setPhoneDigits] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = registerFormSchema.safeParse({
      phone: toE164(phoneDigits),
      firstName,
      lastName: lastName.trim() || undefined,
      password,
      passwordConfirm,
    });

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
      await apiRequest<RegisterResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: {
          phone: parsed.data.phone,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          password: parsed.data.password,
        },
      });

      // Kod yuborildi — tasdiqlash sahifasiga o'tamiz.
      router.push(`/auth/verify?phone=${encodeURIComponent(parsed.data.phone)}`);
    } catch (error) {
      if (error instanceof ApiClientError && error.details) {
        setFieldErrors(error.details);
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

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="firstName" label="Ism" required errors={fieldErrors.firstName}>
          <Input
            id="firstName"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Ali"
            autoComplete="given-name"
            leading={<User />}
            hasError={Boolean(fieldErrors.firstName)}
            disabled={isSubmitting}
          />
        </Field>

        <Field id="lastName" label="Familiya" errors={fieldErrors.lastName}>
          <Input
            id="lastName"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Valiyev"
            autoComplete="family-name"
            hasError={Boolean(fieldErrors.lastName)}
            disabled={isSubmitting}
          />
        </Field>
      </div>

      <Field
        id="password"
        label="Parol"
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

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} loadingText="Yuborilmoqda...">
        Davom etish
        <ArrowRight aria-hidden="true" />
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Hisobingiz bormi?{' '}
        <Link href="/auth/login" className="text-primary font-medium hover:underline">
          Kirish
        </Link>
      </p>

      <p className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
        <Phone className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Raqamingizga 6 xonali tasdiqlash kodi yuboriladi. SMS xizmati bepul.
      </p>

      {/*
        Rozilik ALOHIDA katakcha emas, matn.

        Katakcha qo'yilsa, odam uni o'qimasdan bosardi va "rozilik"
        shunchaki bir bosishga aylanardi. Bu yerda esa shart aniq
        yozilgan va hujjatlarning o'zi bir bosish narida — davom
        etish roziligini bildiradi.
      */}
      <p className="text-muted-foreground text-center text-xs leading-relaxed">
        Davom etish orqali siz{' '}
        <Link href={legalHref(TERMS_OF_USE.slug)} className="hover:text-foreground underline">
          {TERMS_OF_USE.title.toLowerCase()}
        </Link>{' '}
        va{' '}
        <Link href={legalHref(PRIVACY_POLICY.slug)} className="hover:text-foreground underline">
          {PRIVACY_POLICY.title.toLowerCase()}
        </Link>
        ga rozilik bildirasiz.
      </p>
    </form>
  );
}
