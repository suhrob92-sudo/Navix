import { MarketOrderStatus, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { clientIdempotencyKey, runIdempotent } from '@/lib/idempotency';
import { logger } from '@/lib/logger';
import { formatTiyin, somToTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { toSearchText } from '@/lib/search';
import { variantLabel } from '@/config/product-variant';
import { getVariants } from '@/modules/product/product-variant.service';
import { getShopStats } from '@/modules/market/shop-stats.service';
import { recordOrderEvent } from '@/modules/market/order-event.service';
import type { ServiceColor } from '@/config/modules';
import type { ShopStatsView } from '@/config/shop-stats';
import {
  GALLERY_SELECT,
  THUMB_SELECT,
  toGallery,
  toThumb,
} from '@/modules/catalog/catalog-image.select';
import { resolveVideoSources } from '@/modules/feed/video-stats.service';
import { notifyUser } from '@/modules/notification/notification.service';
import { chargeWallet, getOrCreateWallet, refundWallet } from '@/modules/wallet/wallet.service';
import type {
  CancelMarketOrderInput,
  CreateMarketOrderInput,
  MarketOrderQuery,
  ProductQuery,
} from '@/modules/market/market.schemas';
import type { OrderCourierView } from '@/modules/food/food.types';
import type { ReturnStatusName } from '@/config/order-return';
import type {
  MarketOrderStatusName,
  MarketOrderView,
  ProductCategoryView,
  ProductDetail,
  ProductListItem,
  ShopListItem,
} from '@/modules/market/market.types';

/**
 * Marketplace moduli.
 *
 * ── Ovqat modulidan meros qolgan ikki qoida ───────────────────────────
 *
 * 1. NARX HAR DOIM BAZADAN. Savatdan faqat "qaysi mahsulot, nechta"
 *    keladi. Summa serverda qayta hisoblanadi.
 *
 * 2. BUYURTMA — O'ZGARMAS NUSXA. Nom va narx buyurtma qatoriga
 *    ko'chiriladi, keyinchalik ular o'zgarsa ham eski chek o'zgarmaydi.
 *
 * ── Bu modulga XOS uchinchi qoida: ZAXIRA ─────────────────────────────
 * Restoran yana lag'mon pishira oladi. Do'konda esa 3 ta telefon bo'lsa,
 * to'rtinchisini sotib bo'lmaydi.
 *
 * Shuning uchun zaxira SHART BILAN kamaytiriladi:
 *
 *     UPDATE products SET stock = stock - N
 *     WHERE id = ? AND stock >= N
 *
 * Bu qator PostgreSQL'da atomar: ikki xaridor bir vaqtda oxirgi
 * mahsulotni olishga urinsa, ikkinchisining `UPDATE` i 0 qator
 * o'zgartiradi va biz buni ko'rib xato qaytaramiz. "Avval o'qib, keyin
 * yozish" yo'li bu yerda ISHLAMAYDI — o'qish bilan yozish orasida
 * boshqa so'rov ulgurib qoladi.
 */

const SOURCE_MODULE = 'market';

// ── Do'konlar ─────────────────────────────────────────────────────────

const SHOP_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  isOpen: true,
  deliveryFee: true,
  minOrder: true,
  deliveryDays: true,
  rating: true,
  ratingCount: true,
  color: true,
  _count: { select: { products: { where: { isActive: true } } } },
  images: THUMB_SELECT,
} as const;

type ShopRow = Prisma.ShopGetPayload<{ select: typeof SHOP_SELECT }>;

function toShopItem(row: ShopRow): ShopListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    isOpen: row.isOpen,
    deliveryFee: tiyinToNumber(row.deliveryFee),
    minOrder: tiyinToNumber(row.minOrder),
    deliveryDays: row.deliveryDays,
    rating: Number(row.rating),
    ratingCount: row.ratingCount,
    color: row.color as ServiceColor,
    productCount: row._count.products,
    image: toThumb(row.images),
  };
}

/** Faol do'konlar. */
export async function listShops(): Promise<ShopListItem[]> {
  const shops = await prisma.shop.findMany({
    where: { isActive: true },
    select: SHOP_SELECT,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return shops.map(toShopItem);
}

/** Bitta do'kon va uning mahsulotlari. */
export async function getShop(slug: string): Promise<{ shop: ShopListItem; stats: ShopStatsView }> {
  const shop = await prisma.shop.findFirst({
    where: { slug, isActive: true },
    select: { ...SHOP_SELECT, createdAt: true },
  });

  if (!shop) {
    throw new NotFoundError("Do'kon");
  }

  /*
    ── Nima uchun MAHSULOTLAR bu yerda qaytarilmaydi ──────────────────
    Ilgari bu funksiya do'konning BARCHA mahsulotlarini qaytarardi:
    filtrsiz, saralashsiz, sahifalashsiz.

    Ikkita muammosi bor edi. Birinchisi — mingta mahsulotli do'kon
    sahifasi mobil internetda ochilmasdi. Ikkinchisi — savat
    sahifasi ham shu manzilni chaqiradi (unga faqat yetkazish
    narxi kerak) va u ham o'sha mingta mahsulotni yuklab olardi.

    Endi mahsulotlar `/api/v1/market/products?shop=...` dan
    olinadi — 43-bosqichdagi filtrlar, saralash va sahifalash
    bilan birga.
  */
  const stats = await getShopStats(shop.id, shop.createdAt);

  return { shop: toShopItem(shop), stats };
}

// ── Toifalar ──────────────────────────────────────────────────────────

/**
 * Toifalar ro'yxati — har birida nechta mahsulot borligi bilan.
 *
 * Bo'sh toifa ko'rsatilmaydi: foydalanuvchi uni bosib, bo'sh sahifaga
 * tushib qolsa — bu xatolikdek tuyuladi.
 */
export async function listCategories(): Promise<ProductCategoryView[]> {
  const categories = await prisma.productCategory.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return categories
    .filter((category) => category._count.products > 0)
    .map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      icon: category.icon,
      productCount: category._count.products,
    }));
}

// ── Mahsulotlar ───────────────────────────────────────────────────────

const PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  price: true,
  oldPrice: true,
  stock: true,
  shop: { select: { id: true, slug: true, name: true, color: true, deliveryDays: true } },
  category: { select: { slug: true, name: true } },
  rating: true,
  ratingCount: true,
  images: THUMB_SELECT,
} as const;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>;

function toProductItem(row: ProductRow): ProductListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: tiyinToNumber(row.price),
    oldPrice: row.oldPrice === null ? null : tiyinToNumber(row.oldPrice),
    stock: row.stock,
    shop: {
      id: row.shop.id,
      slug: row.shop.slug,
      name: row.shop.name,
      color: row.shop.color as ServiceColor,
      deliveryDays: row.shop.deliveryDays,
    },
    category: { slug: row.category.slug, name: row.category.name },
    // `Decimal` JSON'ga tushmaydi — songa o'giramiz (bu PUL emas).
    rating: Number(row.rating),
    ratingCount: row.ratingCount,
    image: toThumb(row.images),
  };
}

/** Saralash tartibi. */
function buildProductOrder(sort: ProductQuery['sort']): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'cheap':
      return [{ price: 'asc' }, { name: 'asc' }];
    case 'expensive':
      return [{ price: 'desc' }, { name: 'asc' }];
    case 'new':
      return [{ createdAt: 'desc' }];
    default:
      // "Ommabop" — hozircha do'kon tartibi. Sotuv statistikasi
      // yig'ilgach shu yerda haqiqiy hisob paydo bo'ladi.
      return [{ sortOrder: 'asc' }, { name: 'asc' }];
  }
}

/**
 * Mahsulotlarni qidiradi va filtrlaydi.
 *
 * Qidiruv `searchName` ustuni orqali boradi — apostrof muammosi
 * `src/lib/search.ts` da tushuntirilgan.
 */
export async function listProducts(query: ProductQuery): Promise<{ products: ProductListItem[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  const needle = query.search ? toSearchText(query.search) : null;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    shop: { isActive: true },
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.shop ? { shop: { slug: query.shop, isActive: true } } : {}),
    ...(query.inStock ? { stock: { gt: 0 } } : {}),
    /**
     * Chegirma: eski narx bor VA u hozirgisidan katta.
     *
     * ── Nima uchun ikkinchi shart ham kerak ─────────────────────────
     * Sotuvchi eski narxni yozib qo'yib, keyin asosiy narxni
     * oshirishi mumkin. Unda "chegirma" aslida QIMMATLASHUV
     * bo'lib qoladi va uni chegirmalar ro'yxatida ko'rsatish
     * yolg'on bo'lardi.
     *
     * Prisma ikkita ustunni bir-biri bilan taqqoslay olmaydi,
     * shuning uchun xom SQL shartidan foydalaniladi.
     */
    ...(query.hasDiscount
      ? { AND: [{ oldPrice: { not: null } }, { oldPrice: { gt: prisma.product.fields.price } }] }
      : {}),
    ...(query.minRating === undefined
      ? {}
      : {
          /**
           * Bahosi YO'Q mahsulot ham chiqarib tashlanadi.
           *
           * `rating` nolga teng bo'lgani uchun bu o'z-o'zidan
           * bajariladi, lekin `ratingCount` sharti niyatni ochiq
           * qiladi: "kamida bitta baho bo'lsin".
           */
          rating: { gte: query.minRating },
          ratingCount: { gt: 0 },
        }),
    ...(query.minPriceSom === undefined && query.maxPriceSom === undefined
      ? {}
      : {
          price: {
            ...(query.minPriceSom === undefined ? {} : { gte: somToTiyin(query.minPriceSom) }),
            ...(query.maxPriceSom === undefined ? {} : { lte: somToTiyin(query.maxPriceSom) }),
          },
        }),
    ...(needle && needle.length > 0
      ? {
          OR: [
            // So'z boshidan moslik — sabab `assistant.food.ts` da.
            { searchName: { startsWith: needle } },
            { searchName: { contains: ` ${needle}` } },
            { category: { name: { contains: query.search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: PRODUCT_SELECT,
      orderBy: buildProductOrder(query.sort),
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  return { products: rows.map(toProductItem), total };
}

/** Bitta mahsulot va shu toifadagi boshqalari. */
export async function getProduct(slug: string): Promise<{ product: ProductDetail; related: ProductListItem[] }> {
  const row = await prisma.product.findFirst({
    where: { slug, isActive: true, shop: { isActive: true } },
    select: {
      ...PRODUCT_SELECT,
      description: true,
      categoryId: true,
      shop: { select: { id: true, slug: true, name: true, color: true, deliveryDays: true, deliveryFee: true, minOrder: true } },
      images: GALLERY_SELECT,
      attributes: {
        select: { id: true, name: true, value: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!row) {
    throw new NotFoundError('Mahsulot');
  }

  const related = await prisma.product.findMany({
    where: {
      categoryId: row.categoryId,
      isActive: true,
      shop: { isActive: true },
      id: { not: row.id },
    },
    select: PRODUCT_SELECT,
    orderBy: [{ sortOrder: 'asc' }],
    take: 6,
  });

  const variants = await getVariants(row.id);

  const product: ProductDetail = {
    ...toProductItem(row),
    description: row.description,
    shopDeliveryFee: tiyinToNumber(row.shop.deliveryFee),
    shopMinOrder: tiyinToNumber(row.shop.minOrder),
    images: toGallery(row.images),
    attributes: row.attributes,
    variants,
  };

  return { product, related: related.map(toProductItem) };
}

// ── Buyurtmalar ───────────────────────────────────────────────────────

const ORDER_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  deliveryAddress: true,
  deliveryNote: true,
  cancelReason: true,
  createdAt: true,
  shippedAt: true,
  deliveredAt: true,
  cancelledAt: true,
  shop: { select: { id: true, slug: true, name: true, color: true, deliveryDays: true } },
  /** Xarita uchun koordinata. Manzil o'chirilgan bo'lsa `null`. */
  address: { select: { latitude: true, longitude: true } },
  /*
    Holat o'zgarishlari tarixi — kuzatuv chizig'i uchun.

    ── Nima uchun `take` yo'q ──────────────────────────────────────────
    Bitta buyurtmada eng ko'pi bilan olti yozuv bo'ladi (beshta
    bosqich va bekor qilish). Chegara qo'yish keraksiz murakkablik
    bo'lardi.
  */
  events: {
    select: {
      status: true,
      createdAt: true,
      note: true,
      actor: { select: { firstName: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
  /** Qaytarish so'rovi bormi — tugmani ko'rsatish uchun. */
  returnRequest: { select: { id: true, status: true } },
  items: {
    /**
     * `productId` BAHO uchun kerak.
     *
     * U bo'sh bo'lishi mumkin: mahsulot katalogdan o'chirilgan
     * bo'lsa ham buyurtma tarixi qoladi (nomi va narxi nusxa
     * qilingan). Bunday qatorga baho qo'yib bo'lmaydi.
     */
    select: {
      id: true,
      name: true,
      unitPrice: true,
      quantity: true,
      lineTotal: true,
      productId: true,
      variantLabel: true,
    },
    orderBy: { name: 'asc' as const },
  },
  delivery: {
    select: {
      status: true,
      courierLat: true,
      courierLng: true,
      locationAt: true,
      courier: { select: { firstName: true, lastName: true, phone: true } },
    },
  },
  /*
    `as const` EMAS, `satisfies`.

    ── Nima uchun ────────────────────────────────────────────────────
    `as const` ichidagi `orderBy: { createdAt: 'asc' }` faqat
    o'qiladigan (`readonly`) bo'lib qoladi, Prisma esa
    o'zgartiriladigan turni kutadi.

    Natijada tur mos kelmay, `row.events` `never` bo'lib qolardi —
    ya'ni voqealar ro'yxati "umuman mavjud emas" deb ko'rinardi.
  */
} satisfies Prisma.MarketOrderSelect;

/**
 * Buyurtma sahifasida ko'rinadigan kuryer.
 *
 * Izohi `food.service.ts` dagi bilan bir xil: topshiriq ochilgan,
 * lekin hali hech kim olmagan bo'lsa `null` qaytadi.
 */
function toCourierView(
  delivery: {
    status: string;
    courierLat: Prisma.Decimal | null;
    courierLng: Prisma.Decimal | null;
    locationAt: Date | null;
    courier: { firstName: string | null; lastName: string | null; phone: string } | null;
  } | null,
): OrderCourierView | null {
  if (!delivery?.courier) return null;

  const hasPoint = delivery.courierLat !== null && delivery.courierLng !== null && delivery.locationAt !== null;

  return {
    name: [delivery.courier.firstName, delivery.courier.lastName].filter(Boolean).join(' ') || null,
    phone: delivery.courier.phone,
    status: delivery.status as OrderCourierView['status'],
    point: hasPoint
      ? { latitude: delivery.courierLat!.toNumber(), longitude: delivery.courierLng!.toNumber() }
      : null,
    reportedAt: delivery.locationAt?.toISOString() ?? null,
  };
}

type OrderRow = Prisma.MarketOrderGetPayload<{ select: typeof ORDER_SELECT }>;

function toOrderView(row: OrderRow): MarketOrderView {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    subtotal: tiyinToNumber(row.subtotal),
    deliveryFee: tiyinToNumber(row.deliveryFee),
    total: tiyinToNumber(row.total),
    deliveryAddress: row.deliveryAddress,
    deliveryNote: row.deliveryNote,
    destination: row.address
      ? { latitude: row.address.latitude.toNumber(), longitude: row.address.longitude.toNumber() }
      : null,
    cancelReason: row.cancelReason,
    createdAt: row.createdAt.toISOString(),
    shippedAt: row.shippedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    shop: {
      id: row.shop.id,
      slug: row.shop.slug,
      name: row.shop.name,
      color: row.shop.color as ServiceColor,
      deliveryDays: row.shop.deliveryDays,
    },
    events: row.events.map((event) => ({
      status: event.status as MarketOrderStatusName,
      at: event.createdAt.toISOString(),
      note: event.note,
      /*
        Ism KO'RSATILADI, familiya emas.

        "Bekor qildi: Sardor" yetarli; to'liq ism boshqa odamning
        ma'lumotini keraksiz ochib berardi.
      */
      actor: event.actor?.firstName ?? null,
    })),
    returnStatus: (row.returnRequest?.status ?? null) as ReturnStatusName | null,
    items: row.items.map((item) => ({
      id: item.id,
      name: item.name,
      unitPrice: tiyinToNumber(item.unitPrice),
      quantity: item.quantity,
      lineTotal: tiyinToNumber(item.lineTotal),
      productId: item.productId,
      variantLabel: item.variantLabel,
    })),
    courier: toCourierView(row.delivery),
  };
}

/** Buyurtma raqami: NVX-M-20260805-A1B2C3 */
function generateOrderNumber(): string {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('');

  return `NVX-M-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** Manzilni bitta qatorga yig'adi. */
function formatAddressLine(address: {
  city: string;
  district: string | null;
  street: string;
  building: string | null;
  apartment: string | null;
}): string {
  return [
    address.city,
    address.district,
    address.street,
    address.building ? `${address.building}-uy` : null,
    address.apartment ? `${address.apartment}-xonadon` : null,
  ]
    .filter(Boolean)
    .join(', ')
    .slice(0, 400);
}

interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Buyurtma yaratadi: zaxirani band qiladi va hamyondan pul yechadi.
 *
 * Ketma-ketlik:
 *  1. Takroriy so'rov emasligini tekshiramiz;
 *  2. Do'kon faolligini tekshiramiz;
 *  3. Mahsulotlarni bazadan olamiz — hammasi shu do'konniki va faol;
 *  4. Summani BAZADAGI narxlardan hisoblaymiz;
 *  5. Eng kam buyurtma shartini tekshiramiz;
 *  6. Manzilni tekshiramiz va matn nusxasini olamiz;
 *  7. BITTA tranzaksiyada: zaxirani kamaytirish + buyurtma + pul yechish.
 *
 * 7-qadamda ZAXIRA BIRINCHI kamaytiriladi. Sababi: mahsulot yo'q bo'lsa
 * pulni umuman yechmaslik kerak. Teskari tartibda pul yechilib, keyin
 * zaxira yetmasligi aniqlanardi — tranzaksiya orqaga qaytsa ham bu
 * ortiqcha xavf.
 */
export async function createMarketOrder(
  userId: string,
  input: CreateMarketOrderInput,
  meta: OperationMeta = {},
): Promise<MarketOrderView> {
  /**
   * Bir vaqtda kelgan takroriy so'rov.
   *
   * Pastdagi "takror bo'lsa qaytaramiz" tekshiruvi ketma-ket
   * so'rovlar uchun yetarli. Ikkita so'rov BIR VAQTDA kelsa esa
   * ikkalasi ham "yo'q" deb ko'radi va ikkinchisi yagona indeksga
   * urilib, 500 qaytarardi. Endi u birinchisining natijasini oladi.
   */
  return runIdempotent(
    () => performCreateMarketOrder(userId, input, meta),
    () => findExistingOrder(userId, input.idempotencyKey),
  );
}

/**
 * Kalit bo'yicha allaqachon yaratilgan buyurtmani topadi.
 *
 * Kalit EGASI bilan birga saqlanadi (`clientIdempotencyKey`), shuning
 * uchun bir xil kalit yuborgan ikki foydalanuvchi bir-birining
 * buyurtmasini ko'rmaydi.
 */
async function findExistingOrder(userId: string, rawKey: string): Promise<MarketOrderView | null> {
  const transaction = await prisma.walletTransaction.findUnique({
    where: { idempotencyKey: clientIdempotencyKey(userId, rawKey) },
    select: { sourceId: true },
  });

  if (!transaction?.sourceId) return null;

  const existing = await prisma.marketOrder.findUnique({
    where: { id: transaction.sourceId },
    select: ORDER_SELECT,
  });

  return existing ? toOrderView(existing) : null;
}

async function performCreateMarketOrder(
  userId: string,
  input: CreateMarketOrderInput,
  meta: OperationMeta,
): Promise<MarketOrderView> {
  // 1. Takror bo'lsa — eski buyurtmani qaytaramiz, pul ikkinchi marta ketmaydi.
  const duplicate = await prisma.walletTransaction.findUnique({
    where: { idempotencyKey: clientIdempotencyKey(userId, input.idempotencyKey) },
    select: { sourceId: true },
  });

  if (duplicate?.sourceId) {
    const existing = await prisma.marketOrder.findUnique({
      where: { id: duplicate.sourceId },
      select: ORDER_SELECT,
    });

    if (existing) return toOrderView(existing);
  }

  // 2. Do'kon.
  const shop = await prisma.shop.findFirst({
    where: { id: input.shopId, isActive: true },
    select: { id: true, name: true, isOpen: true, deliveryFee: true, minOrder: true, deliveryDays: true },
  });

  if (!shop) {
    throw new NotFoundError("Do'kon");
  }

  /**
   * Yopiq do'kon buyurtma qabul qilmaydi.
   *
   * `isActive` (admin) dan farqli: yopiq do'kon katalogda ko'rinadi va
   * mahsulotlari o'qiladi — xaridor keyinroq qaytib kelishi uchun.
   * Buyurtma esa aynan shu yerda to'xtatiladi, ya'ni pul yechilishidan
   * OLDIN.
   */
  if (!shop.isOpen) {
    throw new ConflictError(`${shop.name} hozir buyurtma qabul qilmayapti. Birozdan keyin urinib ko'ring.`);
  }

  // 3. Mahsulotlar — faqat shu do'konniki va faollari.
  const requestedIds = input.items.map((line) => line.productId);

  const products = await prisma.product.findMany({
    where: { id: { in: requestedIds }, shopId: shop.id },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      isActive: true,
      /**
       * Variantlar ham olinadi.
       *
       * ── Nima uchun BARCHASI, faqat tanlangani emas ──────────────────
       * Savatdagi variant ID'si eski bo'lishi mumkin: sotuvchi
       * variantlarni qayta yozgan bo'lsa, eskilari o'chirilgan.
       *
       * Barchasini olib, tekshirish aniq xabar berishga imkon
       * beradi: "variant o'zgargan" deb aytish "topilmadi" dan
       * ancha tushunarli.
       */
      variants: {
        select: {
          id: true,
          price: true,
          stock: true,
          isActive: true,
          values: { select: { optionValue: { select: { value: true, optionId: true } } } },
        },
      },
      options: { select: { id: true }, orderBy: { sortOrder: 'asc' } },
    },
  });

  const productById = new Map(products.map((product) => [product.id, product]));

  const missing = requestedIds.filter((id) => !productById.has(id));
  if (missing.length > 0) {
    throw new ValidationError("Savatdagi ba'zi mahsulotlar topilmadi", {
      items: ["Katalog o'zgargan. Savatni yangilab, qaytadan urinib ko'ring."],
    });
  }

  const inactive = products.filter((product) => !product.isActive);
  if (inactive.length > 0) {
    throw new ConflictError(`"${inactive[0].name}" endi sotuvda yo'q. Savatdan olib tashlang.`);
  }

  /**
   * Har bir qator uchun VARIANT aniqlanadi.
   *
   * ── Nima uchun bu yerda, savatda emas ──────────────────────────────
   * Savat brauzerda saqlanadi va unga ISHONIB bo'lmaydi: u yerdagi
   * variant ID'si eski, begona yoki umuman yasama bo'lishi mumkin.
   *
   * Shuning uchun bog'liqlik SERVERDA tekshiriladi: variant shu
   * mahsulotnikimi, faolmi va zaxirasi yetadimi.
   */
  const resolved = input.items.map((line) => {
    const product = productById.get(line.productId)!;

    /** Variantsiz mahsulot — eskicha ishlaydi. */
    if (product.options.length === 0) {
      if (line.variantId) {
        throw new ValidationError('Savat eskirgan', {
          items: [`"${product.name}" endi variantsiz sotiladi. Savatni yangilang.`],
        });
      }

      return {
        product,
        variant: null,
        unitPrice: product.price,
        stock: product.stock,
        label: null as string | null,
      };
    }

    /**
     * Variantli mahsulotda tanlov MAJBURIY.
     *
     * Aks holda qaysi rang va qaysi narx sotilgani noma'lum
     * bo'lib qolardi.
     */
    if (!line.variantId) {
      throw new ValidationError('Variant tanlanmagan', {
        items: [`"${product.name}" uchun variantni tanlang.`],
      });
    }

    const variant = product.variants.find((row) => row.id === line.variantId);

    if (!variant) {
      throw new ValidationError('Savat eskirgan', {
        items: [`"${product.name}" variantlari o'zgargan. Savatni yangilang.`],
      });
    }

    if (!variant.isActive) {
      throw new ConflictError(`"${product.name}" ning bu varianti endi sotuvda yo'q.`);
    }

    /** Nomi buyurtmaga NUSXA qilib yoziladi — sabab sxemada. */
    const optionOrder = new Map(product.options.map((option, index) => [option.id, index]));

    const label = variantLabel(
      [...variant.values]
        .sort(
          (a, b) =>
            (optionOrder.get(a.optionValue.optionId) ?? 0) -
            (optionOrder.get(b.optionValue.optionId) ?? 0),
        )
        .map((row) => row.optionValue.value),
    );

    return { product, variant, unitPrice: variant.price, stock: variant.stock, label };
  });

  /**
   * Zaxirani OLDINDAN ham tekshiramiz.
   *
   * Bu tranzaksiya ichidagi shartli `UPDATE` ning o'rnini bosmaydi —
   * u yakuniy himoya. Bu yerdagi tekshiruv esa foydalanuvchiga ANIQ
   * xabar berish uchun: qaysi mahsulot yetmayapti va nechta qolgan.
   */
  input.items.forEach((line, index) => {
    const { product, stock, label } = resolved[index];
    const shownName = label ? `${product.name} (${label})` : product.name;

    if (stock < line.quantity) {
      throw new ConflictError(
        stock === 0
          ? `"${shownName}" tugadi. Savatdan olib tashlang.`
          : `"${shownName}" dan atigi ${stock} ta qolgan. Sonini kamaytiring.`,
      );
    }
  });

  // 4. Summa — BAZADAGI narxlardan.
  const lines = input.items.map((line, index) => {
    const { product, variant, unitPrice, label } = resolved[index];

    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      variantLabel: label,
      unitPrice,
      quantity: line.quantity,
      lineTotal: unitPrice * BigInt(line.quantity),
    };
  });

  /**
   * Har bir mahsulot QAYSI VIDEODAN kelgani aniqlanadi.
   *
   * Buyurtma paytida yozilishi SHART: keyinroq hisoblansa, bosish
   * yozuvi yangilanib yoki oyna o'tib ketib, aloqa yo'qolardi.
   * Bu yerda yozilgan qiymat esa tarixiy fakt bo'lib qoladi.
   */
  const videoSources = await resolveVideoSources(
    userId,
    lines.map((line) => line.productId),
  );

  const linesWithSource = lines.map((line) => ({
    ...line,
    sourcePostId: videoSources.get(line.productId) ?? null,
  }));

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0n);

  // 5. Eng kam buyurtma.
  if (subtotal < shop.minOrder) {
    throw new ValidationError('Buyurtma summasi yetarli emas', {
      items: [`${shop.name} uchun eng kam buyurtma — ${formatTiyin(shop.minOrder)}`],
    });
  }

  const total = subtotal + shop.deliveryFee;

  // 6. Manzil — faqat o'zinikini tanlay oladi.
  const address = await prisma.address.findFirst({
    where: { id: input.addressId, userId, deletedAt: null },
    select: { id: true, city: true, district: true, street: true, building: true, apartment: true },
  });

  if (!address) {
    throw new NotFoundError('Manzil');
  }

  const wallet = await getOrCreateWallet(userId);
  const orderNumber = generateOrderNumber();

  // 7. Zaxira, buyurtma va pul — ajralmas uchlik.
  const order = await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      /**
       * ENG MUHIM QATOR. Shart `UPDATE` ning o'zida turadi, shuning
       * uchun bir vaqtda kelgan ikki so'rovdan faqat bittasi o'tadi.
       */
      const shownName = line.variantLabel ? `${line.name} (${line.variantLabel})` : line.name;

      if (line.variantId) {
        /**
         * VARIANT zaxirasi shart bilan kamayadi — bir vaqtda
         * kelgan ikki so'rovdan faqat bittasi o'tadi.
         */
        const claimedVariant = await tx.productVariant.updateMany({
          where: { id: line.variantId, isActive: true, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });

        if (claimedVariant.count === 0) {
          throw new ConflictError(
            `"${shownName}" hozirgina sotib olindi va zaxira tugadi. Savatni yangilang.`,
          );
        }

        /**
         * Mahsulotdagi NUSXA ham kamayadi.
         *
         * Bu yerda shart yo'q: variant tekshiruvi allaqachon
         * o'tdi va nusxa faqat yig'indini kuzatib boradi.
         */
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.quantity } },
          select: { id: true },
        });

        continue;
      }

      const claimed = await tx.product.updateMany({
        where: { id: line.productId, isActive: true, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });

      if (claimed.count === 0) {
        throw new ConflictError(
          `"${shownName}" hozirgina sotib olindi va zaxira tugadi. Savatni yangilang.`,
        );
      }
    }

    const created = await tx.marketOrder.create({
      data: {
        userId,
        shopId: shop.id,
        addressId: address.id,
        orderNumber,
        /**
         * Buyurtma DO'KON TASDIG'INI kutadi.
         *
         * 14-bosqichda bu qator `CONFIRMED` edi: sotuvchi kabineti hali
         * yo'q edi va buyurtmani hech kim qabul qilmasdi, shuning uchun
         * to'lov o'tgani qabul qilingan deb hisoblanardi.
         *
         * 16-bosqichda kabinet paydo bo'ldi — endi qabul qilish
         * HAQIQIY amal: sotuvchi omborni ko'radi va o'zi tasdiqlaydi.
         * Aks holda xaridor "qabul qilindi" degan yozuvni ko'rib
         * turadi, do'kon esa buyurtmadan bexabar qoladi.
         */
        status: MarketOrderStatus.PENDING,
        subtotal,
        deliveryFee: shop.deliveryFee,
        total,
        deliveryAddress: formatAddressLine(address),
        deliveryNote: input.deliveryNote ?? null,
        items: { create: linesWithSource },
      },
      select: { id: true },
    });

    const charge = await chargeWallet(tx, {
      userId,
      walletId: wallet.id,
      amountTiyin: total,
      description: `${shop.name} — marketplace buyurtmasi`,
      sourceModule: SOURCE_MODULE,
      sourceId: created.id,
      idempotencyKey: clientIdempotencyKey(userId, input.idempotencyKey),
    });

    /*
      ── Savat SHU YERDA bo'shatiladi ────────────────────────────────
      Ilgari savat brauzerda turardi va uni sahifa o'zi tozalardi.
      45-bosqichdan keyin savat serverda: uni ekranga ishonib
      qo'yib bo'lmaydi.

      Sabab oddiy: odam to'lov tugmasini bosgach ilovani yopib
      qo'yishi yoki interneti uzilishi mumkin. O'shanda buyurtma
      berilgan, savat esa to'la qolardi va u boshqa qurilmada
      ham ko'rinardi.

      Bitta amaliyot ichida esa ikkalasi birga bajariladi yoki
      ikkalasi ham bajarilmaydi.

      "Keyinroq" ro'yxati TEGILMAYDI — u buyurtmaga aloqador emas.
    */
    await tx.cartItem.deleteMany({ where: { userId, savedForLater: false } });

    // Buyurtma tarixining birinchi yozuvi.
    await recordOrderEvent(tx, {
      orderId: created.id,
      status: MarketOrderStatus.PENDING,
      actorId: userId,
    });

    return tx.marketOrder.update({
      where: { id: created.id },
      data: { walletTransactionId: charge.id },
      select: ORDER_SELECT,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.MARKET_ORDER_CREATED,
    resourceType: 'MarketOrder',
    resourceId: order.id,
    module: SOURCE_MODULE,
    metadata: { amountTiyin: total.toString(), shop: shop.name, orderNumber },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  await notifyUser(userId, 'market.order_created', {
    orderId: order.id,
    orderNumber,
    shopName: shop.name,
    amountTiyin: tiyinToNumber(total),
    deliveryDays: shop.deliveryDays,
  });

  logger.info(
    { userId, orderId: order.id, shop: shop.name, total: total.toString() },
    'Marketplace buyurtmasi yaratildi',
  );

  return toOrderView(order);
}

/** Xaridor bekor qila oladigan holatlar — `market.types.ts` bilan bir xil. */
const CANCELLABLE: MarketOrderStatus[] = [
  MarketOrderStatus.PENDING,
  MarketOrderStatus.CONFIRMED,
  MarketOrderStatus.PACKING,
];

/**
 * Buyurtmani bekor qiladi: pulni qaytaradi VA zaxirani tiklaydi.
 *
 * ── Ovqatdan ikkita farqi ─────────────────────────────────────────────
 * 1. Bekor qilish oynasi kengroq — mahsulot yig'ilayotgan bo'lsa ham
 *    hali omborda turadi, uni javonga qaytarish mumkin. Yo'lga
 *    chiqqandan keyingina kech bo'ladi.
 * 2. Zaxira TIKLANADI. Ovqatda tiklanadigan narsa yo'q edi.
 *
 * Ikki marta qaytarishning oldini idempotentlik kaliti oladi:
 * `market-refund-{orderId}` ustuni bazada UNIQUE.
 */
export async function cancelMarketOrder(
  userId: string,
  orderId: string,
  input: CancelMarketOrderInput,
  meta: OperationMeta = {},
): Promise<MarketOrderView> {
  const order = await prisma.marketOrder.findFirst({
    where: { id: orderId, userId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      shop: { select: { name: true } },
      items: { select: { productId: true, variantId: true, quantity: true } },
    },
  });

  if (!order) {
    throw new NotFoundError('Buyurtma');
  }

  if (order.status === MarketOrderStatus.CANCELLED) {
    throw new ConflictError('Buyurtma allaqachon bekor qilingan');
  }

  if (!CANCELLABLE.includes(order.status)) {
    throw new ConflictError(
      "Buyurtma allaqachon yo'lga chiqarilgan — uni bekor qilib bo'lmaydi. Qo'llab-quvvatlashga murojaat qiling.",
    );
  }

  const wallet = await getOrCreateWallet(userId);
  const reason = input.reason ?? 'Foydalanuvchi bekor qildi';

  const cancelled = await prisma.$transaction(async (tx) => {
    // Holatni QULF ostida yana tekshiramiz: shu oraliqda do'kon
    // buyurtmani jo'natgan bo'lishi mumkin.
    const claimed = await tx.marketOrder.updateMany({
      where: { id: order.id, status: { in: CANCELLABLE } },
      data: {
        status: MarketOrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    if (claimed.count === 0) {
      throw new ConflictError("Buyurtma holati o'zgardi. Sahifani yangilang.");
    }

    /**
     * Zaxirani tiklaymiz.
     *
     * `productId` `null` bo'lishi mumkin — mahsulot katalogdan
     * o'chirilgan bo'lsa. Unda tiklaydigan narsa yo'q, buyurtma qatori
     * esa tarix uchun qoladi.
     */
    for (const item of order.items) {
      if (!item.productId) continue;

      /**
       * VARIANT zaxirasi ham tiklanadi.
       *
       * Mahsulotdagi zaxira variantlar yig'indisining NUSXASI,
       * shuning uchun ikkalasi ham bir xil miqdorga oshadi —
       * aks holda nusxa haqiqatdan ajralib qolardi.
       */
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    const credit = await refundWallet(tx, {
      walletId: wallet.id,
      amountTiyin: order.total,
      description: `${order.shop.name} — buyurtma bekor qilindi`,
      sourceModule: SOURCE_MODULE,
      sourceId: order.id,
      idempotencyKey: `market-refund-${order.id}`,
    });

    await recordOrderEvent(tx, {
      orderId: order.id,
      status: MarketOrderStatus.CANCELLED,
      actorId: userId,
      note: reason,
    });

    return tx.marketOrder.update({
      where: { id: order.id },
      data: { refundTransactionId: credit.id },
      select: ORDER_SELECT,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.MARKET_ORDER_CANCELLED,
    resourceType: 'MarketOrder',
    resourceId: order.id,
    module: SOURCE_MODULE,
    metadata: { amountTiyin: order.total.toString(), orderNumber: order.orderNumber, reason },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  await notifyUser(userId, 'market.order_cancelled', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    shopName: order.shop.name,
    amountTiyin: tiyinToNumber(order.total),
  });

  logger.info({ userId, orderId: order.id, reason }, 'Marketplace buyurtmasi bekor qilindi');

  return toOrderView(cancelled);
}

/** "Faol" — hali yetkazilmagan va bekor qilinmagan buyurtmalar. */
function buildStatusFilter(status: MarketOrderQuery['status']): Prisma.MarketOrderWhereInput {
  switch (status) {
    case 'ACTIVE':
      return {
        status: {
          in: [
            MarketOrderStatus.PENDING,
            MarketOrderStatus.CONFIRMED,
            MarketOrderStatus.PACKING,
            MarketOrderStatus.SHIPPED,
          ],
        },
      };
    case 'DELIVERED':
      return { status: MarketOrderStatus.DELIVERED };
    case 'CANCELLED':
      return { status: MarketOrderStatus.CANCELLED };
    default:
      return {};
  }
}

/** Foydalanuvchining buyurtmalari — sahifalangan. */
export async function listMarketOrders(
  userId: string,
  query: MarketOrderQuery,
): Promise<{ orders: MarketOrderView[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  const where: Prisma.MarketOrderWhereInput = { userId, ...buildStatusFilter(query.status) };

  const [rows, total] = await Promise.all([
    prisma.marketOrder.findMany({
      where,
      select: ORDER_SELECT,
      orderBy: { createdAt: query.order },
      skip,
      take,
    }),
    prisma.marketOrder.count({ where }),
  ]);

  return { orders: rows.map(toOrderView), total };
}

/** Bitta buyurtma. Boshqa foydalanuvchi buyurtmasi ko'rinmaydi. */
export async function getMarketOrder(userId: string, orderId: string): Promise<MarketOrderView> {
  const order = await prisma.marketOrder.findFirst({
    where: { id: orderId, userId },
    select: ORDER_SELECT,
  });

  if (!order) {
    throw new NotFoundError('Buyurtma');
  }

  return toOrderView(order);
}
