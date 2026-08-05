import {
  ArrowDownLeft,
  ArrowUpRight,
  Bike,
  CreditCard,
  Gift,
  RotateCcw,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';

import { formatRelativeUz } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
  TRANSACTION_TYPE_LABELS,
  type WalletTransaction,
  type WalletTransactionType,
} from '@/modules/wallet/wallet.types';

/**
 * Ikonkalar jadvalidagi kalit.
 *
 * O'tkazma ikkiga ajratilgan: turi bir xil bo'lsa ham, yuboruvchi uchun
 * strelka yuqoriga (chiqim), qabul qiluvchi uchun pastga (kirim) qaraydi.
 */
type IconKey = Exclude<WalletTransactionType, 'TRANSFER'> | 'TRANSFER_in' | 'TRANSFER_out';

/**
 * Amal ikonkalari.
 *
 * ── Nima uchun kalit turi ANIQ ────────────────────────────────────────
 * Ilgari bu `Record<string, LucideIcon>` edi. Shu sababli yangi amal
 * turi (`EARNING`) qo'shilganda TypeScript jimgina o'tkazib yubordi,
 * ijro paytida esa `Icon` `undefined` bo'lib butun tarix sahifasi
 * ishlamay qoldi — xato haqiqiy brauzer sinovida topildi.
 *
 * Endi kalit turi aniq: yangi tur qo'shilib, ikonkasi yozilmasa,
 * loyiha KOMPILYATSIYA bo'lmaydi.
 */
const TYPE_ICONS: Record<IconKey, LucideIcon> = {
  TOP_UP: CreditCard,
  WITHDRAWAL: ArrowUpRight,
  PAYMENT: ShoppingBag,
  REFUND: RotateCcw,
  TRANSFER_in: ArrowDownLeft,
  TRANSFER_out: ArrowUpRight,
  BONUS: Gift,
  EARNING: Bike,
};

function iconKey(transaction: WalletTransaction): IconKey {
  return transaction.type === 'TRANSFER' ? `TRANSFER_${transaction.direction}` : transaction.type;
}

export interface TransactionRowProps {
  transaction: WalletTransaction;
  className?: string;
}

/** Tarixdagi bitta qator. */
export function TransactionRow({ transaction, className }: TransactionRowProps) {
  // Noma'lum tur kelsa ham sahifa ishlashda davom etsin: bazadagi eski
  // yozuvda kutilmagan qiymat bo'lishi mumkin.
  const Icon = TYPE_ICONS[iconKey(transaction)] ?? CreditCard;
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
          {formatRelativeUz(transaction.createdAt)}
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
