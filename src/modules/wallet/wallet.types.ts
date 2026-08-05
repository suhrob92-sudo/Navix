/**
 * Brauzer tomonida ishlatiladigan hamyon turlari.
 *
 * Nima uchun `wallet.service.ts` dan import qilinmaydi: u fayl Prisma va
 * bazaga bog'liq — brauzer paketiga tushmasligi kerak. Shuning uchun
 * javob shakli shu yerda alohida tasvirlangan.
 */

export type WalletTransactionType =
  | 'TOP_UP'
  | 'WITHDRAWAL'
  | 'PAYMENT'
  | 'REFUND'
  | 'TRANSFER'
  | 'BONUS'
  | 'EARNING';

export type WalletTransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  /** Summa TIYINDA — har doim musbat. */
  amount: number;
  balanceAfter: number;
  direction: 'in' | 'out';
  description: string | null;
  sourceModule: string;
  createdAt: string;
  completedAt: string | null;
}

export interface WalletSummary {
  id: string;
  balance: number;
  reserved: number;
  available: number;
  currency: string;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  recentTransactions: WalletTransaction[];
}

export interface TransactionsResponse {
  transactions: WalletTransaction[];
}

export interface TransferRecipient {
  name: string;
  isSelf: boolean;
}

/** Har bir amal turi uchun o'zbekcha nom. */
export const TRANSACTION_TYPE_LABELS: Record<WalletTransactionType, string> = {
  TOP_UP: "To'ldirish",
  WITHDRAWAL: 'Yechish',
  PAYMENT: "To'lov",
  REFUND: 'Qaytarildi',
  TRANSFER: "O'tkazma",
  BONUS: 'Bonus',
  EARNING: 'Daromad',
};
