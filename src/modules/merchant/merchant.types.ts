import type { ServiceColor } from '@/config/modules';
import type { CatalogImageView } from '@/modules/catalog/catalog-image.types';
import type { FoodOrderStatusName } from '@/modules/food/food.types';

/**
 * Restoran kabineti — brauzer tomonidagi turlar.
 *
 * `merchant.service.ts` dan import qilinmaydi (Prisma bog'liqligi).
 */

export interface MerchantRestaurant {
  id: string;
  slug: string;
  name: string;
  /** Restoran sahifasidagi matn — egasi sozlamalarda o'zgartiradi. */
  description: string;
  cuisine: string;
  color: ServiceColor;
  isOpen: boolean;
  isActive: boolean;
  deliveryMinutes: number;
  /** Summalar TIYINDA. */
  deliveryFee: number;
  minOrder: number;
  rating: number;
  ratingCount: number;
  menuItemCount: number;
  /** Hozir e'tibor talab qiladigan buyurtmalar soni. */
  activeOrderCount: number;
}

export interface MerchantOrderItem {
  id: string;
  name: string;
  quantity: number;
  /** Summalar TIYINDA. */
  unitPrice: number;
  lineTotal: number;
}

export interface MerchantOrder {
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
  confirmedAt: string | null;
  deliveredAt: string | null;
  restaurant: { id: string; name: string; color: ServiceColor };
  customer: { name: string | null; phone: string };
  items: MerchantOrderItem[];
}

export interface MerchantMenuItem {
  id: string;
  name: string;
  description: string | null;
  /** Narx TIYINDA. */
  price: number;
  isAvailable: boolean;
  categoryName: string;
  /** Taom rasmlari — kabinetda boshqariladi, shuning uchun butun galereya. */
  images: CatalogImageView[];
}

export interface MerchantStats {
  /** Bugungi ko'rsatkichlar (Toshkent vaqti bo'yicha). */
  todayOrders: number;
  todayRevenue: number;
  weekOrders: number;
  weekRevenue: number;
  /** Hozir bajarilishi kerak bo'lgan buyurtmalar. */
  activeOrders: number;
  cancelledToday: number;
}

export interface MerchantRestaurantsResponse {
  restaurants: MerchantRestaurant[];
  stats: MerchantStats;
}

export interface MerchantOrdersResponse {
  orders: MerchantOrder[];
}

export interface MerchantOrderResponse {
  order: MerchantOrder;
}

export interface MerchantMenuResponse {
  items: MerchantMenuItem[];
}

export interface MerchantRestaurantResponse {
  restaurant: MerchantRestaurant;
}
