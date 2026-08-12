'use client';

import { Check, KeyRound, ShieldCheck, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { DeleteAccountCard } from '@/components/profile/delete-account-card';
import { PageIntro } from '@/components/app/page-intro';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { useApiClient } from '@/hooks/use-api';
import { ApiClientError, toUserMessage } from '@/lib/api-client';
import { changePasswordFormSchema } from '@/modules/profile/profile.schemas';
import type { FieldErrors } from '@/lib/api/errors';

interface ChangePasswordResponse {
  passwordChanged: boolean;
  revokedSessions: number;
  message: string;
}

/** Xavfsizlik sahifasi — parolni o'zgartirish va himoya holati. */
export function SecurityContent() {
  const request = useApiClient();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    const parsed = changePasswordFormSchema.safeParse({
      currentPassword,
      newPassword,
      newPasswordConfirm,
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

    setIsSaving(true);

    try {
      const result = await request<ChangePasswordResponse>('/api/v1/profile/password', {
        method: 'POST',
        body: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword },
      });

      setSuccessMessage(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.details) {
        setFieldErrors(caught.details);
      }

      setFormError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <AppHeader title="Xavfsizlik" showBack backHref="/profile" />

      <div className="px-4 pt-4">
        <PageIntro description="Parolingiz va hisobingiz himoyasi." />

        {/* Parolni o'zgartirish */}
        <Card variant="glass" className="animate-fade-up">
          <div className="flex items-start gap-3">
            <span className="from-primary/15 to-accent/15 text-primary ring-primary/10 inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1">
              <KeyRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-base">Parolni o&apos;zgartirish</CardTitle>
              <CardDescription className="mt-1">
                Parol o&apos;zgargach boshqa barcha qurilmalar tizimdan chiqariladi.
              </CardDescription>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            {formError && <Alert variant="error">{formError}</Alert>}
            {successMessage && (
              <Alert variant="success">
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5" aria-hidden="true" />
                  {successMessage}
                </span>
              </Alert>
            )}

            <Field id="currentPassword" label="Joriy parol" required errors={fieldErrors.currentPassword}>
              <PasswordInput
                id="currentPassword"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                hasError={Boolean(fieldErrors.currentPassword)}
                disabled={isSaving}
              />
            </Field>

            <Field
              id="newPassword"
              label="Yangi parol"
              required
              hint="Kamida 8 ta belgi, harf va raqam aralash"
              errors={fieldErrors.newPassword}
            >
              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                hasError={Boolean(fieldErrors.newPassword)}
                disabled={isSaving}
              />
            </Field>

            <Field
              id="newPasswordConfirm"
              label="Yangi parolni takrorlang"
              required
              errors={fieldErrors.newPasswordConfirm}
            >
              <PasswordInput
                id="newPasswordConfirm"
                value={newPasswordConfirm}
                onChange={(event) => setNewPasswordConfirm(event.target.value)}
                autoComplete="new-password"
                hasError={Boolean(fieldErrors.newPasswordConfirm)}
                disabled={isSaving}
              />
            </Field>

            <div className="flex justify-end">
              <Button type="submit" isLoading={isSaving} loadingText="Saqlanmoqda...">
                Parolni o&apos;zgartirish
              </Button>
            </div>
          </form>
        </Card>

        {/* Himoya holati */}
        <Card variant="glass" className="animate-fade-up mt-4" style={{ animationDelay: '90ms' }}>
          <CardTitle className="text-base">Himoya holati</CardTitle>

          <ul className="mt-5 space-y-4">
            <SecurityStatusRow
              icon={ShieldCheck}
              title="Telefon raqami tasdiqlangan"
              description="Hisobingiz SMS kod orqali tasdiqlangan."
              isActive
            />

            <SecurityStatusRow
              icon={Smartphone}
              title="Qurilmalar nazorati"
              description="Hisobingizga kirgan barcha qurilmalarni ko'rishingiz va chiqarishingiz mumkin."
              isActive
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/devices">Ko&apos;rish</Link>
                </Button>
              }
            />

            <SecurityStatusRow
              icon={KeyRound}
              title="Ikki bosqichli himoya (2FA)"
              description="Keyingi bosqichlarda qo'shiladi — kirish uchun qo'shimcha kod talab qilinadi."
              isActive={false}
            />
          </ul>
        </Card>

        {/*
          Hisobni yopish — sahifaning ENG PASTIDA.

          Bu ilovadagi eng xavfli amal. Boshqa sozlamalar orasida
          tursa, tasodifan bosilishi mumkin edi.
        */}
        <div className="mt-4 pb-4">
          <DeleteAccountCard />
        </div>
      </div>
    </>
  );
}

interface SecurityStatusRowProps {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  isActive: boolean;
  action?: React.ReactNode;
}

function SecurityStatusRow({ icon: Icon, title, description, isActive, action }: SecurityStatusRowProps) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={
          isActive
            ? 'bg-success/12 text-success inline-flex size-9 shrink-0 items-center justify-center rounded-lg'
            : 'bg-secondary text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-lg'
        }
      >
        <Icon className="size-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </li>
  );
}
