'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ServiceIcon } from '@/components/app/service-icon';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { ONBOARDING_SLIDES } from '@/modules/onboarding/onboarding.slides';

/**
 * Tanishtiruv slaydlari — ro'yxatdan o'tgandan keyingi birinchi ekran.
 *
 * ── Nima uchun "O'tkazib yuborish" tugmasi bor ────────────────────────
 * Majburiy tanishtiruv g'ashga tegadi va odam baribir tez-tez bosib
 * o'tib ketadi. Chiqish yo'li ochiq bo'lsa, qolganlar matnni HAQIQATAN
 * o'qiydi.
 *
 * Ikkala yo'l ham bir xil tugaydi: tanishtiruv "ko'rilgan" deb
 * belgilanadi va foydalanuvchi AI Yordamchiga tushadi. U yerda
 * suhbat ichida kutib olish davom etadi.
 *
 * ── Nima uchun serverga yoziladi ──────────────────────────────────────
 * Belgi bazada (`user_profiles.onboardedAt`). Brauzerda saqlansa,
 * boshqa telefondan kirganda tanishtiruv qaytadan chiqardi.
 */
export function WelcomeContent() {
  const router = useRouter();
  const request = useApiClient();

  const [index, setIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slide = ONBOARDING_SLIDES[index];
  const isLast = index === ONBOARDING_SLIDES.length - 1;
  const Icon = slide.icon;

  async function finish() {
    setIsSaving(true);
    setError(null);

    try {
      await request('/api/v1/profile/onboarding', { method: 'POST' });
      router.replace('/assistant?welcome=1');
    } catch (caught) {
      /**
       * Xato bo'lsa ham ilovaga KIRITAMIZ.
       *
       * Tanishtiruv — qulaylik, to'siq emas. Server javob bermagani
       * uchun odamni kirish ekranida ushlab turish mantiqsiz.
       */
      setError(toUserMessage(caught));
      router.replace('/assistant?welcome=1');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 py-8">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={finish}
          disabled={isSaving}
          className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
        >
          O&apos;tkazib yuborish
        </button>
      </div>

      {error && (
        <Alert variant="warning" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {/*
          `key` — slayd almashganda animatsiya qaytadan ishlasin.
          Usiz o'tish "sakrab" ko'rinadi.
        */}
        <div key={slide.id} className="animate-fade-up">
          <ServiceIcon icon={Icon} color={slide.color} size="lg" className="mx-auto" />

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-balance">{slide.title}</h1>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed text-pretty">{slide.body}</p>
        </div>
      </div>

      {/* Nuqtalar — nechta slayd qolganini ko'rsatadi */}
      <div className="flex justify-center gap-2 pb-6" role="tablist" aria-label="Tanishtiruv bosqichlari">
        {ONBOARDING_SLIDES.map((item, position) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={position === index}
            aria-label={`${position + 1}-bosqich`}
            onClick={() => setIndex(position)}
            className={cn(
              'h-2 rounded-full transition-all',
              position === index ? 'bg-primary w-6' : 'bg-border w-2',
            )}
          />
        ))}
      </div>

      <Button
        fullWidth
        size="lg"
        isLoading={isSaving}
        loadingText="Ochilmoqda..."
        onClick={() => (isLast ? void finish() : setIndex((current) => current + 1))}
      >
        {isLast ? 'Boshlaymiz' : 'Keyingisi'}
        {!isLast && <ArrowRight className="size-4" aria-hidden="true" />}
      </Button>
    </div>
  );
}
