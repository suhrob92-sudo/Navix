import type { ReturnReasonName, ReturnStatusName } from '@/config/order-return';

/**
 * Qaytarish so'rovi — brauzer tomonidagi turlar.
 *
 * `return.service.ts` dan import qilinmaydi: u Prisma'ga bog'liq va
 * brauzer paketiga tushmasligi kerak.
 */

/** So'rovdagi bitta qator. */
export interface ReturnItemView {
  orderItemId: string;
  name: string;
  /** "Qora · 256 GB" yoki `null`. */
  variantLabel: string | null;
  /** Bitta donaning narxi TIYINDA — buyurtma paytidagi narx. */
  unitPrice: number;
  /** Nechta dona qaytarilmoqda. */
  quantity: number;
}

export interface ReturnRequestView {
  id: string;
  orderId: string;
  orderNumber: string;
  status: ReturnStatusName;
  reason: ReturnReasonName;
  comment: string | null;
  /** Qaytariladigan summa TIYINDA. */
  amount: number;
  /** Yetkazish haqi ham kirganmi — ekranda alohida aytiladi. */
  includesDeliveryFee: boolean;
  createdAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  items: ReturnItemView[];
  /** Sotuvchining ro'yxatida kerak. */
  customerName: string | null;
  shopName: string;
}

export interface ReturnResponse {
  request: ReturnRequestView;
}

export interface ReturnsResponse {
  requests: ReturnRequestView[];
}
