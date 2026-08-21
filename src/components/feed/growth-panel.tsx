'use client';

import { Heart, MessageCircle, Minus, TrendingDown, TrendingUp, UserPlus, Video } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ANALYTICS_PERIODS,
  ANALYTICS_PERIOD_LABELS,
  DEFAULT_ANALYTICS_PERIOD,
  chartMax,
  type AnalyticsPeriod,
} from '@/config/analytics';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { CreatorGrowth, GrowthMetric } from '@/modules/feed/growth.types';

/**
 * "Men o'syapmanmi?" — ijodkor uchun asosiy savol.
 *
 * ── Nima uchun bu panel KERAK edi ─────────────────────────────────────
 * Sahifada sonlar bor edi, lekin ular BOSHIDAN BERI yig'ilgan
 * yig'indi. Yig'indi hech qachon kamaymaydi: bir yil ishlagan odam
 * ham, kecha to'xtagan odam ham bir xil chiroyli sonni ko'radi.
 *
 * Bloger uchun esa yo'nalish muhim. Shuning uchun har bir ko'rsatkich
 * OLDINGI davr bilan taqqoslanadi.
 *
 * ── Nima uchun panel YUQORIDA turadi ──────────────────────────────────
 * Videolar ro'yxati "qaysi videom yaxshi ishladi?" degan savolga
 * javob beradi — bu ikkinchi savol. Birinchisi esa "umuman
 * ishlayaptimi?".
 */
export function GrowthPanel() {
  const [days, setDays] = useState<AnalyticsPeriod>(DEFAULT_ANALYTICS_PERIOD);

  const { data, isLoading, error } = useApiQuery<CreatorGrowth>(`/api/v1/feed/stats/growth?days=${days}`);

  return (
    <section aria-label="O'sish" className="animate-fade-up">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">O&apos;sish</h2>

        <div className="flex gap-1.5" role="tablist" aria-label="Davr">
          {ANALYTICS_PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={value === days}
              onClick={() => setDays(value)}
              className={cn(
                'inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium transition-colors',
                value === days
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              {ANALYTICS_PERIOD_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      {!isLoading && error && (
        <Alert variant="error" title="Ko'rsatkichlarni yuklab bo'lmadi">
          {error}
        </Alert>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              icon={UserPlus}
              label="Yangi obunachi"
              metric={data.followers}
              /* Jami son — o'sish emas, HOLAT. U yerda taqqoslash ma'nosiz. */
              hint={`Jami: ${data.followerTotal}`}
            />
            <MetricCard icon={Heart} label="Yoqtirish" metric={data.likes} />
            <MetricCard icon={MessageCircle} label="Izoh" metric={data.comments} />
            <MetricCard icon={Video} label="Yangi post" metric={data.posts} />
          </div>

          <DailyChart days={data.daily} />
        </>
      )}
    </section>
  );
}

interface MetricCardProps {
  icon: typeof UserPlus;
  label: string;
  metric: GrowthMetric;
  hint?: string;
}

function MetricCard({ icon: Icon, label, metric, hint }: MetricCardProps) {
  return (
    <div className="bg-card border-border rounded-2xl border p-3">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold tabular-nums">{metric.current}</p>

      <ChangeBadge metric={metric} />

      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}

/**
 * O'zgarish nishoni.
 *
 * ── Nima uchun matn ham, belgi ham bor ────────────────────────────────
 * Faqat rang bilan ko'rsatsak (yashil/qizil), rangni ajratmaydigan
 * odam farqni bilmasdi. Strelka va son esa rangsiz ham tushunarli.
 */
function ChangeBadge({ metric }: { metric: GrowthMetric }) {
  const { current, previous, changePercent } = metric;

  if (previous === 0 && current === 0) {
    return (
      <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
        <Minus className="size-3" aria-hidden="true" />
        O&apos;zgarish yo&apos;q
      </p>
    );
  }

  /*
    Oldingi davrda NOL bo'lsa, foiz o'rniga oddiy son ko'rsatiladi.

    "+100%" yoki "+∞%" yolg'on bo'lardi: birinchi obunachi paydo
    bo'lgani "ikki barobar o'sish" emas.
  */
  const isUp = current >= previous;
  const text = changePercent === null ? `${current} ta yangi` : `${changePercent > 0 ? '+' : ''}${changePercent}%`;

  return (
    <p
      className={cn(
        'mt-0.5 flex items-center gap-1 text-xs font-medium',
        isUp ? 'text-success' : 'text-destructive',
      )}
    >
      {isUp ? (
        <TrendingUp className="size-3" aria-hidden="true" />
      ) : (
        <TrendingDown className="size-3" aria-hidden="true" />
      )}
      {text}
      <span className="text-muted-foreground font-normal">{`(oldin ${previous})`}</span>
    </p>
  );
}

/**
 * Kunlik ustunchalar.
 *
 * ── Nima uchun kutubxonasiz ───────────────────────────────────────────
 * Diagramma kutubxonasi 50-100 KB qo'shardi — 23-bosqichda aynan
 * JavaScript hajmi eng katta muammo ekani o'lchangan edi.
 *
 * Bu yerdagi diagramma esa oddiy: balandligi foizda berilgan
 * to'rtburchaklar. Uni chizish uchun kutubxona kerak emas.
 */
function DailyChart({ days }: { days: CreatorGrowth['daily'] }) {
  const max = chartMax(days.map((day) => day.followers + day.likes));
  const hasAny = days.some((day) => day.followers + day.likes > 0);

  if (!hasAny) {
    return (
      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        Bu davrda yangi obunachi ham, yoqtirish ham bo&apos;lmadi. Post joylang — natija shu yerda ko&apos;rinadi.
      </p>
    );
  }

  return (
    <div className="bg-card border-border mt-2 rounded-2xl border p-3">
      {/*
          Ustunlar CHO'ZILADI (`items-stretch`).

          Ilgari bu yerda `items-end` turardi va ustun balandligi
          "mazmun bo'yicha" hisoblanardi — ya'ni NOL. Ichkaridagi
          foizli balandliklar nolga nisbatan hisoblanib, diagramma
          butunlay bo'sh chiqardi.
        */}
      <div className="flex items-stretch gap-1" style={{ height: 96 }}>
        {days.map((day) => (
          <div
            key={day.date}
            className="flex flex-1 flex-col justify-end gap-px"
            /* Ustunchaning o'zi juda tor — izoh bosilganda emas, USTIGA kelganda chiqadi. */
            title={`${formatUzDate(day.date, 'long')}: ${day.followers} obunachi, ${day.likes} yoqtirish`}
          >
            <div className="bg-primary rounded-t-sm" style={{ height: `${(day.followers / max) * 100}%` }} />
            <div className="bg-primary/35 rounded-b-sm" style={{ height: `${(day.likes / max) * 100}%` }} />

            {/*
              Bo'sh kunda ham INGICHKA chiziq qoladi.

              Aks holda faol bo'lmagan kunlar butunlay yo'qolib,
              diagramma buzilgandek ko'rinardi: ustunchalar havoda
              osilib turardi va ular qaysi kunga tegishliligi
              bilinmasdi.
            */}
            <div className="bg-border h-0.5 rounded-full" aria-hidden="true" />
          </div>
        ))}
      </div>

      <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="bg-primary size-2 rounded-full" aria-hidden="true" />
            Obunachi
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-primary/35 size-2 rounded-full" aria-hidden="true" />
            Yoqtirish
          </span>
        </span>

        <span>{formatUzDate(days[0].date)}</span>
      </div>
    </div>
  );
}
