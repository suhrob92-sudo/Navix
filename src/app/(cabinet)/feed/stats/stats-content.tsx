/* eslint-disable @next/next/no-img-element */
'use client';

import {
  BarChart3,
  Bookmark,
  Clapperboard,
  Eye,
  Heart,
  MessageCircle,
  MousePointerClick,
  Share2,
  ShoppingBag,
  Video,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app/app-header';
import { GrowthPanel } from '@/components/feed/growth-panel';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatTiyin } from '@/lib/money';
import { formatRelativeUz } from '@/lib/date';
import { RequireAuth } from '@/modules/auth/require-auth';
import { conversionPercent, type VideoStatRow, type VideoStatsResponse } from '@/modules/feed/feed.types';
import { formatDuration } from '@/modules/upload/upload.types';

/**
 * "Videolarim natijasi" — sotuvchi uchun asosiy sahifa.
 *
 * ── Nima uchun bu sahifa KERAK ───────────────────────────────────────
 * Video yozish — mehnat: kadr o'ylash, suratga olish, matn yozish.
 * Odam bu mehnatni FAQAT natijani ko'rsa takrorlaydi.
 *
 * "Videoingiz 1200 marta ko'rildi va 3 ta buyurtma keltirdi" degan
 * javob — keyingi videoni yozishga undaydigan yagona narsa.
 *
 * ── Nima uchun sonlar YONMA-YON turadi ───────────────────────────────
 * Alohida "ko'rishlar" va alohida "buyurtmalar" sahifasi savolga
 * javob bermasdi. Haqiqiy savol — QAYSI video ishlayapti — faqat
 * sonlar bir qatorda turganda ko'rinadi.
 */
export function VideoStatsContent() {
  return (
    <RequireAuth>
      <StatsBody />
    </RequireAuth>
  );
}

function StatsBody() {
  const { data, isLoading, error } = useApiQuery<VideoStatsResponse>('/api/v1/feed/stats');

  const videos = data?.videos ?? [];
  const totals = data?.totals;

  return (
    <>
      <AppHeader title="Natijalarim" showBack backHref="/feed" />

      <div className="space-y-4 px-4 pt-4">
        {/*
          O'sish paneli ENG TEPADA.

          Videolar ro'yxati "qaysi videom yaxshi ishladi?" degan
          savolga javob beradi. Lekin birinchi savol boshqa:
          "men umuman o'syapmanmi?". Yig'indi sonlar unga javob
          bermaydi — ular hech qachon kamaymaydi.

          Panel videolardan MUSTAQIL yuklanadi: biri kechiksa
          ikkinchisi kutib turmaydi.
        */}
        <GrowthPanel />

        {error && (
          <Alert variant="error" title="Statistikani yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        )}

        {!isLoading && !error && videos.length === 0 && (
          <EmptyState
            icon={Clapperboard}
            title="Hali video joylamagansiz"
            description="Mahsulotingizni videoda ko'rsating — u yerdagi tugma xaridorni to'g'ri savdo sahifasiga olib boradi."
            action={
              <Button asChild variant="outline">
                <Link href="/feed">Video joylash</Link>
              </Button>
            }
          />
        )}

        {/* Umumiy natija — eng tepada, bir qarashda. */}
        {totals && videos.length > 0 && (
          <section className="bg-card border-border rounded-2xl border p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="size-4" aria-hidden="true" />
              {`Umumiy natija (${totals.videoCount} ta video)`}
            </h2>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Metric icon={Eye} label="Ko'rishlar" value={String(totals.viewCount)} />
              <Metric icon={MousePointerClick} label="Mahsulot ochildi" value={String(totals.clickCount)} />
              <Metric icon={ShoppingBag} label="Buyurtmalar" value={String(totals.orderCount)} />
              <Metric icon={Wallet} label="Savdo" value={formatTiyin(totals.revenueTiyin)} />
            </div>

            {/*
              Nisbat — SONLARDAN muhimroq.

              "1000 ko'rish" yaxshi eshitiladi, lekin undan atigi
              3 kishi mahsulotni ochgan bo'lsa, video qiziqarli-yu,
              reklama ishlamayapti degani.
            */}
            {totals.viewCount > 0 && (
              <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                {`Ko'rgan odamlarning ${conversionPercent(totals.clickCount, totals.viewCount)}% i mahsulotni ochdi` +
                  (totals.clickCount > 0
                    ? `, ochganlarning ${conversionPercent(totals.orderCount, totals.clickCount)}% i buyurtma berdi.`
                    : '.')}
              </p>
            )}
          </section>
        )}

        {videos.map((video) => (
          <VideoRow key={video.postId} video={video} />
        ))}

        {videos.length > 0 && (
          <p className="text-muted-foreground pb-2 text-xs leading-relaxed">
            Buyurtma videoga bog&apos;lanadi, agar xaridor mahsulotni AYNAN shu videodan ochgan bo&apos;lsa
            va 7 kun ichida sotib olsa. Bekor qilingan buyurtmalar sanalmaydi.
          </p>
        )}
      </div>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-secondary/40 rounded-xl p-3">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function VideoRow({ video }: { video: VideoStatRow }) {
  return (
    <article className="bg-card border-border rounded-2xl border p-4">
      <div className="flex items-start gap-3">
        {/* Muqova — qaysi video ekanini SO'ZSIZ tanitadi. */}
        <Link href={`/feed/${video.postId}`} className="shrink-0">
          {video.posterUrl ? (
            <img
              src={video.posterUrl}
              alt=""
              loading="lazy"
              className="border-border h-16 w-12 rounded-lg border object-cover"
            />
          ) : (
            <span className="bg-secondary text-muted-foreground flex h-16 w-12 items-center justify-center rounded-lg">
              <Video className="size-5" aria-hidden="true" />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={`/feed/${video.postId}`} className="block text-sm font-medium hover:underline">
            {video.title}
          </Link>

          <p className="text-muted-foreground mt-0.5 text-xs">
            {formatRelativeUz(video.createdAt)}
            {video.videoSeconds !== null && ` · ${formatDuration(video.videoSeconds)}`}
          </p>

          {video.attachmentNames.length > 0 && (
            <p className="text-muted-foreground mt-1 truncate text-xs">
              {video.attachmentNames.join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Asosiy zanjir: ko'rdi → ochdi → sotib oldi. */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Cell icon={Eye} label="Ko'rdi" value={String(video.viewCount)} />
        <Cell
          icon={MousePointerClick}
          label="Ochdi"
          value={String(video.clickCount)}
          hint={video.viewCount > 0 ? `${conversionPercent(video.clickCount, video.viewCount)}%` : undefined}
        />
        <Cell
          icon={ShoppingBag}
          label="Sotib oldi"
          value={String(video.orderCount)}
          hint={video.clickCount > 0 ? `${conversionPercent(video.orderCount, video.clickCount)}%` : undefined}
        />
      </div>

      {video.revenueTiyin > 0 && (
        <p className="text-success mt-3 flex items-center gap-1.5 text-sm font-semibold">
          <Wallet className="size-4" aria-hidden="true" />
          {`${formatTiyin(video.revenueTiyin)} savdo`}
        </p>
      )}

      {/*
        Ijtimoiy sonlar PASTDA va kichikroq.

        Ular ham qiziq, lekin sotuvchi uchun asosiy savol — pul.
        Yoqtirishlar tepada tursa, u haqiqiy natijani to'sib qo'yardi.
      */}
      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <Small icon={Heart} value={video.likeCount} label="yoqtirish" />
        <Small icon={MessageCircle} value={video.commentCount} label="izoh" />
        <Small icon={Share2} value={video.shareCount} label="ulashish" />
        <Small icon={Bookmark} value={video.saveCount} label="saqlash" />
      </div>
    </article>
  );
}

function Cell({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-secondary/40 rounded-xl p-2.5 text-center">
      <Icon className="text-muted-foreground mx-auto size-4" aria-hidden="true" />
      <p className="mt-1 text-base font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">
        {label}
        {hint && <span className="ml-1 tabular-nums">{hint}</span>}
      </p>
    </div>
  );
}

function Small({ icon: Icon, value, label }: { icon: typeof Eye; value: number; label: string }) {
  return (
    <span className="flex items-center gap-1" title={label}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="tabular-nums">{value}</span>
    </span>
  );
}
