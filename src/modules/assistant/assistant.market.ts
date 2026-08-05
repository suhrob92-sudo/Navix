import { MarketOrderStatus, Prisma } from '@/generated/prisma/client';
import { somToTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { toSearchText } from '@/lib/search';
import { MAX_DISH_OPTIONS } from '@/modules/assistant/assistant.food.constants';
import type { MarketOrderStatusName } from '@/modules/market/market.types';

/**
 * AI yordamchi uchun MARKETPLACE ma'lumotlari.
 *
 * `assistant.food.ts` bilan bir xil vazifani bajaradi, faqat katalog
 * boshqa. Ikkalasini bitta faylga qo'shmadim: ular alohida modullar va
 * ertaga biri o'zgarganda ikkinchisi buzilmasligi kerak.
 *
 * ── Eng muhim qoida ───────────────────────────────────────────────────
 * Bu yerdagi narxlar faqat KO'RSATISH uchun. Buyurtma yaratilganda
 * `createMarketOrder()` narxni ham, ZAXIRANI ham bazadan qaytadan
 * o'qiydi.
 */

/** Qidiruvda bazadan olinadigan qatorlar soni — keyin JS'da saralanadi. */
const SEARCH_FETCH_LIMIT = 40;

/** Qidiruv so'zi shundan qisqa bo'lsa e'tiborga olinmaydi. */
const MIN_WORD_LENGTH = 3;

export interface ProductMatch {
  productId: string;
  slug: string;
  name: string;
  priceSom: number;
  /** Omborda nechta qolgan. */
  stock: number;
  categoryName: string;
  shopId: string;
  shopSlug: string;
  shopName: string;
  deliveryFeeSom: number;
  minOrderSom: number;
  deliveryDays: number;
}

const PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  searchName: true,
  price: true,
  stock: true,
  category: { select: { name: true } },
  shop: {
    select: {
      id: true,
      slug: true,
      name: true,
      deliveryFee: true,
      minOrder: true,
      deliveryDays: true,
      rating: true,
    },
  },
} as const;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>;

function toProductMatch(row: ProductRow): ProductMatch {
  return {
    productId: row.id,
    slug: row.slug,
    name: row.name,
    priceSom: tiyinToNumber(row.price) / 100,
    stock: row.stock,
    categoryName: row.category.name,
    shopId: row.shop.id,
    shopSlug: row.shop.slug,
    shopName: row.shop.name,
    deliveryFeeSom: tiyinToNumber(row.shop.deliveryFee) / 100,
    minOrderSom: tiyinToNumber(row.shop.minOrder) / 100,
    deliveryDays: row.shop.deliveryDays,
  };
}

/**
 * Bitta so'z uchun qidiruv sharti — so'z BOSHIDAN moslik.
 *
 * Sabab `assistant.food.ts` da batafsil yozilgan: oddiy `contains`
 * juda ko'p yolg'on natija beradi, aynan teng solishtirish esa juda
 * qattiq.
 */
function wordStartsWith(needle: string): Prisma.ProductWhereInput[] {
  return [{ searchName: { startsWith: needle } }, { searchName: { contains: ` ${needle}` } }];
}

export interface FindProductsParams {
  /** Probel bilan ajratilgan qidiruv so'zlari. */
  query: string;
  /** Eng ko'p shuncha so'm. */
  maxPriceSom?: number;
  /**
   * Faqat sotuvda borlari.
   *
   * Sukut bo'yicha `true`: yordamchi tugagan mahsulotni taklif qilsa,
   * foydalanuvchi uni tanlaydi va keyin "tugadi" xatosini oladi.
   */
  inStockOnly?: boolean;
}

/**
 * Katalogdan mahsulot qidiradi.
 *
 * Qidiruv uch joydan boradi: mahsulot nomi, toifa nomi va do'kon nomi.
 * Shuning uchun "Texnomart" deb yozgan odam ham natija oladi.
 */
export async function findProducts(params: FindProductsParams): Promise<ProductMatch[]> {
  const words = toSearchText(params.query)
    .split(' ')
    .filter((word) => word.length >= MIN_WORD_LENGTH);

  if (words.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      /**
       * Yopiq do'kon taklif qilinmaydi.
       *
       * Katalogda uni ko'rish mumkin (xaridor keyin qaytib keladi),
       * lekin yordamchi TAYYOR buyruq beradi — bosilgach darhol rad
       * javobini olish yomon tajriba bo'lardi.
       */
      shop: { isActive: true, isOpen: true },
      ...(params.inStockOnly === false ? {} : { stock: { gt: 0 } }),
      ...(params.maxPriceSom === undefined ? {} : { price: { lte: somToTiyin(params.maxPriceSom) } }),
      OR: words.flatMap((word) => [
        ...wordStartsWith(word),
        { category: { name: { contains: word, mode: 'insensitive' as const } } },
        { shop: { searchName: { contains: word } } },
      ]),
    },
    select: PRODUCT_SELECT,
    take: SEARCH_FETCH_LIMIT,
  });

  return rows
    .map((row) => ({ row, score: scoreProduct(row, words) }))
    .sort((left, right) => {
      // 1. Nechta so'z to'g'ri keldi;
      if (right.score !== left.score) return right.score - left.score;
      // 2. Do'kon reytingi;
      const ratingGap = Number(right.row.shop.rating) - Number(left.row.shop.rating);
      if (ratingGap !== 0) return ratingGap;
      // 3. Arzonrog'i — teng sharoitda xaridor foydasiga.
      return Number(left.row.price - right.row.price);
    })
    .slice(0, MAX_DISH_OPTIONS)
    .map(({ row }) => toProductMatch(row));
}

/**
 * Bitta mahsulotni ID bo'yicha oladi.
 *
 * Tasdiqlashdan oldin narx va ZAXIRA qaytadan o'qiladi: suhbat
 * davomida mahsulot sotilib ketgan bo'lishi mumkin.
 */
export async function findProductById(productId: string): Promise<ProductMatch | null> {
  const row = await prisma.product.findFirst({
    where: { id: productId, isActive: true, shop: { isActive: true, isOpen: true } },
    select: PRODUCT_SELECT,
  });

  return row ? toProductMatch(row) : null;
}

/**
 * Mahsulot qidiruv so'zlariga qanchalik mos kelganini baholaydi.
 *
 * Mahsulot NOMIDAGI moslik toifa yoki do'kon nomidagi moslikdan
 * qimmatroq: "telefon" deganda telefon kerak, "Telefon va gadjet"
 * bo'limidagi zaryadlagich emas.
 */
function scoreProduct(row: ProductRow, words: string[]): number {
  const nameWords = row.searchName.split(' ');
  const categoryText = toSearchText(row.category.name);

  let score = 0;

  for (const word of words) {
    if (nameWords.some((part) => part.startsWith(word))) {
      score += 2;
    } else if (categoryText.split(' ').some((part) => part.startsWith(word))) {
      score += 1;
    }
  }

  return score;
}

// ── Toifalar ──────────────────────────────────────────────────────────

export interface CategorySuggestion {
  slug: string;
  name: string;
  productCount: number;
}

/**
 * Eng to'la toifalar — "nima sotib olsam?" degan odamga.
 *
 * Do'kon emas, TOIFA taklif qilinadi: odam nima olishini bilmasa,
 * unga "Texnomart" degan nom yordam bermaydi, "Telefonlar" esa beradi.
 */
export async function findTopCategories(limit = 4): Promise<CategorySuggestion[]> {
  const rows = await prisma.productCategory.findMany({
    select: {
      slug: true,
      name: true,
      _count: { select: { products: { where: { isActive: true, stock: { gt: 0 } } } } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return rows
    .filter((row) => row._count.products > 0)
    .slice(0, limit)
    .map((row) => ({ slug: row.slug, name: row.name, productCount: row._count.products }));
}

// ── Buyurtma holati ───────────────────────────────────────────────────

export interface MarketOrderInfo {
  id: string;
  orderNumber: string;
  status: MarketOrderStatusName;
  shopName: string;
  totalTiyin: bigint;
  deliveryDays: number;
  createdAt: Date;
  cancelReason: string | null;
}

/** Hali yakunlanmagan holatlar. */
const OPEN_STATUSES: MarketOrderStatus[] = [
  MarketOrderStatus.PENDING,
  MarketOrderStatus.CONFIRMED,
  MarketOrderStatus.PACKING,
  MarketOrderStatus.SHIPPED,
];

const ORDER_INFO_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  total: true,
  createdAt: true,
  cancelReason: true,
  shop: { select: { name: true, deliveryDays: true } },
} as const;

function toOrderInfo(row: Prisma.MarketOrderGetPayload<{ select: typeof ORDER_INFO_SELECT }>): MarketOrderInfo {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    shopName: row.shop.name,
    totalTiyin: row.total,
    deliveryDays: row.shop.deliveryDays,
    createdAt: row.createdAt,
    cancelReason: row.cancelReason,
  };
}

/**
 * "Buyurtmam qayerda?" savoliga javob beradigan marketplace buyurtmasi.
 *
 * Avval FAOL buyurtma, bo'lmasa oxirgisi.
 */
export async function getLatestMarketOrder(userId: string): Promise<MarketOrderInfo | null> {
  const active = await prisma.marketOrder.findFirst({
    where: { userId, status: { in: OPEN_STATUSES } },
    select: ORDER_INFO_SELECT,
    orderBy: { createdAt: 'desc' },
  });

  if (active) return toOrderInfo(active);

  const last = await prisma.marketOrder.findFirst({
    where: { userId },
    select: ORDER_INFO_SELECT,
    orderBy: { createdAt: 'desc' },
  });

  return last ? toOrderInfo(last) : null;
}
