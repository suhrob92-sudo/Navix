'use client';

import { ShieldCheck, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { APPEAL_HINT, APPEAL_SUBJECT_PREFIX } from '@/config/moderation-reasons';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzDate } from '@/lib/date';
import type { ContentRemovalListResponse, ContentRemovalView } from '@/modules/moderation/moderation.types';

/**
 * "Yozuvlarim va qoidalar" — muallif uchun qarorlar ro'yxati.
 *
 * ── Nima uchun bu sahifa KERAK ────────────────────────────────────────
 * Ilgari moderator postni yashirsa, u jimgina yo'qolardi. Muallif
 * nima bo'lganini bilmasdi: o'zi o'chirib qo'ydimi, xatolikmi yoki
 * jazolandimi — farqi ko'rinmasdi.
 *
 * Bildirishnoma yuboriladi, lekin u bir marta o'qiladi va ro'yxatda
 * ko'milib ketadi. Qaror esa KEYIN kerak bo'ladi: odam e'tiroz
 * yozmoqchi bo'lganda yoki "nega ikkinchi marta?" deb so'raganda.
 *
 * ── Nima uchun E'TIROZ tugmasi yordam xizmatini ochadi ────────────────
 * E'tiroz uchun alohida navbat qurish mumkin edi. Lekin `/support`
 * allaqachon ishlaydi: murojaat raqami, yozishma, holat va
 * bildirishnoma — hammasi bor.
 *
 * Ikkinchi, deyarli bir xil tizim ikkalasini ham yarim tashlab
 * qo'yish demak edi.
 */
export function ModerationContent() {
  const { data, isLoading, error } = useApiQuery<ContentRemovalListResponse>('/api/v1/moderation/removals');

  const removals = data?.removals ?? [];

  return (
    <>
      <AppHeader title="Qoidalar va qarorlar" showBack backHref="/profile" />

      <div className="space-y-3 px-4 pt-4">
        {!isLoading && error && (
          <Alert variant="error" title="Ro'yxatni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {isLoading && (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        )}

        {!isLoading && !error && removals.length === 0 && (
          <EmptyState
            icon={ShieldCheck}
            title="Hammasi joyida"
            description="Yozuvlaringizdan birortasi olib tashlanmagan. Qoidabuzarlik bo'lsa, sababi shu yerda ko'rinadi."
          />
        )}

        {removals.map((removal) => (
          <RemovalCard key={removal.id} removal={removal} />
        ))}
      </div>
    </>
  );
}

/**
 * Murojaat matni OLDINDAN to'ldiriladi.
 *
 * ── Nima uchun ─────────────────────────────────────────────────────────
 * Bo'sh murojaat oynasiga tushgan odam "postim o'chirilgan" deb
 * yozadi va xodim qaysi post ekanini so'rab, yana bir kun yo'qotadi.
 * Sarlavhada tur va nom turgani ikkala tomonning ham vaqtini
 * tejaydi.
 */
function appealHref(removal: ContentRemovalView): string {
  const subject = `${APPEAL_SUBJECT_PREFIX}: ${removal.kindLabel} — ${removal.title}`;
  const message = `Sabab: ${removal.reasonLabel}. ${removal.notice}\n\nMening izohim: `;

  const query = new URLSearchParams({ category: 'OTHER', subject, message });

  return `/support/new?${query.toString()}`;
}

function RemovalCard({ removal }: { removal: ContentRemovalView }) {
  return (
    <article className="bg-card border-border animate-fade-up space-y-3 rounded-2xl border p-4">
      <div className="flex items-start gap-3">
        <span
          className={
            removal.isRestored
              ? 'bg-secondary text-muted-foreground rounded-xl p-2'
              : 'bg-destructive/10 text-destructive rounded-xl p-2'
          }
        >
          {removal.isRestored ? (
            <ShieldCheck className="size-5" aria-hidden="true" />
          ) : (
            <ShieldAlert className="size-5" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="line-clamp-2 text-sm font-medium">{removal.title}</p>
            <Badge variant={removal.isRestored ? 'secondary' : 'destructive'}>
              {removal.isRestored ? 'Qaytarilgan' : removal.reasonLabel}
            </Badge>
          </div>

          <p className="text-muted-foreground mt-0.5 text-xs">
            {`${removal.kindLabel} · ${formatUzDate(removal.createdAt, 'long')}`}
          </p>
        </div>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">{removal.notice}</p>

      {removal.isRestored ? (
        <p className="text-xs font-medium">
          {`Qaror qayta ko'rib chiqildi — yozuv ${formatUzDate(removal.restoredAt!, 'long')} da qaytarildi.`}
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-xs leading-relaxed">{APPEAL_HINT}</p>

          <Button asChild variant="outline" size="sm">
            <Link href={appealHref(removal)}>E&apos;tiroz bildirish</Link>
          </Button>
        </>
      )}
    </article>
  );
}
