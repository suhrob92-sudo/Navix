import { MarketOrderStatus, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { formatTiyin, somToTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { toSearchText } from '@/lib/search';
import type { ServiceColor } from '@/config/modules';
import { notifyUser } from '@/modules/notification/notification.service';
import { chargeWallet, getOrCreateWallet, refundWallet } from '@/modules/wallet/wallet.service';
import type {
  CancelMarketOrderInput,
  CreateMarketOrderInput,
  MarketOrderQuery,
  ProductQuery,
} from '@/modules/market/market.schemas';
import type {
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
  deliveryFee: true,
  minOrder: true,
  deliveryDays: true,
  rating: true,
  ratingCount: true,
  color: true,
  _count: { select: { products: { where: { isActive: true } } } },
} as const;

type ShopRow = Prisma.ShopGetPayload<{ select: typeof SHOP_SELECT }>;

function toShopItem(row: ShopRow): ShopListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    deliveryFee: tiyinToNumber(row.deliveryFee),
    minOrder: tiyinToNumber(row.minOrder),
    deliveryDays: row.deliveryDays,
    rating: Number(row.rating),
    ratingCount: row.ratingCount,
    color: row.color as ServiceColor,
    productCount: row._count.products,
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
export async function getShop(slug: string): Promise<{ shop: ShopListItem; products: ProductListItem[] }> {
  const shop = await prisma.shop.findFirst({ where: { slug, isActive: true }, select: SHOP_SELECT });

  if (!shop) {
    throw new NotFoundError("Do'kon");
  }

  const products = await prisma.product.findMany({
    where: { shopId: shop.id, isActive: true },
    select: PRODUCT_SELECT,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return { shop: toShopItem(shop), products: products.map(toProductItem) };
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

  const product: ProductDetail = {
    ...toProductItem(row),
    description: row.description,
    shopDeliveryFee: tiyinToNumber(row.shop.deliveryFee),
    shopMinOrder: tiyinToNumber(row.shop.minOrder),
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
  items: {
    select: { id: true, name: true, unitPrice: true, quantity: true, lineTotal: true },
    orderBy: { name: 'asc' as const },
  },
} as const;

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
    items: row.items.map((item) => ({
      id: item.id,
      name: item.name,
      unitPrice: tiyinToNumber(item.unitPrice),
      quantity: item.quantity,
      lineTotal: tiyinToNumber(item.lineTotal),
    })),
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
  // 1. Takror bo'lsa — eski buyurtmani qaytaramiz, pul ikkinchi marta ketmaydi.
  const duplicate = await prisma.walletTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
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
    select: { id: true, name: true, deliveryFee: true, minOrder: true, deliveryDays: true },
  });

  if (!shop) {
    throw new NotFoundError("Do'kon");
  }

  // 3. Mahsulotlar — faqat shu do'konniki va faollari.
  const requestedIds = input.items.map((line) => line.productId);

  const products = await prisma.product.findMany({
    where: { id: { in: requestedIds }, shopId: shop.id },
    select: { id: true, name: true, price: true, stock: true, isActive: true },
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
   * Zaxirani OLDINDAN ham tekshiramiz.
   *
   * Bu tranzaksiya ichidagi shartli `UPDATE` ning o'rnini bosmaydi —
   * u yakuniy himoya. Bu yerdagi tekshiruv esa foydalanuvchiga ANIQ
   * xabar berish uchun: qaysi mahsulot yetmayapti va nechta qolgan.
   */
  for (const line of input.items) {
    const product = productById.get(line.productId)!;

    if (product.stock < line.quantity) {
      throw new ConflictError(
        product.stock === 0
          ? `"${product.name}" tugadi. Savatdan olib tashlang.`
          : `"${product.name}" dan atigi ${product.stock} ta qolgan. Sonini kamaytiring.`,
      );
    }
  }

  // 4. Summa — BAZADAGI narxlardan.
  const lines = input.items.map((line) => {
    const product = productById.get(line.productId)!;

    return {
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity: line.quantity,
      lineTotal: product.price * BigInt(line.quantity),
    };
  });

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
      const claimed = await tx.product.updateMany({
        where: { id: line.productId, isActive: true, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });

      if (claimed.count === 0) {
        throw new ConflictError(
          `"${line.name}" hozirgina sotib olindi va zaxira tugadi. Savatni yangilang.`,
        );
      }
    }

    const created = await tx.marketOrder.create({
      data: {
        userId,
        shopId: shop.id,
        addressId: address.id,
        orderNumber,
        // To'lov o'tgani — do'kon buyurtmani qabul qilgani demak
        // (hozircha simulyatsiya; sotuvchi kabineti keyingi bosqichda).
        status: MarketOrderStatus.CONFIRMED,
        subtotal,
        deliveryFee: shop.deliveryFee,
        total,
        deliveryAddress: formatAddressLine(address),
        deliveryNote: input.deliveryNote ?? null,
        confirmedAt: new Date(),
        items: { create: lines },
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
      idempotencyKey: input.idempotencyKey,
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
      items: { select: { productId: true, quantity: true } },
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
