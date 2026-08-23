import type { ServiceColor } from '@/config/modules';
import type { CatalogImageView, CatalogThumb } from '@/modules/catalog/catalog-image.types';
import type { OrderCourierView } from '@/modules/food/food.types';

/**
 * Marketplace — brauzer tomonidagi turlar va qoidalar.
 *
 * `market.service.ts` dan import qilinmaydi: u Prisma'ga bog'liq va
 * brauzer paketiga tushmasligi kerak.
 */

export type MarketOrderStatusName =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PACKING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface ShopListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Hozir buyurtma qabul qilyaptimi (sotuvchi boshqaradi). */
  isOpen: boolean;
  /** Summalar TIYINDA. */
  deliveryFee: number;
  minOrder: number;
  /** Taxminiy yetkazish muddati — KUNDA. */
  deliveryDays: number;
  rating: number;
  ratingCount: number;
  color: ServiceColor;
  productCount: number;
  /** Do'kon rasmi. Rasm qo'yilmagan bo'lsa `null`. */
  image: CatalogThumb | null;
}

export interface ProductCategoryView {
  id: string;
  slug: string;
  name: string;
  /** `lucide-react` ikonkasi nomi. */
  icon: string;
  productCount: number;
}

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  /** Narxlar TIYINDA. */
  price: number;
  oldPrice: number | null;
  /** Omborda nechta qolgan. */
  stock: number;
  shop: {
    /** Buyurtma berishda kerak — savat do'kon ID'siga bog'lanadi. */
    id: string;
    slug: string;
    name: string;
    color: ServiceColor;
    deliveryDays: number;
  };
  category: {
    slug: string;
    name: string;
  };
  /** Sharhlardan hisoblangan reyting. `ratingCount` 0 bo'lsa baho yo'q. */
  rating: number;
  ratingCount: number;
  /**
   * Ro'yxatda ko'rsatiladigan ASOSIY rasm.
   *
   * Butun galereya emas: 40 ta mahsulotli sahifada bu javobni
   * bir necha barobar og'irlashtirardi.
   */
  image: CatalogThumb | null;
}

export interface ProductDetail extends ProductListItem {
  description: string | null;
  /** Do'konning yetkazish sharti — mahsulot sahifasida ko'rsatiladi. */
  shopDeliveryFee: number;
  shopMinOrder: number;
  /** Batafsil sahifadagi butun galereya. */
  images: CatalogImageView[];
}

export interface MarketOrderItemView {
  id: string;
  name: string;
  /** Summalar TIYINDA. */
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  /**
   * Katalogdagi mahsulot — baho qo'yish uchun.
   *
   * `null` bo'lishi mumkin: mahsulot katalogdan o'chirilgan bo'lsa
   * ham buyurtma tarixi qoladi (nomi va narxi nusxa qilingan).
   * Bunday qatorga baho qo'yib bo'lmaydi.
   */
  productId: string | null;
}

export interface MarketOrderView {
  id: string;
  orderNumber: string;
  status: MarketOrderStatusName;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  deliveryNote: string | null;
  cancelReason: string | null;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  shop: {
    id: string;
    slug: string;
    name: string;
    color: ServiceColor;
    deliveryDays: number;
  };
  items: MarketOrderItemView[];
  /** Yetkazayotgan kuryer — topshiriq ochilgach paydo bo'ladi. */
  courier: OrderCourierView | null;
}

export interface ShopsResponse {
  shops: ShopListItem[];
}

export interface ShopResponse {
  shop: ShopListItem;
  products: ProductListItem[];
}

export interface CategoriesResponse {
  categories: ProductCategoryView[];
}

export interface ProductsResponse {
  products: ProductListItem[];
  total: number;
}

export interface ProductResponse {
  product: ProductDetail;
  /** Xuddi shu toifadagi boshqa mahsulotlar. */
  related: ProductListItem[];
}

export interface MarketOrdersResponse {
  orders: MarketOrderView[];
}

export interface MarketOrderResponse {
  order: MarketOrderView;
}

// ── Ko'rinadigan nomlar ───────────────────────────────────────────────

export const MARKET_ORDER_STATUS_LABELS: Record<MarketOrderStatusName, string> = {
  PENDING: 'Qabul qilinmoqda',
  CONFIRMED: 'Qabul qilindi',
  PACKING: "Yig'ilmoqda",
  SHIPPED: "Yo'lga chiqarildi",
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
};

export const MARKET_ORDER_STATUS_VARIANTS: Record<
  MarketOrderStatusName,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary'
> = {
  PENDING: 'warning',
  CONFIRMED: 'default',
  PACKING: 'default',
  SHIPPED: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
};

/** Holatlar ketma-ketligi — kuzatuv chizig'i uchun. */
export const MARKET_ORDER_FLOW: readonly MarketOrderStatusName[] = [
  'PENDING',
  'CONFIRMED',
  'PACKING',
  'SHIPPED',
  'DELIVERED',
] as const;

/**
 * Holatlar avtomati — RUXSAT ETILGAN o'tishlar jadvali.
 *
 * ── Ovqatdan FARQI: bekor qilish oynasi kengroq ───────────────────────
 * Ovqatda chegara `PREPARING` dan oldin: oshxona ovqatni tayyorlay
 * boshlagach mahsulot sarflangan bo'ladi va uni qaytarib bo'lmaydi.
 *
 * Mahsulot esa yig'ilayotgan bo'lsa ham hali omborda turadi — uni
 * javonga qaytarish mumkin. Shuning uchun bekor qilish `SHIPPED` gacha
 * ruxsat etiladi: mahsulot yo'lga chiqqandan keyingina kech bo'ladi.
 */
export const MARKET_ORDER_TRANSITIONS: Record<MarketOrderStatusName, readonly MarketOrderStatusName[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKING', 'CANCELLED'],
  PACKING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

/** Shu o'tishga ruxsat berilganmi. */
export function canTransition(from: MarketOrderStatusName, to: MarketOrderStatusName): boolean {
  return MARKET_ORDER_TRANSITIONS[from].includes(to);
}

/** Xaridor buyurtmani hali bekor qila oladimi. */
export function isCancellable(status: MarketOrderStatusName): boolean {
  return canTransition(status, 'CANCELLED');
}

/** Buyurtma tugagan (yakuniy) holatdami. */
export function isFinalStatus(status: MarketOrderStatusName): boolean {
  return status === 'DELIVERED' || status === 'CANCELLED';
}

/** Sotuvchi uchun KEYINGI mantiqiy qadam. */
export function nextStatus(current: MarketOrderStatusName): MarketOrderStatusName | null {
  const index = MARKET_ORDER_FLOW.indexOf(current);
  if (index === -1 || index === MARKET_ORDER_FLOW.length - 1) return null;

  const candidate = MARKET_ORDER_FLOW[index + 1];

  return canTransition(current, candidate) ? candidate : null;
}

// ── Zaxira ────────────────────────────────────────────────────────────

/**
 * Shundan kam qolganda "oz qoldi" deb ogohlantiramiz.
 *
 * Bu son sotuvni tezlashtirish uchun emas, ROSTNI aytish uchun:
 * xaridor 2 ta qolgan mahsulotga 5 ta buyurtma bermasligi kerak.
 */
export const LOW_STOCK_THRESHOLD = 5;

export type StockState = 'out' | 'low' | 'ok';

export function stockState(stock: number): StockState {
  if (stock <= 0) return 'out';
  if (stock <= LOW_STOCK_THRESHOLD) return 'low';
  return 'ok';
}

/** Zaxira holati uchun matn: "Tugadi", "3 ta qoldi". */
export function stockLabel(stock: number): string {
  if (stock <= 0) return 'Tugadi';
  if (stock <= LOW_STOCK_THRESHOLD) return `${stock} ta qoldi`;
  return 'Mavjud';
}
