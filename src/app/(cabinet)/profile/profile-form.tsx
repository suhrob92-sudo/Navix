'use client';

import { Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, type FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useApiClient } from '@/hooks/use-api';
import { ApiClientError, toUserMessage } from '@/lib/api-client';
import { formatUzPhone } from '@/lib/phone';
import {
  LANGUAGE_OPTIONS,
  THEME_OPTIONS,
  TIMEZONE_OPTIONS,
  updateProfileSchema,
} from '@/modules/profile/profile.schemas';
import type { FieldErrors } from '@/lib/api/errors';
import type { ProfileResponse } from '@/app/(cabinet)/profile/profile-content';

interface ProfileFormProps {
  profile: ProfileResponse;
  onSaved: (profile: ProfileResponse) => void;
}

/**
 * Profil tahrirlash formasi.
 *
 * Ma'lumot PROP orqali keladi va boshlang'ich holat undan olinadi.
 * Shuning uchun `useEffect` bilan holatni sinxronlash kerak emas —
 * bu React tavsiya qiladigan usul (ortiqcha render bo'lmaydi).
 */
export function ProfileForm({ profile, onSaved }: ProfileFormProps) {
  const request = useApiClient();
  const { setTheme: applyTheme } = useTheme();

  const [firstName, setFirstName] = useState(profile.firstName ?? '');
  const [lastName, setLastName] = useState(profile.lastName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(profile.preferences.dateOfBirth?.slice(0, 10) ?? '');
  const [language, setLanguage] = useState(profile.preferences.language);
  const [theme, setTheme] = useState(profile.preferences.theme);
  const [timezone, setTimezone] = useState(profile.preferences.timezone);
  const [marketingOptIn, setMarketingOptIn] = useState(profile.preferences.marketingOptIn);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSaved(false);

    const parsed = updateProfileSchema.safeParse({
      firstName,
      lastName: lastName.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
      dateOfBirth: dateOfBirth || null,
      language,
      theme,
      timezone,
      marketingOptIn,
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
      const updated = await request<ProfileResponse>('/api/v1/profile', {
        method: 'PATCH',
        body: parsed.data,
      });

      onSaved(updated);
      setIsSaved(true);

      // Tanlangan mavzuni darhol qo'llaymiz — foydalanuvchi natijani ko'rsin.
      applyTheme(updated.preferences.theme.toLowerCase());
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
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
      {formError && <Alert variant="error">{formError}</Alert>}
      {isSaved && (
        <Alert variant="success">
          <span className="flex items-center gap-1.5">
            <Check className="size-3.5" aria-hidden="true" />
            Ma&apos;lumotlar saqlandi
          </span>
        </Alert>
      )}

      {/* Shaxsiy ma'lumotlar */}
      <Card variant="glass" className="animate-fade-up" style={{ animationDelay: '90ms' }}>
        <CardTitle className="text-base">Shaxsiy ma&apos;lumotlar</CardTitle>

        <div className="mt-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="firstName" label="Ism" required errors={fieldErrors.firstName}>
              <Input
                id="firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                hasError={Boolean(fieldErrors.firstName)}
                disabled={isSaving}
              />
            </Field>

            <Field id="lastName" label="Familiya" errors={fieldErrors.lastName}>
              <Input
                id="lastName"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                hasError={Boolean(fieldErrors.lastName)}
                disabled={isSaving}
              />
            </Field>
          </div>

          <Field
            id="dateOfBirth"
            label="Tug'ilgan sana"
            hint="Ba'zi xizmatlar yosh chegarasiga ega"
            errors={fieldErrors.dateOfBirth}
          >
            <Input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              hasError={Boolean(fieldErrors.dateOfBirth)}
              disabled={isSaving}
            />
          </Field>

          <Field
            id="avatarUrl"
            label="Profil rasmi havolasi"
            hint="Rasm joylash imkoniyati keyingi bosqichda qo'shiladi"
            errors={fieldErrors.avatarUrl}
          >
            <Input
              id="avatarUrl"
              type="url"
              inputMode="url"
              placeholder="https://..."
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              hasError={Boolean(fieldErrors.avatarUrl)}
              disabled={isSaving}
            />
          </Field>

          <Field id="phone" label="Telefon raqami" hint="Raqamni o'zgartirish keyingi bosqichda qo'shiladi">
            <Input id="phone" value={formatUzPhone(profile.phone)} disabled readOnly />
          </Field>
        </div>
      </Card>

      {/* Sozlamalar */}
      <Card variant="glass" className="animate-fade-up" style={{ animationDelay: '180ms' }}>
        <CardTitle className="text-base">Sozlamalar</CardTitle>

        <div className="mt-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="language" label="Til" errors={fieldErrors.language}>
              <Select
                id="language"
                options={LANGUAGE_OPTIONS}
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                disabled={isSaving}
              />
            </Field>

            <Field id="theme" label="Tashqi ko'rinish" errors={fieldErrors.theme}>
              <Select
                id="theme"
                options={THEME_OPTIONS}
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                disabled={isSaving}
              />
            </Field>
          </div>

          <Field id="timezone" label="Vaqt zonasi" errors={fieldErrors.timezone}>
            <Select
              id="timezone"
              options={TIMEZONE_OPTIONS}
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              disabled={isSaving}
            />
          </Field>

          <div className="border-border/60 border-t pt-5">
            <Switch
              checked={marketingOptIn}
              onCheckedChange={setMarketingOptIn}
              disabled={isSaving}
              label="Chegirma va yangiliklar"
              description="Aksiyalar haqida xabar olishga rozilik. Buyurtma holati haqidagi muhim xabarlar bundan qat'i nazar keladi."
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end pb-4">
        <Button type="submit" size="lg" isLoading={isSaving} loadingText="Saqlanmoqda...">
          Saqlash
        </Button>
      </div>
    </form>
  );
}
