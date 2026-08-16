'use client';

import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { POST_CATEGORIES } from '@/config/feed-nav';
import { FEED_INTRO_DESTINATION, FEED_INTRO_SLIDES } from '@/config/feed-intro';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { PostCategoryName } from '@/modules/feed/feed.types';
import type { FeedSettingsView } from '@/modules/feed/settings.types';

export interface FeedOnboardingProps {
  /** Tugagach chaqiriladi — qolip endi lentani ko'rsatadi. */
  onDone: (settings: FeedSettingsView) => void;
}

/** Qadamlar: qiziqish + uchta tanishtiruv. */
const TOTAL_STEPS = 1 + FEED_INTRO_SLIDES.length;

/**
 * Feed bilan birinchi tanishuv.
 *
 * ── Nima uchun bu KERAK ───────────────────────────────────────────────
 * Yangi odam Feed'ni birinchi ochganda hech kimga obuna emas va
 * hech narsa tanlamagan. U bo'sh yoki tasodifiy lentaga tushadi,
 * nima qilishni bilmaydi va chiqib ketadi.
 *
 * Uch savol bu muammoni yechadi: nima qiziq → bu yerda nima bor →
 * darhol tomosha.
 *
 * ── Nima uchun oxirida VIDEOGA otiladi ────────────────────────────────
 * Feed'ning yuragi — qisqa video. Odamni matnli lentaga qo'yib
 * yuborsak, u nima uchun bu bo'lim kerakligini his qilmasdi.
 * To'liq ekranli video esa birinchi soniyadanoq ushlab qoladi.
 *
 * ── Nima uchun HAR QADAMDA "o'tkazib yuborish" bor ────────────────────
 * Majburiy tanishtiruv — eng tez uninstall sababi. Shoshayotgan odam
 * uni chetlab o'tishi va keyin o'zi topishi mumkin bo'lishi kerak.
 */
export function FeedOnboarding({ onDone }: FeedOnboardingProps) {
  const router = useRouter();
  const request = useApiClient();

  const dialogRef = useRef<HTMLDialogElement>(null);

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<PostCategoryName[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function toggle(value: PostCategoryName) {
    setPicked((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function finish(interests: PostCategoryName[]) {
    setIsSending(true);
    setError(null);

    try {
      const result = await request<{ settings: FeedSettingsView }>(
        '/api/v1/feed/settings/onboarding',
        { method: 'POST', body: { interests } },
      );

      onDone(result.settings);

      /**
       * Video sahifasiga O'TILADI.
       *
       * `replace` ishlatiladi: odam "orqaga" bosganda tanishtiruvga
       * qaytmasligi kerak — u allaqachon tugagan.
       */
      router.replace(FEED_INTRO_DESTINATION);
    } catch (caught) {
      setError(toUserMessage(caught));
      setIsSending(false);
    }
  }

  const isPicker = step === 0;
  const slide = isPicker ? null : FEED_INTRO_SLIDES[step - 1];
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Feed bilan tanishuv"
      /*
        Oyna Escape bilan YOPILMAYDI (`onCancel` yo'q).

        Yopilsa, ortida bo'sh lenta qolardi va odam nima bo'lganini
        tushunmasdi. Chiqish yo'li ekranning o'zida: har qadamda
        "o'tkazib yuborish" tugmasi bor.
      */
      className="text-foreground bg-background m-0 h-full max-h-none w-full max-w-none p-0 backdrop:bg-black/60"
    >
      <div className="mx-auto flex h-full max-w-lg flex-col px-6 pt-8 pb-8">
        {/* Qadam ko'rsatkichi — odam qancha qolganini ko'radi. */}
        <div className="flex shrink-0 gap-1.5" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                index <= step ? 'bg-primary' : 'bg-secondary',
              )}
            />
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center py-8">
          {isPicker ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <span className="from-brand-from to-brand-to inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br">
                  <Sparkles className="text-brand-foreground size-6" aria-hidden="true" />
                </span>

                <h2 className="text-2xl font-semibold tracking-tight">Nima qiziq?</h2>
                <p className="text-muted-foreground text-sm">
                  Tanlaganlaringiz lentangizda ko&apos;rinadi. Keyin sozlamalardan istalgan vaqt
                  o&apos;zgartirasiz.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {POST_CATEGORIES.map((item) => {
                  const value = item.value as PostCategoryName;
                  const isOn = picked.includes(value);

                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={isOn}
                      onClick={() => toggle(value)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm transition-all active:scale-95',
                        isOn
                          ? 'border-primary bg-primary text-primary-foreground font-medium'
                          : 'border-border hover:bg-secondary',
                      )}
                    >
                      <span aria-hidden="true">{item.emoji}</span>
                      {item.label}
                      {isOn && <Check className="size-3.5" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>

              <p className="text-muted-foreground text-xs">
                {picked.length === 0
                  ? "Hech narsa tanlamasangiz — hammasi ko'rinadi."
                  : `${picked.length} ta bo'lim tanlandi.`}
              </p>
            </div>
          ) : (
            slide && (
              <div className="animate-fade-up space-y-4">
                <span className="bg-secondary text-primary inline-flex size-14 items-center justify-center rounded-2xl">
                  <slide.icon className="size-7" aria-hidden="true" />
                </span>

                <h2 className="text-2xl font-semibold tracking-tight">{slide.title}</h2>
                <p className="text-muted-foreground text-base leading-relaxed">{slide.description}</p>
              </div>
            )
          )}
        </div>

        {error && (
          <Alert variant="error" className="mb-3 shrink-0">
            {error}
          </Alert>
        )}

        <div className="shrink-0 space-y-2">
          <Button
            fullWidth
            size="lg"
            isLoading={isSending}
            loadingText="Tayyorlanmoqda..."
            onClick={() => {
              if (isLast) {
                void finish(picked);

                return;
              }

              setStep((current) => current + 1);
            }}
          >
            {isLast ? 'Videolarni ko\'rish' : 'Davom etish'}
            {!isLast && <ArrowRight className="size-4" aria-hidden="true" />}
          </Button>

          {/*
            "O'tkazib yuborish" ham tanishtiruvni YAKUNLAYDI.

            Aks holda u har safar qaytib chiqardi va odamni
            asabiylashtirardi. Tanlangan qiziqishlar esa saqlanadi:
            odam ularni bekorga bosmagan.
          */}
          <Button
            variant="ghost"
            fullWidth
            disabled={isSending}
            onClick={() => void finish(picked)}
          >
            O&apos;tkazib yuborish
          </Button>
        </div>
      </div>
    </dialog>
  );
}
