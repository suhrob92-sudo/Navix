'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeedSettings } from '@/hooks/use-feed-settings';
import { cn } from '@/lib/utils';
import {
  COMMENT_SCOPES,
  FOLLOW_SCOPES,
  PROFILE_SCOPES,
  type AudienceScopeName,
  type ScopeChoice,
} from '@/modules/feed/settings.types';

/**
 * Maxfiylik sozlamalari.
 *
 * ── Nima uchun XABAR sozlamasi bu yerda YO'Q ──────────────────────────
 * "Kim menga xabar yozishi mumkin" allaqachon chat modulida bor
 * (`UserProfile.messagePrivacy`) va u butun ilova uchun ishlaydi.
 *
 * Uni bu yerda takrorlasak, ikkita sozlama paydo bo'lardi va qaysi
 * biri kuchda ekani tushunarsiz bo'lardi. Shuning uchun bu yerda
 * faqat HAVOLA turadi — sozlama esa bitta joyda qoladi.
 */
export function PrivacySettingsContent() {
  const { settings, isLoading, error, save } = useFeedSettings();

  return (
    <>
      <AppHeader title="Maxfiylik" showBack backHref="/feed/settings" />

      <div className="pb-tabbar space-y-6 px-4 pt-4">
        {error && <Alert variant="error">{error}</Alert>}

        {isLoading && <Skeleton className="h-64 rounded-2xl" />}

        {!isLoading && (
          <>
            <ScopeSection
              title="Profilimni kim ko'ra oladi"
              hint="Yopiq hisobda profilingiz begonalarga umuman ko'rinmaydi."
              choices={PROFILE_SCOPES}
              value={settings.profileVisibility}
              onChange={(value) => void save({ profileVisibility: value })}
            />

            <ScopeSection
              title="Kim izoh yozishi mumkin"
              hint="Postlaringiz baribir ko'rinadi — faqat izoh yozish cheklanadi."
              choices={COMMENT_SCOPES}
              value={settings.commentScope}
              onChange={(value) => void save({ commentScope: value })}
            />

            <ScopeSection
              title="Menga kim obuna bo'la oladi"
              hint="Mavjud obunachilar saqlanadi — cheklov faqat yangilariga."
              choices={FOLLOW_SCOPES}
              value={settings.followScope}
              onChange={(value) => void save({ followScope: value })}
            />

            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Kim menga xabar yozishi mumkin</h2>

              <Link
                href="/profile/settings"
                className="border-border hover:bg-secondary/50 flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">Ilova sozlamalarida</span>
                  <span className="text-muted-foreground block text-xs">
                    Xabar sozlamasi butun ilova uchun bitta — chat ham, Feed ham shunga bo&apos;ysunadi.
                  </span>
                </span>

                <ChevronRight className="text-muted-foreground size-4.5 shrink-0" aria-hidden="true" />
              </Link>
            </section>
          </>
        )}
      </div>
    </>
  );
}

interface ScopeSectionProps {
  title: string;
  hint: string;
  choices: readonly ScopeChoice[];
  value: AudienceScopeName;
  onChange: (value: AudienceScopeName) => void;
}

/**
 * Bitta savol — uchta javob.
 *
 * ── Nima uchun ochiladigan ro'yxat EMAS ───────────────────────────────
 * Telefonda ochiladigan ro'yxat butun ekranni yopadi va tanlangan
 * qiymatni ko'rish uchun uni ochish kerak bo'ladi. Uchta qator esa
 * doim ko'rinib turadi — odam holatini bir qarashda biladi.
 */
function ScopeSection({ title, hint, choices, value, onChange }: ScopeSectionProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-muted-foreground text-xs">{hint}</p>

      <div
        role="radiogroup"
        aria-label={title}
        className="divide-border border-border divide-y overflow-hidden rounded-2xl border"
      >
        {choices.map((choice) => {
          const isOn = choice.value === value;

          return (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={isOn}
              onClick={() => onChange(choice.value)}
              className="hover:bg-secondary/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
            >
              <span
                className={cn(
                  'inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  isOn ? 'border-primary' : 'border-border',
                )}
              >
                {isOn && <span className="bg-primary size-2.5 rounded-full" />}
              </span>

              <span className={cn('text-sm', isOn && 'font-medium')}>{choice.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
