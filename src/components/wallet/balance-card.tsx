import { ArrowDownLeft, Plus, Wallet } from 'lucide-react';
import Link from 'next/link';

import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';

export interface BalanceCardProps {
  /** Balans TIYINDA. */
  balance: number;
  /** Buyurtmalar uchun band qilingan summa, tiyinda. */
  reserved: number;
  className?: string;
}

/**
 * Hamyonning asosiy kartasi — balans va ikkita tez amal.
 *
 * Gradient fon ataylab: bu sahifadagi eng muhim ma'lumot, foydalanuvchi
 * uni bir qarashda topishi kerak.
 */
export function BalanceCard({ balance, reserved, className }: BalanceCardProps) {
  const available = balance - reserved;

  return (
    <div
      className={cn(
        'from-primary to-accent text-primary-foreground animate-fade-up relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 shadow-lg',
        className,
      )}
    >
      {/* Bezak doira — kartaga hajm beradi */}
      <span
        className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-white/10"
        aria-hidden="true"
      />

      <div className="relative">
        <div className="flex items-center gap-2 text-sm opacity-90">
          <Wallet className="size-4" aria-hidden="true" />
          Mening hamyonim
        </div>

        <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{formatTiyin(balance)}</p>

        {reserved > 0 && (
          <p className="mt-1.5 text-xs opacity-90">
            Band qilingan: {formatTiyin(reserved)} · Sarflash mumkin: {formatTiyin(available)}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <Link
            href="/wallet/topup"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/95 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-transform active:scale-95"
          >
            <Plus className="size-4" aria-hidden="true" />
            To&apos;ldirish
          </Link>

          <Link
            href="/wallet/transfer"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm transition-transform active:scale-95"
          >
            <ArrowDownLeft className="size-4 rotate-180" aria-hidden="true" />
            O&apos;tkazish
          </Link>
        </div>
      </div>
    </div>
  );
}
