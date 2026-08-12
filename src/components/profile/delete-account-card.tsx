'use client';

import { Trash2, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { useAuth } from '@/modules/auth/auth-context';
import { DELETE_ACCOUNT_CONFIRMATION, deleteAccountSchema } from '@/modules/profile/profile.schemas';

/**
 * Hisobni yopish.
 *
 * ── Nima uchun ALOHIDA karta va oxirida ───────────────────────────────
 * Bu — ilovadagi eng xavfli tugma. U boshqa sozlamalar orasida tursa,
 * tasodifan bosilishi mumkin. Shuning uchun u sahifaning eng pastida,
 * o'zining qizil chegarali kartasida turadi va ikki bosqichda ochiladi.
 *
 * ── Nima uchun IKKI tasdiq ────────────────────────────────────────────
 * Parolni odam yoddan biladi va o'ylamasdan kiritishi mumkin. Qo'lda
 * yozilgan "TASDIQLAYMAN" so'zi esa ongli qadam — bank ilovalarida
 * ham shunday qilinadi.
 */
export function DeleteAccountCard() {
  const request = useApiClient();
  const router = useRouter();
  const { logout } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const parsed = deleteAccountSchema.safeParse({ password, confirmation });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ma'lumot noto'g'ri");

      return;
    }

    setIsDeleting(true);

    try {
      await request('/api/v1/profile', { method: 'DELETE', body: parsed.data });

      /**
       * Sessiya XOTIRADAN ham tozalanadi.
       *
       * Server tokenlarni bekor qildi, lekin brauzerdagi holat
       * qolgan bo'lsa, ilova bir lahza "kirgan" holatda turib,
       * keyin xato ko'rsatardi.
       */
      await logout().catch(() => undefined);

      router.replace('/');
    } catch (caught) {
      setError(toUserMessage(caught));
      setIsDeleting(false);
    }
  }

  return (
    <Card variant="glass" className="border-destructive/30">
      <CardTitle className="text-destructive flex items-center gap-2 text-base">
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        Hisobni yopish
      </CardTitle>

      <CardDescription className="mt-2 leading-relaxed">
        Ism, telefon raqami, rasm va e&apos;lonlaringiz o&apos;chiriladi. To&apos;lovlar va buyurtmalar tarixi
        buxgalteriya uchun anonim holda saqlanadi — unda sizning shaxsingiz ko&apos;rinmaydi.
      </CardDescription>

      {!isOpen ? (
        <div className="mt-5">
          <Button
            variant="outline"
            onClick={() => setIsOpen(true)}
            className="text-destructive border-destructive/40"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Hisobni yopish
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          <Alert variant="warning">
            Bu amalni <strong>qaytarib bo&apos;lmaydi</strong>. Hamyonda pul yoki tugallanmagan buyurtma
            bo&apos;lsa, hisob yopilmaydi — avval ularni yakunlang.
          </Alert>

          <Field id="delete-password" label="Joriy parolingiz">
            <PasswordInput
              id="delete-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={isDeleting}
            />
          </Field>

          <Field id="delete-confirmation" label={`Tasdiqlash uchun "${DELETE_ACCOUNT_CONFIRMATION}" deb yozing`}>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={DELETE_ACCOUNT_CONFIRMATION}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={isDeleting}
            />
          </Field>

          {error && <Alert variant="error">{error}</Alert>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setPassword('');
                setConfirmation('');
                setError(null);
              }}
              disabled={isDeleting}
            >
              Bekor qilish
            </Button>

            <Button type="submit" variant="destructive" isLoading={isDeleting} loadingText="Yopilmoqda...">
              Hisobni butunlay yopish
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
