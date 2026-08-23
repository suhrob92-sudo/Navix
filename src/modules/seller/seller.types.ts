import type { ServiceColor } from '@/config/modules';
import type { CatalogImageView } from '@/modules/catalog/catalog-image.types';
import type { MarketOrderStatusName } from '@/modules/market/market.types';

/**
 * Sotuvchi kabineti — brauzer tomonidagi turlar.
 *
 * `seller.service.ts` dan import qilinmaydi (Prisma bog'liqligi).
 */

export interface SellerShop {
  id: string;
  slug: string;
  name: string;
  color: ServiceColor;
  /** Sotuvchi boshqaradi: hozir buyurtma qabul qilyaptimi. */
  isOpen: boolean;
  /** Admin boshqaradi: do'kon umuman ro'yxatdami. */
  isActive: boolean;
  deliveryDays: number;
  /** Summalar TIYINDA. */
  deliveryFee: number;
  minOrder: number;
  rating: number;
  ratingCount: number;
  productCount: number;
  /** Hozir e'tibor talab qiladigan buyurtmalar soni. */
  activeOrderCount: number;
  /**
   * Zaxirasi tugagan mahsulotlar soni.
   *
   * Kabinetda ALOHIDA ko'rsatiladi: tugagan mahsulot sotilmaydi,
   * lekin sotuvchi buni ombordan qaramaguncha bilmaydi.
   */
  outOfStockCount: number;
}

export interface SellerProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Narxlar TIYINDA. */
  price: number;
  oldPrice: number | null;
  stock: number;
  isActive: boolean;
  categoryId: string;
  categoryName: string;
  /**
   * Mahsulot rasmlari — BUTUN galereya.
   *
   * Kabinetda sotuvchi ularni boshqaradi, ya'ni faqat asosiy rasm
   * yetarli emas.
   */
  images: CatalogImageView[];
  /**
   * Xususiyatlar: "Ekran — 6.6 dyuym".
   *
   * Kabinetda sotuvchi ularni jadval ko'rinishida tahrirlaydi.
   */
  attributes: { id: string; name: string; value: string }[];
}

export interface SellerOrderItem {
  id: string;
  name: string;
  quantity: number;
  /** Summalar TIYINDA. */
  unitPrice: number;
  lineTotal: number;
}

export interface SellerOrder {
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
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  shop: { id: string; name: string; color: ServiceColor };
  customer: { name: string | null; phone: string };
  items: SellerOrderItem[];
}

export interface SellerStats {
  /** Bugungi ko'rsatkichlar (Toshkent vaqti bo'yicha). */
  todayOrders: number;
  todayRevenue: number;
  weekOrders: number;
  weekRevenue: number;
  /** Hozir bajarilishi kerak bo'lgan buyurtmalar. */
  activeOrders: number;
  cancelledToday: number;
  /** Barcha do'konlar bo'yicha tugagan mahsulotlar. */
  outOfStock: number;
}

/** Yangi mahsulot qo'shishda tanlanadigan toifa. */
export interface SellerCategoryOption {
  id: string;
  name: string;
}

export interface SellerShopsResponse {
  shops: SellerShop[];
  stats: SellerStats;
}

export interface SellerShopResponse {
  shop: SellerShop;
}

export interface SellerProductsResponse {
  products: SellerProduct[];
  categories: SellerCategoryOption[];
}

export interface SellerProductResponse {
  product: SellerProduct;
}

export interface SellerOrdersResponse {
  orders: SellerOrder[];
}

export interface SellerOrderResponse {
  order: SellerOrder;
}

// ── Amal tugmalari ────────────────────────────────────────────────────

/**
 * Har bir holatda KEYINGI qadam tugmasining yozuvi.
 *
 * Ovqatdagi bilan bir xil g'oya: sotuvchi jadval o'rganmasligi kerak,
 * u bitta tugmani bosadi va yozuv o'zi to'g'ri keladi.
 */
export const SELLER_ORDER_ACTION_LABELS: Record<MarketOrderStatusName, string> = {
  PENDING: 'Buyurtmani qabul qilish',
  CONFIRMED: "Yig'ishni boshlash",
  PACKING: "Yo'lga chiqarish",
  SHIPPED: 'Yetkazildi deb belgilash',
  DELIVERED: '',
  CANCELLED: '',
};

/** Do'kon buyurtmani hali rad eta oladimi. */
export function canShopReject(status: MarketOrderStatusName): boolean {
  return status === 'PENDING' || status === 'CONFIRMED' || status === 'PACKING';
}
