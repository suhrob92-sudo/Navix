import type { CartPreviewLine } from '@/modules/market/cart-preview.service';

/**
 * Savat — brauzer tomonidagi turlar.
 *
 * `cart.service.ts` dan import qilinmaydi: u Prisma'ga bog'liq va
 * brauzer paketiga tushmasligi kerak.
 */

/** Savat tegishli do'kon. */
export interface CartShopView {
  id: string;
  slug: string;
  name: string;
  /**
   * Do'kon hozir buyurtma qabul qilyaptimi.
   *
   * Savat sahifasida bu MUHIM: yopiq do'kondan buyurtma berib
   * bo'lmaydi va odam buni to'lov tugmasini bosishdan OLDIN
   * bilishi kerak.
   */
  isOpen: boolean;
}

/** Savatdagi bitta qator — narxi va zaxirasi bilan. */
export interface CartLineView extends CartPreviewLine {
  quantity: number;
  savedForLater: boolean;
}

export interface CartView {
  /** Faol qator bo'lmasa `null` — savat bo'sh. */
  shop: CartShopView | null;
  lines: CartLineView[];
  /** "Keyinroq sotib olaman" ro'yxati. */
  savedLines: CartLineView[];
  /** Savatda bo'lgan, lekin topilmagan qatorlar soni. */
  missingCount: number;
}

export interface CartResponse {
  cart: CartView;
}
