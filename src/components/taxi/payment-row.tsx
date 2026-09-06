'use client';

import { AlertCircle, ChevronRight, Wallet } from 'lucide-react';
import Link from 'next/link';

import { formatTiyin } from '@/lib/money';

/**
 * Pul QAYERDAN yechilishini ko'rsatadi.
 *
 * ── Nima uchun bu qator kerak ─────────────────────────────────────────
 * Ilgari ekranda faqat narx turardi. Foydalanuvchi "pul qayerdan
 * yechiladi?" degan savolga javobni faqat safar tugagach — hamyon
 * tarixidan bilib olardi.
 *
 * Bu ayniqsa muhim, chunki pul BUYURTMA paytida yechiladi. Odam
 * kutilmaganda balansi kamayganini ko'rsa, bu ishonchni yo'qotadi.
 *
 * ── Nima uchun "Naqd pul" tanlovi YO'Q ────────────────────────────────
 * Namunadagi dizaynda to'lov usulini tanlash bor. Bizda esa hozircha
 * bitta yo'l — hamyon: naqd to'lov haydovchi bilan hisob-kitobni
 * talab qiladi (kim kimga qancha qarz), karta esa Payme yoki Click
 * shartnomasini.
 *
 * Ishlamaydigan tanlovni ko'rsatish yolg'on bo'lardi: odam "Naqd"
 * ni tanlab, baribir hamyondan pul yechilganini ko'rardi. Shuning
 * uchun bu yerda TANLOV emas, XABAR turadi.
 */

export interface PaymentRowProps {
  /** Hamyondagi mablag' — TIYINDA. */
  balanceTiyin: number;
  /** Safar narxi — TIYINDA. Hali hisoblanmagan bo'lsa `null`. */
  priceTiyin: number | null;
}

export function PaymentRow({ balanceTiyin, priceTiyin }: PaymentRowProps) {
  /*
    Yetarli emasligini FAQAT narx ma'lum bo'lganda aytamiz.

    Narxsiz "pulingiz yetmaydi" deyish mumkin emas: nimaga
    yetmasligi noma'lum.
  */
  const isShort = priceTiyin !== null && balanceTiyin < priceTiyin;

  const shared =
    'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors';

  return (
    <Link
      href="/wallet"
      className={
        isShort
          ? `${shared} border-warning/40 bg-warning/8 hover:bg-warning/12`
          : `${shared} border-border bg-card hover:bg-secondary/50 shadow-sm`
      }
    >
      <span
        className={
          isShort
            ? 'bg-warning/15 text-warning flex size-9 shrink-0 items-center justify-center rounded-xl'
            : 'bg-primary/12 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl'
        }
      >
        {isShort ? (
          <AlertCircle className="size-4" aria-hidden="true" />
        ) : (
          <Wallet className="size-4" aria-hidden="true" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">Hamyon</span>
        <span className="text-muted-foreground block truncate text-xs">
          {isShort
            ? `Yetmaydi — ${formatTiyin(balanceTiyin)}. Hisobni to'ldiring`
            : `${formatTiyin(balanceTiyin)} mavjud`}
        </span>
      </span>

      <ChevronRight className="text-muted-foreground/60 size-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}
