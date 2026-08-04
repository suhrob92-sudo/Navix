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

/**
 * Holatlar avtomati (state machine) — RUXSAT ETILGAN o'tishlar jadvali.
 *
 * ── Nima uchun jadval, `if` lar emas ──────────────────────────────────
 * Bu qoidalar UCH joyda kerak: serverda (tekshirish), restoran
 * kabinetida (qaysi tugmani ko'rsatish) va testda. Uchtasida alohida
 * yozilsa, ular ertaga bir-biridan farq qila boshlaydi.
 *
 * ── Nima uchun qat'iy ─────────────────────────────────────────────────
 * Buyurtma ORQAGA qaytmaydi va bosqichni SAKRAB o'tmaydi:
 *  - "Yetkazildi" dan "Tayyorlanmoqda" ga qaytish — mijoz uchun
 *    tushunarsiz va hisobotni buzadi;
 *  - "Qabul qilindi" dan to'g'ridan-to'g'ri "Yetkazildi" ga sakrash
 *    esa oshxona bosqichini yashiradi.
 *
 * Yakuniy holatlarda (`DELIVERED`, `CANCELLED`) ro'yxat bo'sh — ular
 * o'zgarmaydi.
 */
export const FOOD_ORDER_TRANSITIONS: Record<FoodOrderStatusName, readonly FoodOrderStatusName[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['DELIVERING'],
  DELIVERING: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

/** Shu o'tishga ruxsat berilganmi. */
export function canTransition(from: FoodOrderStatusName, to: FoodOrderStatusName): boolean {
  return FOOD_ORDER_TRANSITIONS[from].includes(to);
}

/**
 * Restoran uchun KEYINGI mantiqiy qadam.
 *
 * Kabinetdagi asosiy tugma shu qiymatdan quriladi — xodim o'ylab
 * o'tirmasligi kerak, bitta katta tugma bo'lsa yetarli.
 */
export function nextStatus(current: FoodOrderStatusName): FoodOrderStatusName | null {
  const index = FOOD_ORDER_FLOW.indexOf(current);
  if (index === -1 || index === FOOD_ORDER_FLOW.length - 1) return null;

  const candidate = FOOD_ORDER_FLOW[index + 1];

  return canTransition(current, candidate) ? candidate : null;
}

/** Restoran shu bosqichda buyurtmani rad eta oladimi. */
export function canRestaurantReject(status: FoodOrderStatusName): boolean {
  return canTransition(status, 'CANCELLED');
}

/** Tugma yozuvi: "Tayyorlashni boshlash", "Yo'lga chiqarish"... */
export const FOOD_ORDER_ACTION_LABELS: Record<FoodOrderStatusName, string> = {
  PENDING: 'Buyurtmani qabul qilish',
  CONFIRMED: 'Tayyorlashni boshlash',
  PREPARING: "Yo'lga chiqarish",
  DELIVERING: 'Yetkazildi deb belgilash',
  DELIVERED: '',
  CANCELLED: '',
};
