'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Minus,
  PiggyBank,
  TrendingDown,
  Undo2,
  Wallet,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { CategoryList } from '@/components/finance/category-list';
import { MonthPicker } from '@/components/finance/month-picker';
import { StatTile } from '@/components/finance/stat-tile';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzMonth } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { monthKey } from '@/modules/finance/finance.calc';
import type { FinanceSummaryResponse } from '@/modules/finance/finance.types';

/*
  Diagramma AYRIM yuklanadi.

  `recharts` — katta kutubxona (yuzlab kilobayt). Agar u sahifa
  kodiga qo'shilib ketsa, ekran ochilishi mobil internetda sezilarli
  sekinlashardi. `dynamic` esa uni faqat KERAK bo'lganda oladi:
  ma'lumot kelgandan keyin.

  `ssr: false` — diagramma o'lchamni brauzer oynasidan oladi, serverda
  esa oyna yo'q.
*/
const SpendingChart = dynamic(
  () => import('@/components/finance/spending-chart').then((module) => module.SpendingChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-40 rounded-xl" />,
  },
);

/**
 * Moliya markazi — oylik hisobot.
 *
 * Bitta so'rov: `/api/v1/finance/summary` javobida joriy oy ham,
 * o'tgan oy ham bor. Telefon internetida har bir qo'shimcha so'rov
 * sezilarli kechikish demak.
 */
export function FinanceContent() {
  /*
    Joriy oy BIR MARTA hisoblanadi.

    Har chizishda `new Date()` chaqirilsa, yarim tunda ochiq turgan
    ekran o'zi sakrab ketardi.
  */
  const [latestMonth] = useState(() => monthKey(new Date()));
  const [month, setMonth] = useState(latestMonth);

  const { data, isLoading, error } = useApiQuery<FinanceSummaryResponse>(`/api/v1/finance/summary?month=${month}`);

  const summary = data?.summary ?? null;
  const current = summary?.current ?? null;

  /*
    ── HAQIQIY XATO: eski oyning raqamlari YANGI oy nomi ostida ────────
    Oy almashtirilganda so'rov qayta yuboriladi, lekin javob
    kelguncha ekranda AVVALGI oyning raqamlari turadi. Sarlavhada
    esa yangi oy nomi yozilgan bo'ladi — ya'ni odam "avgustda
    1 189 320 so'm sarfladim" degan YOLG'ON raqamni o'qiydi.

    Javobning o'zida oy yozilgan, shuning uchun uni tanlangan oy
    bilan solishtiramiz. Mos kelmasa — hali yuklanyapti.
  */
  const isStale = current !== null && current.month !== month;
  const isBusy = isLoading || isStale;

  const isEmpty = current !== null && current.transactionCount === 0;

  return (
    <>
      <AppHeader title="Moliya markazi" showBack backHref="/wallet" />

      <div className="space-y-4 px-4 pt-4">
        <MonthPicker value={month} latest={latestMonth} onChange={setMonth} />

        {isBusy && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        )}

        {!isBusy && error && (
          <Alert variant="error" title="Hisobotni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isBusy && !error && summary && current && (
          <>
            <p className="text-muted-foreground text-center text-xs">{current.transactionCount} ta amal</p>

            {isEmpty ? (
              <Card padding="none">
                <EmptyState
                  icon={PiggyBank}
                  title="Bu oyda hali amal yo'q"
                  description="To'lov yoki buyurtma qilganingizdan keyin xarajatlaringiz shu yerda toifalarga ajratilib ko'rsatiladi."
                />
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Sarflandi"
                    value={formatTiyin(current.spentTiyin)}
                    icon={TrendingDown}
                    hint="Yalpi chiqim"
                  />
                  <StatTile
                    label="Tushdi"
                    value={formatTiyin(current.receivedTiyin)}
                    icon={Wallet}
                    hint="To'ldirish va daromad"
                  />
                </div>

                {/*
                  Qaytarilgan pul FAQAT bo'lganda ko'rsatiladi.

                  Ko'p oylarda u nol bo'ladi va "0 so'm" yozuvi
                  ekranda foydasiz joy egallardi.
                */}
                {current.refundedTiyin > 0 && (
                  <StatTile
                    label="Qaytarildi"
                    value={formatTiyin(current.refundedTiyin)}
                    icon={Undo2}
                    iconClassName="text-primary"
                    hint={`Sof xarajat: ${formatTiyin(current.netTiyin)}`}
                  />
                )}

                <ComparisonRow
                  changePercent={summary.changePercent}
                  previousMonth={summary.previous.month}
                  previousSpent={summary.previous.spentTiyin}
                />

                <Card padding="none" className="p-4">
                  <h2 className="text-sm font-semibold">Nimaga ketdi</h2>
                  <p className="text-muted-foreground mt-0.5 text-xs">Kattadan kichikka</p>

                  <div className="mt-4">
                    <SpendingChart slices={current.categories} />
                  </div>

                  <div className="mt-2">
                    <CategoryList slices={current.categories} />
                  </div>
                </Card>

                {/*
                  Hisobotdan TARIXGA o'tish.

                  Diagramma "qayerga ketdi" degan savolga javob
                  beradi, lekin "aynan qaysi to'lov?" degan savol
                  darhol ortidan keladi. Havola aynan SHU oyni
                  ochadi — odam tarixda oyni qaytadan izlamaydi.
                */}
                <Link
                  href={`/wallet/history?month=${current.month}`}
                  className="border-border bg-card tap-target flex items-center justify-between gap-2 rounded-xl border p-4"
                >
                  <span className="text-sm font-medium">{formatUzMonth(current.month)} amallari</span>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

/**
 * O'tgan oy bilan solishtirish.
 *
 * ── Nima uchun o'sish YASHIL emas ─────────────────────────────────────
 * Odatda o'sish yaxshi, kamayish yomon deb bo'yaladi. Xarajatda esa
 * TESKARI: ko'p sarflash yutuq emas. Lekin kam sarflash ham har doim
 * yaxshi emas — odam shunchaki kamroq buyurtma bergan bo'lishi mumkin.
 *
 * Shuning uchun bu yerda "yaxshi/yomon" hukmi umuman yo'q: faqat
 * yo'nalish ko'rsatiladi va xulosani odam o'zi chiqaradi.
 */
function ComparisonRow({
  changePercent,
  previousMonth,
  previousSpent,
}: {
  changePercent: number | null;
  previousMonth: string;
  previousSpent: number;
}) {
  const monthLabel = formatUzMonth(previousMonth);

  /*
    O'tgan oyda xarajat bo'lmasa, foiz hisoblab bo'lmaydi (nolga
    bo'lish). "Cheksiz o'sish" deb ko'rsatish yolg'on bo'lardi.
  */
  if (changePercent === null) {
    return (
      <Card padding="none" className="flex items-center gap-3 p-4">
        <Minus className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        <p className="text-muted-foreground text-sm">
          {monthLabel} oyida xarajat bo&apos;lmagan — solishtirib bo&apos;lmaydi.
        </p>
      </Card>
    );
  }

  const isUp = changePercent > 0;
  const isFlat = changePercent === 0;
  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <Card padding="none" className="flex items-center gap-3 p-4">
      <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />

      <p className="text-sm">
        {isFlat ? (
          <>O&apos;tgan oy bilan bir xil</>
        ) : (
          <>
            O&apos;tgan oyga nisbatan{' '}
            <span className="font-semibold tabular-nums">{Math.abs(changePercent)}%</span> {isUp ? "ko'p" : 'kam'}{' '}
            sarfladingiz
          </>
        )}
        <span className="text-muted-foreground block text-xs">
          {monthLabel}: {formatTiyin(previousSpent)}
        </span>
      </p>
    </Card>
  );
}
