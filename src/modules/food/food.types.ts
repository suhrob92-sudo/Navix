import type { ServiceColor } from '@/config/modules';
import type { CatalogThumb } from '@/modules/catalog/catalog-image.types';
import type { AllergenName } from '@/config/menu-item-detail';
import type { DeliveryStatusName } from '@/modules/courier/courier.types';

/**
 * Ovqat moduli — brauzer tomonidagi turlar.
 *
 * `food.service.ts` dan import qilinmaydi: u Prisma'ga bog'liq va
 * brauzer paketiga tushmasligi kerak.
 */

export type FoodOrderStatusName = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';

/** Bitta kunning ish vaqti — kun boshidan DAQIQADA. */
export interface RestaurantHoursView {
  weekday: number;
  opensAt: number;
  closesAt: number;
}

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
  /**
   * HOZIR buyurtma qabul qilyaptimi.
   *
   * Bayroq va jadval BIRGA hisoblanadi — sabab
   * `src/config/opening-hours.ts` da.
   */
  isOpen: boolean;
  /**
   * Restoran egasining bayrog'i — jadvaldan alohida.
   *
   * "Vaqtincha yopiq" va "hozircha ish vaqti emas" — bu ikki xil
   * holat va ekranda ular boshqacha yoziladi.
   */
  acceptsOrders: boolean;
  /** Haftalik ish vaqti. Kiritilmagan bo'lsa bo'sh. */
  hours: RestaurantHoursView[];
  /** "22:00 gacha ochiq" yoki "Ertaga 09:00 da ochiladi". */
  openState: { isOpen: boolean; text: string };
  /** Restoran rasmi. Rasm qo'yilmagan bo'lsa `null`. */
  image: CatalogThumb | null;
}

export interface MenuItemView {
  id: string;
  name: string;
  description: string | null;
  /** Narx TIYINDA. */
  price: number;
  isAvailable: boolean;
  /** Sharhlardan hisoblangan reyting. `ratingCount` 0 bo'lsa baho yo'q. */
  rating: number;
  ratingCount: number;
  /**
   * Taom rasmi.
   *
   * Menyuda rasm eng kuchli ta'sir qiladigan joy: odam taomni
   * ko'rmasa, tanish nomlarnigina buyurtma qiladi.
   */
  image: CatalogThumb | null;

  /**
   * ── Taom tarkibi ────────────────────────────────────────────────
   * Hammasi ixtiyoriy: restoran to'ldirmaguncha bo'lim
   * ko'rsatilmaydi. Sabab `src/config/menu-item-detail.ts` da.
   */
  ingredients: string | null;
  /** GRAMMDA. */
  weightGrams: number | null;
  calories: number | null;
  allergens: AllergenName[];

  /**
   * Eng ko'p buyurtma qilingan taomlardanmi.
   *
   * Bu son BUYURTMALARDAN hisoblanadi va uni restoran qo'lda
   * o'zgartira olmaydi — sabab `getPopularItemIds` izohida.
   */
  isPopular: boolean;
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
  /** Menyudagi taom — baho qo'yish uchun. Izohi `MarketOrderItemView` da. */
  menuItemId: string | null;
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
  /**
   * Yetkazayotgan kuryer — topshiriq ochilgach paydo bo'ladi.
   *
   * Telefon raqami ATAYLAB ko'rsatiladi: "domofon ishlamayapti" degan
   * holatda mijoz qo'ng'iroq qila olishi kerak.
   */
  courier: OrderCourierView | null;
}

/** Buyurtma sahifasida ko'rinadigan kuryer ma'lumoti. */
export interface OrderCourierView {
  name: string | null;
  phone: string;
  status: DeliveryStatusName;
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
