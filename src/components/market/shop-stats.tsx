import { CalendarDays, MessageCircleQuestion, Package, PackageCheck, Timer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  answerRateTone,
  formatAnswerRate,
  formatCount,
  formatResponseTime,
  formatShopAge,
  responseTone,
} from '@/config/shop-stats';
import type { ShopStatsView, StatTone } from '@/config/shop-stats';
import { cn } from '@/lib/utils';

/**
 * "Sotuvchi haqida" — do'konga ishonch beradigan sonlar.
 *
 * ── Nima uchun bu bo'lim kerak ────────────────────────────────────────
 * Odam notanish do'kondan mahsulot olayotganda mahsulotdan ko'ra
 * SOTUVCHIDAN qo'rqadi: "pulni olib yo'qolib qolmaydimi", "savolimga
 * javob beradimi".
 *
 * Bu yerdagi hamma son bazadagi haqiqiy yozuvlardan hisoblanadi va
 * ularni sotuvchining o'zi o'zgartira olmaydi. Hisob qoidalari
 * `src/config/shop-stats.ts` da izohlangan.
 *
 * ── Nima uchun ba'zi sonlar KO'RSATILMAYDI ────────────────────────────
 * Do'kon yangi bo'lsa, uning javob tezligi haqida hech narsa deb
 * bo'lmaydi. O'shanda "0 soat" yoki "ma'lumot yo'q" degan bo'sh
 * kartochka chizilmaydi — u umuman ko'rsatilmaydi.
 *
 * Bu 38-bosqichda baho bilan qilingan tanlovning davomi: yolg'on
 * son ko'rsatgandan ko'ra, hech narsa ko'rsatmagan yaxshi.
 */

const TONE_CLASSES: Record<StatTone, string> = {
  good: 'text-success',
  normal: 'text-foreground',
  weak: 'text-warning',
};

interface StatItem {
  key: string;
  icon: LucideIcon;
  /** Katta yozuvdagi asosiy qiymat. */
  value: string;
  /** Uning ostidagi tushuntirish. */
  label: string;
  tone: StatTone;
}

/**
 * Ko'rsatkichlardan kartochkalar yasaydi.
 *
 * Alohida funksiya: shu tufayli "qaysi son ko'rsatiladi" qoidasi
 * chizish kodidan ajralib turadi va uni o'qish oson.
 */
function buildStats(stats: ShopStatsView): StatItem[] {
  const items: StatItem[] = [
    {
      key: 'products',
      icon: Package,
      value: formatCount(stats.productCount),
      label: 'mahsulot sotuvda',
      tone: 'normal',
    },
    {
      key: 'age',
      icon: CalendarDays,
      value: formatShopAge(stats.daysOnNavix),
      label: 'Navixda',
      tone: 'normal',
    },
  ];

  /*
    Yetkazilgan buyurtma NOL bo'lsa ko'rsatilmaydi.

    "0 ta buyurtma" yangi do'konni asossiz yomon ko'rsatardi: u
    hali savdoni boshlamagan, xolos.
  */
  if (stats.deliveredCount > 0) {
    items.push({
      key: 'delivered',
      icon: PackageCheck,
      value: formatCount(stats.deliveredCount),
      label: 'buyurtma yetkazilgan',
      tone: 'good',
    });
  }

  const response = stats.response;

  // Savol umuman berilmagan bo'lsa, savol-javob haqida gap yo'q.
  if (response === null) return items;

  /*
    Tezlik faqat YETARLI javob bo'lganda ko'rsatiladi. Chegara va
    uning sababi `MIN_RESPONSE_SAMPLE` da izohlangan.
  */
  if (response.medianHours !== null) {
    items.push({
      key: 'speed',
      icon: Timer,
      value: formatResponseTime(response.medianHours),
      label: 'savolga javob beradi',
      tone: responseTone(response.medianHours),
    });
  }

  /*
    Javob ULUSHI esa har doim ko'rsatiladi — hatto sotuvchi hech
    kimga javob bermagan bo'lsa ham.

    Aks holda yomon ko'rsatkich yashirinardi: "20 savoldan 1 tasiga
    javob bergan" — bu aynan odam bilishi kerak bo'lgan gap.
  */
  items.push({
    key: 'answers',
    icon: MessageCircleQuestion,
    value: `${formatCount(response.answeredCount)} / ${formatCount(response.askedCount)}`,
    label: formatAnswerRate(response),
    tone: answerRateTone(response),
  });

  return items;
}

export interface ShopStatsProps {
  stats: ShopStatsView;
  className?: string;
}

export function ShopStats({ stats, className }: ShopStatsProps) {
  const items = buildStats(stats);

  if (items.length === 0) return null;

  return (
    <section className={className} aria-labelledby="shop-stats-title">
      <h2 id="shop-stats-title" className="mb-3 text-base font-semibold">
        Sotuvchi haqida
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.key} className="bg-card border-border rounded-2xl border p-3">
            <item.icon className="text-muted-foreground mb-2 size-4" aria-hidden="true" />

            <p className={cn('text-sm leading-tight font-semibold', TONE_CLASSES[item.tone])}>
              {item.value}
            </p>

            <p className="text-muted-foreground mt-1 text-xs leading-snug">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
