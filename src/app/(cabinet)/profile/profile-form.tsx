'use client';

import { AtSign, Check, ImagePlus, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { BIO_MAX_LENGTH } from '@/config/profile';
import { useApiClient } from '@/hooks/use-api';
import { useFileUpload } from '@/hooks/use-file-upload';
import { ApiClientError, toUserMessage } from '@/lib/api-client';
import { formatUzPhone } from '@/lib/phone';
import {
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  MESSAGE_PRIVACY_OPTIONS,
  THEME_OPTIONS,
  TIMEZONE_OPTIONS,
  updateProfileSchema,
} from '@/modules/profile/profile.schemas';
import { usernameSchema } from '@/modules/profile/social.schemas';
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

  const avatar = useFileUpload('AVATAR');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  /** Rasm tanlandi: yuklanadi va ko'rinishga qo'yiladi (saqlash alohida). */
  async function pickAvatar(file: File): Promise<void> {
    const url = await avatar.upload(file);

    if (url) setAvatarUrl(url);
  }
  const [dateOfBirth, setDateOfBirth] = useState(profile.preferences.dateOfBirth?.slice(0, 10) ?? '');
  const [language, setLanguage] = useState(profile.preferences.language);
  const [theme, setTheme] = useState(profile.preferences.theme);
  const [timezone, setTimezone] = useState(profile.preferences.timezone);
  const [marketingOptIn, setMarketingOptIn] = useState(profile.preferences.marketingOptIn);
  const [username, setUsername] = useState(profile.username ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [location, setLocation] = useState(profile.location ?? '');
  const [website, setWebsite] = useState(profile.website ?? '');
  const [gender, setGender] = useState(profile.gender ?? '');
  const [messagePrivacy, setMessagePrivacy] = useState(profile.messagePrivacy);

  /**
   * Serverdan kelgan OXIRGI javob.
   *
   * Javob bilan birga qaysi nom uchun ekani ham saqlanadi: odam
   * yozishda davom etsa, eski javob yangi nomga taalluqli emas va
   * uni ko'rsatish yolg'on bo'lardi.
   */
  const [usernameCheck, setUsernameCheck] = useState<{ username: string; available: boolean } | null>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const trimmedUsername = username.trim().toLowerCase();

  /**
   * Nomni tekshirish KERAKMI.
   *
   * O'zgarmagan yoki hali yaroqsiz nomni serverga yuborishning
   * ma'nosi yo'q.
   */
  const shouldCheckUsername =
    trimmedUsername !== (profile.username ?? '') && usernameSchema.safeParse(trimmedUsername).success;

  /**
   * Ko'rsatiladigan holat RENDER paytida hisoblanadi.
   *
   * Uni alohida `useState` da yuritish mumkin edi, lekin unda holat
   * ikki manbadan (yozilgan nom va kelgan javob) yig'ilib, ular
   * bir-biridan orqada qolib ketardi.
   */
  const usernameStatus: 'idle' | 'checking' | 'free' | 'taken' = !shouldCheckUsername
    ? 'idle'
    : usernameCheck?.username === trimmedUsername
      ? usernameCheck.available
        ? 'free'
        : 'taken'
      : 'checking';

  /**
   * Nom bandligini YOZAYOTGAN paytda tekshiramiz.
   *
   * ── Nima uchun kechikish (debounce) ─────────────────────────────
   * Har bosilgan harf uchun so'rov yuborilsa, "aziz_karimov" yozish
   * 12 ta so'rov qilardi. Yarim soniya kutamiz: odam yozishni
   * to'xtatgach bitta so'rov ketadi.
   */
  useEffect(() => {
    if (!shouldCheckUsername) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const result = await request<{ available: boolean }>(
          `/api/v1/profile/username?username=${encodeURIComponent(trimmedUsername)}`,
        );

        if (!cancelled) setUsernameCheck({ username: trimmedUsername, available: result.available });
      } catch {
        // Tekshirib bo'lmadi — saqlashda baribir baza tekshiradi.
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedUsername, shouldCheckUsername, request]);

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
      username: trimmedUsername,
      bio: bio.trim() || null,
      location: location.trim() || null,
      website: website.trim() || null,
      gender: gender || null,
      messagePrivacy,
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
          {/*
            Avatar ko'rinishi — havola yozilgan zahoti natija ko'rinadi.
            Saqlashdan oldin "rasm to'g'ri keldimi?" degan savolga
            javob shu yerda.
          */}
          <div className="flex items-center gap-4">
            <Avatar src={avatarUrl.trim() || null} name={`${firstName} ${lastName}`} size="lg" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving || avatar.isUploading}
                  isLoading={avatar.isUploading}
                  loadingText="Yuklanmoqda..."
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <ImagePlus className="size-4" aria-hidden="true" />
                  {avatarUrl ? 'Rasmni almashtirish' : 'Rasm yuklash'}
                </Button>

                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSaving || avatar.isUploading}
                    onClick={() => setAvatarUrl('')}
                  >
                    Olib tashlash
                  </Button>
                )}
              </div>

              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                Rasm avtomatik kichraytiriladi. Saqlash tugmasini bosishni unutmang.
              </p>
            </div>

            {/*
              Fayl maydoni YASHIRIN: brauzerning o'z tugmasi har
              qurilmada boshqacha ko'rinadi va uni loyihaning uslubiga
              moslab bo'lmaydi.
            */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];

                // Bir xil faylni ikkinchi marta tanlash uchun maydon tozalanadi.
                event.target.value = '';

                if (file) void pickAvatar(file);
              }}
            />
          </div>

          {avatar.error && <Alert variant="error">{avatar.error}</Alert>}

          <Field
            id="username"
            label="Foydalanuvchi nomi"
            required
            hint="Profil havolangiz shu nom bilan ochiladi"
            errors={fieldErrors.username}
          >
            <div className="relative">
              <AtSign
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                id="username"
                value={username}
                /*
                  Kiritish paytining O'ZIDA tozalanadi: katta harf
                  kichkinaga aylanadi, ruxsat etilmagan belgi umuman
                  yozilmaydi. Shunda odam xatoni saqlashdan keyin
                  emas, darhol ko'radi.
                */
                onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="pl-9"
                autoComplete="username"
                hasError={Boolean(fieldErrors.username) || usernameStatus === 'taken'}
                disabled={isSaving}
              />
            </div>
          </Field>

          {usernameStatus !== 'idle' && (
            <p
              className={
                usernameStatus === 'taken'
                  ? 'text-destructive -mt-3 flex items-center gap-1.5 text-xs'
                  : 'text-muted-foreground -mt-3 flex items-center gap-1.5 text-xs'
              }
              aria-live="polite"
            >
              {usernameStatus === 'checking' && (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Tekshirilmoqda...
                </>
              )}
              {usernameStatus === 'free' && (
                <>
                  <Check className="size-3.5" aria-hidden="true" />
                  Bu nom bo&apos;sh
                </>
              )}
              {usernameStatus === 'taken' && 'Bu nom band. Boshqasini tanlang.'}
            </p>
          )}

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
            id="bio"
            label="O'zingiz haqingizda"
            hint={`${bio.trim().length} / ${BIO_MAX_LENGTH}`}
            errors={fieldErrors.bio}
          >
            <Textarea
              id="bio"
              value={bio}
              onChange={(event) => setBio(event.target.value.slice(0, BIO_MAX_LENGTH))}
              placeholder="Bir necha jumlada o'zingiz haqingizda yozing"
              rows={3}
              hasError={Boolean(fieldErrors.bio)}
              disabled={isSaving}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="location" label="Joylashuv" errors={fieldErrors.location}>
              <Input
                id="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Masalan: Toshkent"
                hasError={Boolean(fieldErrors.location)}
                disabled={isSaving}
              />
            </Field>

            <Field id="website" label="Sayt" hint="https:// bilan boshlansin" errors={fieldErrors.website}>
              <Input
                id="website"
                type="url"
                inputMode="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://navix.uz"
                hasError={Boolean(fieldErrors.website)}
                disabled={isSaving}
              />
            </Field>
          </div>

          <Field id="gender" label="Jins" hint="Ixtiyoriy" errors={fieldErrors.gender}>
            <Select
              id="gender"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              placeholder="Ko'rsatilmasin"
              options={GENDER_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
              disabled={isSaving}
            />
          </Field>

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

      {/* Maxfiylik */}
      <Card variant="glass" className="animate-fade-up" style={{ animationDelay: '150ms' }}>
        <CardTitle className="text-base">Maxfiylik</CardTitle>

        <div className="mt-5">
          <Field
            id="messagePrivacy"
            label="Kim menga xabar yoza oladi"
            hint="Xabar almashish keyingi bosqichda ishga tushadi"
            errors={fieldErrors.messagePrivacy}
          >
            <Select
              id="messagePrivacy"
              value={messagePrivacy}
              onChange={(event) => setMessagePrivacy(event.target.value)}
              options={MESSAGE_PRIVACY_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
              disabled={isSaving}
            />
          </Field>
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
