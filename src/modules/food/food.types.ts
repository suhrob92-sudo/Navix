import type { ServiceColor } from '@/config/modules';

/**
 * Ovqat moduli — brauzer tomonidagi turlar.
 *
 * `food.service.ts` dan import qilinmaydi: u Prisma'ga bog'liq va
 * brauzer paketiga tushmasligi kerak.
 */

export type FoodOrderStatusName = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';

export interface RestaurantListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  cuisine: string;
  /** Summalar TIYINDA. */
  deliveryFee: number;
  minOrder: number;
  deliveryMinutes: number;
  rating: number;
  ratingCount: number;
  color: ServiceColor;
  isOpen: boolean;
}

export interface MenuItemView {
  id: string;
  name: string;
  description: string | null;
  /** Narx TIYINDA. */
  price: number;
  isAvailable: boolean;
}

export interface MenuCategoryView {
  id: string;
  name: string;
  items: MenuItemView[];
}

export interface RestaurantDetail extends RestaurantListItem {
  categories: MenuCategoryView[];
}

export interface FoodOrderItemView {
  id: string;
  name: string;
  /** Summalar TIYINDA. */
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface FoodOrderView {
  id: string;
  orderNumber: string;
  status: FoodOrderStatusName;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  deliveryNote: string | null;
  cancelReason: string | null;
  createdAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
  restaurant: {
    id: string;
    slug: string;
    name: string;
    color: ServiceColor;
    deliveryMinutes: number;
  };
  items: FoodOrderItemView[];
}

export interface RestaurantsResponse {
  restaurants: RestaurantListItem[];
}

export interface RestaurantResponse {
  restaurant: RestaurantDetail;
}

export interface FoodOrdersResponse {
  orders: FoodOrderView[];
}

export interface FoodOrderResponse {
  order: FoodOrderView;
}

// ── Ko'rinadigan nomlar ───────────────────────────────────────────────

export const FOOD_ORDER_STATUS_LABELS: Record<FoodOrderStatusName, string> = {
  PENDING: 'Qabul qilinmoqda',
  CONFIRMED: 'Qabul qilindi',
  PREPARING: 'Tayyorlanmoqda',
  DELIVERING: "Yo'lda",
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
};

export const FOOD_ORDER_STATUS_VARIANTS: Record<
  FoodOrderStatusName,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary'
> = {
  PENDING: 'warning',
  CONFIRMED: 'default',
  PREPARING: 'default',
  DELIVERING: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
};

/**
 * Buyurtma hali bekor qilinadigan holatdami.
 *
 * Oshxona ovqatni tayyorlashni boshlaganidan keyin bekor qilish
 * restoranga zarar keltiradi — mahsulot sarflangan bo'ladi. Shuning
 * uchun chegara aynan `PREPARING` dan oldin.
 */
export function isCancellable(status: FoodOrderStatusName): boolean {
  return status === 'PENDING' || status === 'CONFIRMED';
}

/** Buyurtma tugagan (yakuniy) holatdami. */
export function isFinalStatus(status: FoodOrderStatusName): boolean {
  return status === 'DELIVERED' || status === 'CANCELLED';
}

/** Holatlar ketma-ketligi — kuzatuv chizig'i uchun. */
export const FOOD_ORDER_FLOW: readonly FoodOrderStatusName[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'DELIVERING',
  'DELIVERED',
] as const;
