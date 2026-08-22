'use client';

import { Check, Copy, Share2, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { referralShareText } from '@/config/referral';
import { siteConfig } from '@/config/site';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzDate } from '@/lib/date';
import type {
  ReferralListResponse,
  ReferralOverview,
} from '@/modules/referral/referral.types';

/**
 * "Do'stlarni taklif qilish" sahifasi.
 *
 * ── Nima uchun MUKOFOT va'da qilinmaydi ───────────────────────────────
 * Ko'p ilova bu sahifada "har bir do'st uchun 10 000 so'm" deb
 * yozadi. Navix bunday qilmaydi va bu ataylab (sababi
 * `config/referral.ts` da).
 *
 * Yolg'on va'da eng yomon yo'l: odam do'stlarini chaqiradi, keyin
 * pul kelmaganda ikkalasi ham ilovaga ishonchini yo'qotadi.
 */
export function InviteFriendsContent() {
  const overview = useApiQuery<ReferralOverview>('/api/v1/referral');
  const invited = useApiQuery<ReferralListResponse>('/api/v1/referral/invited');

  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const data = overview.data;
  const people = invited.data?.people ?? [];

  async function copyLink() {
    if (!data) return;

    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);

      /*
        Belgi ikki soniyadan keyin qaytadi.

        Doimiy "nusxalandi" yozuvi keyingi bosishda hech narsa
        o'zgarmagandek ko'rinardi.
      */
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setShareError("Havolani nusxalab bo'lmadi. Uni qo'lda belgilab oling.");
    }
  }

  async function share() {
    if (!data) return;

    /*
      Telefonda ilovaning O'Z ulashish oynasi ochiladi.

      Kompyuterda bunday imkoniyat yo'q — u yerda havola
      shunchaki nusxalanadi.
    */
    if (typeof navigator.share !== 'function') {
      await copyLink();
      return;
    }

    try {
      await navigator.share({
        title: siteConfig.name,
        text: referralShareText(data.link),
        url: data.link,
      });
    } catch {
      /*
        Odam ulashish oynasini yopgan bo'lishi mumkin — bu xato
        emas. Shuning uchun hech narsa ko'rsatilmaydi.
      */
    }
  }

  return (
    <>
      <AppHeader title="Do'stlarni taklif qilish" showBack backHref="/profile" />

      <div className="space-y-4 px-4 pt-4">
        {overview.error && (
          <Alert variant="error" title="Ma'lumotni yuklab bo'lmadi">
            {overview.error}
          </Alert>
        )}

        {shareError && <Alert variant="error">{shareError}</Alert>}

        {overview.isLoading && <Skeleton className="h-52 rounded-2xl" />}

        {data && (
          <>
            <section className="bg-card border-border rounded-2xl border p-4">
              <h2 className="text-sm font-semibold">Shaxsiy havolangiz</h2>

              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Havolani do&apos;stingizga yuboring. U ro&apos;yxatdan o&apos;tsa, taklif sizning
                hisobingizga yoziladi.
              </p>

              {/*
                Kod ALOHIDA, katta harflar bilan.

                Havolani yubora olmaydigan holat bo'ladi: odam
                telefonda aytadi ("kodim ACDE234"). Shuning uchun
                kod o'qishga qulay ko'rinishda turadi.
              */}
              <p className="bg-secondary mt-3 rounded-xl px-3 py-2 text-center font-mono text-lg font-semibold tracking-[0.2em]">
                {data.code}
              </p>

              <p className="text-muted-foreground mt-2 truncate text-center text-xs">{data.link}</p>

              <div className="mt-3 flex gap-2">
                <Button fullWidth onClick={() => void share()}>
                  <Share2 className="size-4" aria-hidden="true" />
                  Ulashish
                </Button>

                <Button variant="outline" onClick={() => void copyLink()} aria-label="Nusxalash">
                  {copied ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2">
              <div className="bg-card border-border rounded-2xl border p-3">
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Users className="size-3.5" aria-hidden="true" />
                  Qo&apos;shilgan
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{data.joinedCount}</p>
              </div>

              <div className="bg-card border-border rounded-2xl border p-3">
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <UserPlus className="size-3.5" aria-hidden="true" />
                  Tasdiqlanmagan
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{data.pendingCount}</p>

                {/*
                  Nima uchun ikkita son borligini TUSHUNTIRAMIZ.

                  Aks holda odam "nega ikkita raqam?" deb savol
                  bilan qolardi.
                */}
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Telefon kodini kiritmaganlar
                </p>
              </div>
            </section>

            {data.invitedBy && (
              <p className="text-muted-foreground text-center text-xs">
                {`Sizni ${data.invitedBy.name} taklif qilgan`}
              </p>
            )}
          </>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold">Taklif qilganlaringiz</h2>

          {invited.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          )}

          {!invited.isLoading && people.length === 0 && (
            <EmptyState
              icon={Users}
              title="Hali hech kim qo'shilmagan"
              description="Havolani do'stlaringizga yuboring — bu yerda ular ro'yxati paydo bo'ladi."
            />
          )}

          <ul className="space-y-2">
            {people.map((person, index) => (
              <li
                key={`${person.username}-${person.joinedAt}`}
                className="bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-3"
                style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
              >
                <Link href={`/u/${person.username}`} className="shrink-0">
                  <Avatar src={person.avatarUrl} name={person.name} size="md" />
                </Link>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{person.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatUzDate(person.joinedAt, 'long')}
                  </p>
                </div>

                {/*
                  Tasdiqlanmagan hisob ALOHIDA belgilanadi.

                  Uni ro'yxatdan yashirsak, taklif qilgan odam
                  "do'stim kirdi, lekin ko'rinmayapti" deb
                  o'ylardi.
                */}
                {!person.isActive && (
                  <span className="text-muted-foreground bg-secondary shrink-0 rounded-full px-2 py-1 text-xs">
                    Tasdiqlanmagan
                  </span>
                )}
              </li>
            ))}
          </ul>

          {invited.data?.hasMore && (
            <p className="text-muted-foreground mt-3 text-center text-xs">
              Ro&apos;yxatning boshi ko&apos;rsatildi
            </p>
          )}
        </section>
      </div>
    </>
  );
}
