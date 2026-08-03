import type { ServiceColor } from '@/config/modules';

/**
 * Brauzer tomonida ishlatiladigan to'lov turlari.
 *
 * `payment.service.ts` dan import qilinmaydi — u Prisma'ga bog'liq va
 * brauzer paketiga tushmasligi kerak.
 */

export type ServiceCategoryName = 'UTILITY' | 'INTERNET' | 'MOBILE' | 'TV';

export type ServicePaymentStatusName = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface ServiceProviderItem {
  id: string;
  code: string;
  name: string;
  category: ServiceCategoryName;
  description: string | null;
  /** Hisob raqami maydonining nomi: "Shaxsiy hisob raqami". */
  accountLabel: string;
  accountHint: string;
  /** Chegaralar TIYINDA. */
  minAmount: number;
  maxAmount: number;
  color: ServiceColor;
}

export interface SavedAccountItem {
  id: string;
  accountNumber: string;
  label: string;
  provider: ServiceProviderItem;
  createdAt: string;
}

export interface ServicePaymentItem {
  id: string;
  accountNumber: string;
  /** Summa TIYINDA. */
  amount: number;
  status: ServicePaymentStatusName;
  receiptNumber: string;
  failureReason: string | null;
  provider: ServiceProviderItem;
  createdAt: string;
  completedAt: string | null;
}

export interface ProvidersResponse {
  providers: ServiceProviderItem[];
}

export interface SavedAccountsResponse {
  accounts: SavedAccountItem[];
}

export interface PaymentsResponse {
  payments: ServicePaymentItem[];
}

/** Holatlarning o'zbekcha nomi. */
export const PAYMENT_STATUS_LABELS: Record<ServicePaymentStatusName, string> = {
  PENDING: 'Kutilmoqda',
  COMPLETED: 'To‘landi',
  FAILED: 'Bajarilmadi',
  REFUNDED: 'Qaytarildi',
};
