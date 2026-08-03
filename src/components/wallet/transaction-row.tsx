import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Gift,
  RotateCcw,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';

import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import { TRANSACTION_TYPE_LABELS, type WalletTransaction } from '@/modules/wallet/wallet.types';

/**
 * Amal ikonkalari.
 *
 * O'tkazma ikkiga ajratilgan: turi bir xil bo'lsa ham, yuboruvchi uchun
 * strelka yuqoriga (chiqim), qabul qiluvchi uchun pastga (kirim) qaraydi.
 */
const TYPE_ICONS: Record<string, LucideIcon> = {
  TOP_UP: CreditCard,
  WITHDRAWAL: ArrowUpRight,
  PAYMENT: ShoppingBag,
  REFUND: RotateCcw,
  TRANSFER_in: ArrowDownLeft,
  TRANSFER_out: ArrowUpRight,
  BONUS: Gift,
};

/** Ikonkalar jadvalidagi kalit. */
function iconKey(transaction: WalletTransaction): string {
  return transaction.type === 'TRANSFER' ? `TRANSFER_${transaction.direction}` : transaction.type;
}

/** Sanani "Bugun, 14:30" ko'rinishida chiqaradi. */
function formatTransactionDate(iso: string): string {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat('uz-UZ', { hour: '2-digit', minute: '2-digit' }).format(date);

  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) return `Bugun, ${time}`;

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Kecha, ${time}`;

  const day = new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short' }).format(date);
  return `${day}, ${time}`;
}

export interface TransactionRowProps {
  transaction: WalletTransaction;
  className?: string;
}

/** Tarixdagi bitta qator. */
export function TransactionRow({ transaction, className }: TransactionRowProps) {
  const Icon = TYPE_ICONS[iconKey(transaction)];
  const isIncoming = transaction.direction === 'in';
  const isFailed = transaction.status === 'FAILED' || transaction.status === 'REVERSED';

  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      <span
        className={cn(
          'inline-flex size-10 shrink-0 items-center justify-center rounded-xl',
          isIncoming ? 'bg-success/12 text-success' : 'bg-secondary text-muted-foreground',
        )}
      >
        <Icon className="size-4.5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {transaction.description ?? TRANSACTION_TYPE_LABELS[transaction.type]}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatTransactionDate(transaction.createdAt)}
          {transaction.status === 'PENDING' && ' · Kutilmoqda'}
          {isFailed && ' · Bekor qilindi'}
        </p>
      </div>

      <p
        className={cn(
          'shrink-0 text-sm font-semibold tabular-nums',
          isFailed && 'text-muted-foreground line-through',
          !isFailed && isIncoming && 'text-success',
        )}
      >
        {isIncoming ? '+' : '−'}
        {formatTiyin(transaction.amount)}
      </p>
    </div>
  );
}
