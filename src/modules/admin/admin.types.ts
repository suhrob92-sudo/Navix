import type { ServiceColor } from '@/config/modules';
import type { ServiceCategoryName } from '@/modules/payment/payment.types';

/**
 * Admin panel uchun brauzer tomonidagi turlar.
 *
 * `admin.service.ts` dan import qilinmaydi — u Prisma'ga bog'liq va
 * brauzer paketiga tushmasligi kerak (paket hajmi va xavfsizlik).
 */

export type UserStatusName = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export type TransactionTypeName = 'TOP_UP' | 'WITHDRAWAL' | 'PAYMENT' | 'REFUND' | 'TRANSFER' | 'BONUS';

export type TransactionStatusName = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

// ── Ko'rsatkichlar ────────────────────────────────────────────────────

export interface AdminStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    /** Bugun ro'yxatdan o'tganlar (Toshkent vaqti bo'yicha). */
    newToday: number;
    newThisWeek: number;
  };
  wallet: {
    /** Barcha hamyonlardagi umumiy qoldiq, TIYINDA. */
    totalBalance: number;
    walletCount: number;
    /** Bugun hamyonlarga kirgan summa, TIYINDA. */
    topUpToday: number;
  };
  payments: {
    totalCount: number;
    /** Bugungi to'lovlar soni va hajmi (TIYINDA). */
    todayCount: number;
    todayVolume: number;
    weekVolume: number;
    failedToday: number;
  };
  providers: {
    total: number;
    active: number;
  };
  /** Eng ko'p to'lov qabul qilgan xizmatlar (7 kun). */
  topProviders: AdminTopProvider[];
}

export interface AdminTopProvider {
  id: string;
  name: string;
  code: string;
  category: ServiceCategoryName;
  color: ServiceColor;
  count: number;
  /** Hajm TIYINDA. */
  volume: number;
}

// ── Provayderlar ──────────────────────────────────────────────────────

export interface AdminProviderItem {
  id: string;
  code: string;
  name: string;
  category: ServiceCategoryName;
  description: string | null;
  accountLabel: string;
  accountHint: string;
  accountRegex: string;
  /** Chegaralar SO'MDA — admin formasida so'm bilan ishlanadi. */
  minAmountSom: number;
  maxAmountSom: number;
  color: ServiceColor;
  isActive: boolean;
  sortOrder: number;
  /** Shu provayder orqali qilingan to'lovlar soni. */
  paymentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProvidersResponse {
  providers: AdminProviderItem[];
}

export interface AdminProviderResponse {
  provider: AdminProviderItem;
}

// ── Foydalanuvchilar ──────────────────────────────────────────────────

export interface AdminUserItem {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: UserStatusName;
  roles: string[];
  phoneVerified: string | null;
  /** Hamyon qoldig'i TIYINDA. Hamyon ochilmagan bo'lsa `null`. */
  walletBalance: number | null;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserItem {
  paymentCount: number;
  /** Barcha to'lovlar hajmi TIYINDA. */
  paymentVolume: number;
  activeSessions: number;
  lastLoginAt: string | null;
}

export interface AdminUsersResponse {
  users: AdminUserItem[];
}

export interface AdminUserResponse {
  user: AdminUserDetail;
}

// ── Tranzaksiyalar ────────────────────────────────────────────────────

export interface AdminTransactionItem {
  id: string;
  type: TransactionTypeName;
  direction: 'IN' | 'OUT';
  status: TransactionStatusName;
  /** Summa TIYINDA. */
  amount: number;
  balanceAfter: number;
  description: string | null;
  sourceModule: string;
  createdAt: string;
  user: {
    id: string;
    phone: string;
    fullName: string | null;
  };
}

export interface AdminTransactionsResponse {
  transactions: AdminTransactionItem[];
}

// ── Audit jurnali ─────────────────────────────────────────────────────

export interface AdminAuditItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  module: string;
  ipAddress: string | null;
  /** Qo'shimcha tafsilotlar — tuzilishi amalga qarab farq qiladi. */
  metadata: Record<string, unknown> | null;
  createdAt: string;
  /** Amalni bajargan odam. Tizim amallarida `null`. */
  actor: {
    id: string;
    phone: string;
    fullName: string | null;
  } | null;
}

export interface AdminAuditResponse {
  entries: AdminAuditItem[];
}

// ── To'lovlar (admin ko'rinishi) ──────────────────────────────────────

export interface AdminPaymentItem {
  id: string;
  accountNumber: string;
  /** Summa TIYINDA. */
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  receiptNumber: string;
  providerName: string;
  createdAt: string;
  refundedAt: string | null;
  refundReason: string | null;
  user: {
    id: string;
    phone: string;
    fullName: string | null;
  };
}

export interface AdminPaymentsResponse {
  payments: AdminPaymentItem[];
}

// ── Ko'rinadigan nomlar ───────────────────────────────────────────────

/** Rollarning o'zbekcha nomi. */
export const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Mijoz',
  DRIVER: 'Haydovchi',
  COURIER: 'Kuryer',
  MERCHANT: 'Sotuvchi',
  SUPPORT: "Qo'llab-quvvatlash",
  ADMIN: 'Administrator',
  SUPER_ADMIN: 'Bosh administrator',
};

/** Foydalanuvchiga berish mumkin bo'lgan rollar (CUSTOMER'dan tashqari). */
export const ASSIGNABLE_ROLES = ['DRIVER', 'COURIER', 'MERCHANT', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN'] as const;

export const USER_STATUS_LABELS: Record<UserStatusName, string> = {
  PENDING_VERIFICATION: 'Tasdiqlanmagan',
  ACTIVE: 'Faol',
  SUSPENDED: 'Bloklangan',
  DEACTIVATED: 'Yopilgan',
};

/**
 * Holat yorlig'ining rangi.
 *
 * Bloklangan hisob QIZIL bo'lishi shart: xodim ro'yxatni tez ko'zdan
 * kechirganda muammoli hisob darhol ko'rinishi kerak.
 */
export const USER_STATUS_VARIANTS: Record<UserStatusName, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  ACTIVE: 'success',
  PENDING_VERIFICATION: 'warning',
  SUSPENDED: 'destructive',
  DEACTIVATED: 'secondary',
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionTypeName, string> = {
  TOP_UP: "To'ldirish",
  WITHDRAWAL: 'Yechish',
  PAYMENT: "To'lov",
  REFUND: 'Qaytarish',
  TRANSFER: "O'tkazma",
  BONUS: 'Bonus',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatusName, string> = {
  PENDING: 'Kutilmoqda',
  COMPLETED: 'Bajarildi',
  FAILED: 'Bajarilmadi',
  REVERSED: 'Qaytarildi',
};
