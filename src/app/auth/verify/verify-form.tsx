'use client';

import { ArrowLeft, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';
import { apiRequest, toUserMessage } from '@/lib/api-client';
import { readPendingGroupInvite } from '@/lib/pending-group-invite';
import { formatUzPhone } from '@/lib/phone';
import { useCountdown } from '@/hooks/use-countdown';
import { otpCodeSchema, phoneSchema } from '@/modules/auth/auth.schemas';
import { useAuth, type AuthSession } from '@/modules/auth/auth-context';

interface ResendResponse {
  phone: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

/** SMS kodni tasdiqlash formasi. */
export function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const resendCountdown = useCountdown();

  const phoneParam = searchParams.get('phone') ?? '';
  const parsedPhone = phoneSchema.safeParse(phoneParam);
  const phone = parsedPhone.success ? parsedPhone.data : null;

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Sahifa ochilganda qayta yuborish taymerini boshlaymiz —
  // kod endigina yuborilgan bo'ladi.
  useEffect(() => {
    resendCountdown.start(60);
    // Faqat bir marta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitCode(codeToSubmit: string) {
    if (!phone) return;

    const parsedCode = otpCodeSchema.safeParse(codeToSubmit);
    if (!parsedCode.success) {
      setError(parsedCode.error.issues[0]?.message ?? "Kod noto'g'ri");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const session = await apiRequest<AuthSession>('/api/v1/auth/verify-otp', {
        method: 'POST',
        body: { phone, code: parsedCode.data },
      });

      setSession(session);

      /**
       * Guruh havolasi orqali kelgan odam O'SHA GURUHGA qaytariladi.
       *
       * ── Nima uchun ─────────────────────────────────────────────────
       * U ro'yxatdan o'tishni guruhga kirish uchun boshlagan edi.
       * Uni "Bosh sahifa" ga tashlash — yo'lni yarmida uzish degani:
       * u qaysi guruhga chaqirilganini eslay olmasligi mumkin va
       * havolani qaytadan qidirishga majbur bo'lardi.
       *
       * Kod bu yerda O'CHIRILMAYDI: guruhga haqiqatan qo'shilgandan
       * keyin o'chiriladi. Aks holda odam sahifani yopib qo'ysa,
       * havola butunlay yo'qolardi.
       */
      const pendingGroup = readPendingGroupInvite();

      router.push(pendingGroup ? `/g/${pendingGroup}` : '/dashboard');
    } catch (caught) {
      setError(toUserMessage(caught));
      setCode('');
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!phone || resendCountdown.isRunning) return;

    setError(null);
    setNotice(null);
    setIsResending(true);

    try {
      const result = await apiRequest<ResendResponse>('/api/v1/auth/resend-otp', {
        method: 'POST',
        body: { phone },
      });

      resendCountdown.start(result.resendAfterSeconds);
      setNotice('Yangi kod yuborildi.');
      setCode('');
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsResending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitCode(code);
  }

  if (!phone) {
    return (
      <div className="space-y-5">
        <Alert variant="error" title="Telefon raqami topilmadi">
          Tasdiqlash sahifasiga to&apos;g&apos;ridan-to&apos;g&apos;ri kirib bo&apos;lmaydi. Iltimos, avval
          ro&apos;yxatdan o&apos;ting.
        </Alert>

        <Button fullWidth asChild>
          <Link href="/auth/register">Ro&apos;yxatdan o&apos;tish</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-muted-foreground text-center text-sm leading-relaxed">
        <span className="text-foreground font-medium">{formatUzPhone(phone)}</span> raqamiga 6 xonali kod
        yuborildi.
      </p>

      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <OtpInput
        value={code}
        onValueChange={setCode}
        onComplete={(completed) => void submitCode(completed)}
        disabled={isSubmitting}
        hasError={Boolean(error)}
      />

      <Button
        type="submit"
        size="lg"
        fullWidth
        isLoading={isSubmitting}
        loadingText="Tekshirilmoqda..."
        disabled={code.length !== 6}
      >
        Tasdiqlash
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
        href="/auth/register"
        className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Raqamni o&apos;zgartirish
      </Link>
    </form>
  );
}
