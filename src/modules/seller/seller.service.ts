import { MarketOrderStatus, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { startOfTashkentDay, startOfTashkentDaysAgo } from '@/lib/date';
import { logger } from '@/lib/logger';
import { somToTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { toSearchText } from '@/lib/search';
import { slugify } from '@/lib/utils';
import { GALLERY_SELECT, toGallery } from '@/modules/catalog/catalog-image.select';
import type { ServiceColor } from '@/config/modules';
import { notifyUser } from '@/modules/notification/notification.service';
import { refundWallet } from '@/modules/wallet/wallet.service';
import { canTransition, type MarketOrderStatusName } from '@/modules/market/market.types';
import { assertDeliveryNotPending, createMarketDelivery } from '@/modules/courier/courier.service';
import type {
  CreateSellerProductInput,
  SellerOrderQuery,
  UpdateSellerOrderStatusInput,
  UpdateSellerProductInput,
  UpdateSellerShopInput,
} from '@/modules/seller/seller.schemas';
import type {
  SellerCategoryOption,
  SellerOrder,
  SellerProduct,
  SellerShop,
  SellerStats,
} from '@/modules/seller/seller.types';

/**
 * Sotuvchi kabineti — Marketplace do'koni.
 *
 * ── Asosiy qoida: EGALIK har bir amalda tekshiriladi ──────────────────
 * Restoran kabineti bilan bir xil: tekshiruv mijoz yuborgan `shopId` ga
 * emas, tokendagi foydalanuvchiga tayanadi. Har so'rovda
 * `shop.ownerId = userId` sharti qo'yiladi, begona ID esa "topilmadi"
 * qaytaradi — boshqa do'kon mavjudligini ham oshkor qilmaymiz.
 *
 * ── Restoran kabinetidan UCHTA jiddiy farqi ───────────────────────────
 *
 * 1. ZAXIRA. Restoran menyusida faqat "bor/yo'q" bor. Do'konda esa aniq
 *    SON turadi va u pul bilan bir qatorda o'zgaradi: buyurtma berilganda
 *    kamayadi, bekor qilinganda ortga qaytadi. Shuning uchun sotuvchi uni
 *    tahrirlaganda ham yozuv AUDITGA tushadi.
 *
 * 2. YANGI MAHSULOT QO'SHISH. Restoranga menyu bir marta kiritiladi va
 *    kamdan-kam o'zgaradi. Do'kon esa har hafta yangi tovar keltiradi —
 *    buni dasturchidan so'rab bo'lmaydi.
 *
 * 3. RAD ETISH ZAXIRANI TIKLAYDI. Ovqat rad etilganda qaytariladigan
 *    narsa faqat pul. Mahsulot rad etilganda pul ham, zaxira ham
 *    qaytadi — aks holda javonda turgan tovar bazada "sotilgan" bo'lib
 *    qolaverardi.
 */

const MODULE = 'seller';

/** Hozir e'tibor talab qiladigan holatlar. */
const ACTIVE_STATUSES: MarketOrderStatus[] = [
  MarketOrderStatus.PENDING,
  MarketOrderStatus.CONFIRMED,
  MarketOrderStatus.PACKING,
  MarketOrderStatus.SHIPPED,
];

// ── Do'konlar ─────────────────────────────────────────────────────────

/**
 * Foydalanuvchiga tegishli do'konlar va umumiy ko'rsatkichlar.
 *
 * Bitta odam bir nechta do'konga ega bo'lishi mumkin, shuning uchun
 * ro'yxat qaytariladi.
 */
export async function getSellerOverview(userId: string): Promise<{ shops: SellerShop[]; stats: SellerStats }> {
  const rows = await prisma.shop.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      slug: true,
      name: true,
      color: true,
      isOpen: true,
      isActive: true,
      deliveryDays: true,
      deliveryFee: true,
      minOrder: true,
      rating: true,
      ratingCount: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  });

  if (rows.length === 0) {
    return { shops: [], stats: emptyStats() };
  }

  const shopIds = rows.map((row) => row.id);

  /**
   * Faol buyurtmalar va tugagan mahsulotlar — HAR BIRI bitta so'rovda.
   *
   * Do'kon boshiga alohida so'rov yuborilsa, 5 ta do'koni bor sotuvchida
   * kabinet 10 ta so'rov qilardi. `groupBy` bitta so'rovda hal qiladi.
   */
  const [activeCounts, outOfStockCounts] = await Promise.all([
    prisma.marketOrder.groupBy({
      by: ['shopId'],
      where: { shopId: { in: shopIds }, status: { in: ACTIVE_STATUSES } },
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ['shopId'],
      where: { shopId: { in: shopIds }, isActive: true, stock: { lte: 0 } },
      _count: { _all: true },
    }),
  ]);

  const activeByShop = new Map(activeCounts.map((row) => [row.shopId, row._count._all]));
  const outOfStockByShop = new Map(outOfStockCounts.map((row) => [row.shopId, row._count._all]));

  const shops: SellerShop[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    color: row.color as ServiceColor,
    isOpen: row.isOpen,
    isActive: row.isActive,
    deliveryDays: row.deliveryDays,
    deliveryFee: tiyinToNumber(row.deliveryFee),
    minOrder: tiyinToNumber(row.minOrder),
    rating: Number(row.rating),
    ratingCount: row.ratingCount,
    productCount: row._count.products,
    activeOrderCount: activeByShop.get(row.id) ?? 0,
    outOfStockCount: outOfStockByShop.get(row.id) ?? 0,
  }));

  const stats = await getSellerStats(shopIds);

  return {
    shops,
    stats: { ...stats, outOfStock: shops.reduce((sum, shop) => sum + shop.outOfStockCount, 0) },
  };
}

function emptyStats(): SellerStats {
  return {
    todayOrders: 0,
    todayRevenue: 0,
    weekOrders: 0,
    weekRevenue: 0,
    activeOrders: 0,
    cancelledToday: 0,
    outOfStock: 0,
  };
}

/**
 * Kabinetdagi raqamlar.
 *
 * Daromadga faqat BEKOR QILINMAGAN buyurtmalar kiradi: bekor qilingan
 * buyurtmada pul xaridorga qaytgan, uni daromad deb ko'rsatish
 * sotuvchini chalg'itardi.
 */
async function getSellerStats(shopIds: string[]): Promise<SellerStats> {
  const todayStart = startOfTashkentDay();
  const weekStart = startOfTashkentDaysAgo(7);

  const earning = { not: MarketOrderStatus.CANCELLED };

  const [today, week, active, cancelledToday] = await Promise.all([
    prisma.marketOrder.aggregate({
      _count: true,
      _sum: { total: true },
      where: { shopId: { in: shopIds }, status: earning, createdAt: { gte: todayStart } },
    }),
    prisma.marketOrder.aggregate({
      _count: true,
      _sum: { total: true },
      where: { shopId: { in: shopIds }, status: earning, createdAt: { gte: weekStart } },
    }),
    prisma.marketOrder.count({
      where: { shopId: { in: shopIds }, status: { in: ACTIVE_STATUSES } },
    }),
    prisma.marketOrder.count({
      where: {
        shopId: { in: shopIds },
        status: MarketOrderStatus.CANCELLED,
        createdAt: { gte: todayStart },
      },
    }),
  ]);

  return {
    todayOrders: today._count,
    todayRevenue: today._sum.total === null ? 0 : tiyinToNumber(today._sum.total),
    weekOrders: week._count,
    weekRevenue: week._sum.total === null ? 0 : tiyinToNumber(week._sum.total),
    activeOrders: active,
    cancelledToday,
    outOfStock: 0,
  };
}

/**
 * Do'kon sozlamalarini o'zgartiradi (ochiq/yopiq, yetkazish muddati).
 *
 * "Yopish" — eng ko'p ishlatiladigan tugma: sotuvchi ta'tilga chiqqanda
 * yoki omborni sanayotganda do'konni vaqtincha to'xtatadi. Do'kon
 * ro'yxatda qolaveradi, lekin yangi buyurtma qabul qilmaydi.
 */
export async function updateSellerShop(
  userId: string,
  shopId: string,
  input: UpdateSellerShopInput,
  meta: OperationMeta = {},
): Promise<SellerShop> {
  await assertOwnsShop(userId, shopId);

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      ...(input.isOpen === undefined ? {} : { isOpen: input.isOpen }),
      ...(input.deliveryDays === undefined ? {} : { deliveryDays: input.deliveryDays }),
    },
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.SELLER_SHOP_UPDATED,
    resourceType: 'Shop',
    resourceId: shopId,
    module: MODULE,
    metadata: { ...input },
    ...meta,
  });

  logger.info({ userId, shopId, changed: Object.keys(input) }, "Do'kon sozlamasi o'zgartirildi");

  const overview = await getSellerOverview(userId);
  const updated = overview.shops.find((shop) => shop.id === shopId);

  if (!updated) {
    throw new NotFoundError("Do'kon");
  }

  return updated;
}

/** Do'kon shu foydalanuvchiga tegishlimi. */
async function assertOwnsShop(userId: string, shopId: string): Promise<void> {
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: userId },
    select: { id: true },
  });

  if (!shop) {
    // "Sizniki emas" emas, "topilmadi": begona do'kon mavjudligini ham
    // oshkor qilmaymiz.
    throw new NotFoundError("Do'kon");
  }
}

// ── Mahsulotlar ───────────────────────────────────────────────────────

const PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  price: true,
  oldPrice: true,
  stock: true,
  isActive: true,
  categoryId: true,
  category: { select: { name: true } },
  images: GALLERY_SELECT,
} as const;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>;

function toSellerProduct(row: ProductRow): SellerProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: tiyinToNumber(row.price),
    oldPrice: row.oldPrice === null ? null : tiyinToNumber(row.oldPrice),
    stock: row.stock,
    isActive: row.isActive,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    images: toGallery(row.images),
  };
}

/**
 * Do'kon mahsulotlari va toifalar ro'yxati.
 *
 * Toifalar shu yerda birga qaytadi: "yangi mahsulot" oynasi ularsiz
 * ochilmaydi va alohida so'rov qilish telefonda ortiqcha kutish demak.
 *
 * Tugaganlari TEPADA turadi — sotuvchi kabinetga aynan shular uchun
 * kiradi.
 */
export async function listSellerProducts(
  userId: string,
  shopId: string,
): Promise<{ products: SellerProduct[]; categories: SellerCategoryOption[] }> {
  await assertOwnsShop(userId, shopId);

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { shopId },
      select: PRODUCT_SELECT,
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
    }),
    prisma.productCategory.findMany({
      select: { id: true, name: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
  ]);

  return { products: products.map(toSellerProduct), categories };
}

/**
 * Yangi mahsulot qo'shadi.
 *
 * ── Nima uchun `slug` ni server yasaydi ───────────────────────────────
 * Manzil ustuni UNIQUE. Ikki do'kon "Redmi Note 14" sotsa, ikkalasi ham
 * "redmi-note-14" ga da'vogar bo'ladi. Shuning uchun nomdan asos
 * olinadi va band bo'lsa oxiriga son qo'shiladi.
 *
 * Tekshirib-yozish orasida boshqa so'rov ulgurib qolishi mumkin, shu
 * sababli UNIQUE xatosi (`P2002`) ham ushlanadi va urinish takrorlanadi.
 * Bazadagi cheklov — yagona ishonchli hakam.
 */
export async function createSellerProduct(
  userId: string,
  shopId: string,
  input: CreateSellerProductInput,
  meta: OperationMeta = {},
): Promise<SellerProduct> {
  await assertOwnsShop(userId, shopId);
  await assertCategoryExists(input.categoryId);

  const price = somToTiyin(input.priceSom);
  const oldPrice = input.oldPriceSom === undefined ? null : somToTiyin(input.oldPriceSom);

  assertOldPriceIsHigher(price, oldPrice);

  const created = await createWithUniqueSlug(input.name, (slug) =>
    prisma.product.create({
      data: {
        shopId,
        categoryId: input.categoryId,
        slug,
        name: input.name,
        description: input.description ?? null,
        price,
        oldPrice,
        searchName: toSearchText(input.name),
        stock: input.stock,
      },
      select: PRODUCT_SELECT,
    }),
  );

  await recordAudit({
    actorId: userId,
    action: AuditAction.SELLER_PRODUCT_CREATED,
    resourceType: 'Product',
    resourceId: created.id,
    module: MODULE,
    metadata: {
      shopId,
      name: created.name,
      priceTiyin: price.toString(),
      stock: input.stock,
    },
    ...meta,
  });

  logger.info({ userId, shopId, productId: created.id }, "Yangi mahsulot qo'shildi");

  return toSellerProduct(created);
}

/**
 * Mahsulotni yangilaydi: narx, zaxira, tavsif yoki sotuvdagi holati.
 *
 * Narx o'zgarishi ESKI buyurtmalarga ta'sir qilmaydi — ular nomi va
 * narxining nusxasini saqlaydi (`market_order_items`).
 *
 * Nom o'zgarganda `searchName` HAM yoziladi: aks holda mahsulot yangi
 * nomi bo'yicha qidiruvda topilmay qolardi. Manzil (`slug`) esa
 * ATAYLAB o'zgarmaydi — tashqarida ulashilgan havolalar buzilmasligi
 * kerak.
 */
export async function updateSellerProduct(
  userId: string,
  productId: string,
  input: UpdateSellerProductInput,
  meta: OperationMeta = {},
): Promise<SellerProduct> {
  const existing = await prisma.product.findFirst({
    where: { id: productId, shop: { ownerId: userId } },
    select: { id: true, name: true, price: true, oldPrice: true, stock: true },
  });

  if (!existing) {
    throw new NotFoundError('Mahsulot');
  }

  const price = input.priceSom === undefined ? existing.price : somToTiyin(input.priceSom);

  // `null` — "chegirmani olib tashla", `undefined` — "tegmadim".
  const oldPrice =
    input.oldPriceSom === undefined
      ? existing.oldPrice
      : input.oldPriceSom === null
        ? null
        : somToTiyin(input.oldPriceSom);

  assertOldPriceIsHigher(price, oldPrice);

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: {
      ...(input.name === undefined ? {} : { name: input.name, searchName: toSearchText(input.name) }),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.priceSom === undefined ? {} : { price }),
      ...(input.oldPriceSom === undefined ? {} : { oldPrice }),
      ...(input.stock === undefined ? {} : { stock: input.stock }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    },
    select: PRODUCT_SELECT,
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.SELLER_PRODUCT_UPDATED,
    resourceType: 'Product',
    resourceId: existing.id,
    module: MODULE,
    metadata: {
      changed: Object.keys(input),
      // Zaxira nizoda eng ko'p so'raladigan raqam — eskisi ham yoziladi.
      ...(input.stock === undefined ? {} : { stockFrom: existing.stock, stockTo: input.stock }),
    },
    ...meta,
  });

  logger.info({ userId, productId: existing.id, changed: Object.keys(input) }, "Mahsulot o'zgartirildi");

  return toSellerProduct(updated);
}

/** Toifa bazada bormi — bo'lmasa Prisma xatosi tushunarsiz bo'lardi. */
async function assertCategoryExists(categoryId: string): Promise<void> {
  const category = await prisma.productCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });

  if (!category) {
    throw new ValidationError('Toifa topilmadi. Ro\'yxatdan qaytadan tanlang.');
  }
}

/**
 * Eski narx yangisidan katta bo'lishi shart.
 *
 * Aks holda kartochkada "2 000 000 so'm (eski narx 1 000 000)" degan
 * ma'nosiz chegirma chiqadi — bu xaridorni chalg'itadi.
 */
function assertOldPriceIsHigher(price: bigint, oldPrice: bigint | null): void {
  if (oldPrice !== null && oldPrice <= price) {
    throw new ValidationError("Eski narx joriy narxdan katta bo'lishi kerak");
  }
}

/** Manzil bandligi tufayli takrorlanadigan urinishlar soni. */
const SLUG_ATTEMPTS = 20;

/**
 * Bo'sh manzil topib yozadi.
 *
 * Har urinishda YANGI manzil bilan yozishga harakat qilinadi; UNIQUE
 * xatosi kelsa keyingisiga o'tiladi. Boshqa har qanday xato darhol
 * yuqoriga uzatiladi — uni yashirish nosozlikni ko'rinmas qilardi.
 */
async function createWithUniqueSlug<T>(name: string, create: (slug: string) => Promise<T>): Promise<T> {
  const base = slugify(name).slice(0, 60) || 'mahsulot';

  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
    const slug = attempt === 0 ? base : `${base.slice(0, 55)}-${attempt + 1}`;

    try {
      return await create(slug);
    } catch (error) {
      if (!isUniqueSlugError(error)) throw error;
    }
  }

  throw new ConflictError("Shu nomdagi mahsulot juda ko'p. Nomni aniqroq yozing.");
}

/**
 * Bu xato aynan MANZIL bandligimi.
 *
 * ── Nima uchun ikki joydan qaraladi ───────────────────────────────────
 * `meta.target` — qaysi ustun to'qnashgani haqidagi rasmiy maydon.
 * Lekin Prisma 7 ning `@prisma/adapter-pg` drayveri uni HAR DOIM ham
 * to'ldirmaydi: `meta` da faqat `modelName` qoladi, ustun nomi esa
 * xabar matnida bo'ladi ("Unique constraint failed on the fields:
 * (`slug`)").
 *
 * Faqat `meta.target` ga tayangan birinchi variant shu sababli
 * ishlamadi va xato yuzaga chiqdi — haqiqiy bazada sinovda topildi.
 * Endi ikkala manba ham tekshiriladi: qaysi biri to'lgan bo'lsa,
 * javob o'sha yerdan olinadi.
 */
function isUniqueSlugError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;
  const targetText = Array.isArray(target) ? target.join(',') : String(target ?? '');

  return `${targetText} ${error.message}`.toLowerCase().includes('slug');
}

// ── Buyurtmalar ───────────────────────────────────────────────────────

const SELLER_ORDER_SELECT = {
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
  confirmedAt: true,
  shippedAt: true,
  deliveredAt: true,
  shop: { select: { id: true, name: true, color: true } },
  user: { select: { firstName: true, lastName: true, phone: true } },
  items: {
    select: { id: true, name: true, quantity: true, unitPrice: true, lineTotal: true },
    orderBy: { name: 'asc' as const },
  },
} as const;

type SellerOrderRow = Prisma.MarketOrderGetPayload<{ select: typeof SELLER_ORDER_SELECT }>;

function toSellerOrder(row: SellerOrderRow): SellerOrder {
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
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    shippedAt: row.shippedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    shop: {
      id: row.shop.id,
      name: row.shop.name,
      color: row.shop.color as ServiceColor,
    },
    customer: {
      name: [row.user.firstName, row.user.lastName].filter(Boolean).join(' ') || null,
      phone: row.user.phone,
    },
    items: row.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: tiyinToNumber(item.unitPrice),
      lineTotal: tiyinToNumber(item.lineTotal),
    })),
  };
}

/**
 * Do'kon buyurtmalari.
 *
 * Standart filtr — FAOL buyurtmalar va ular ESKISIDAN boshlab
 * ko'rsatiladi: omborda birinchi kelgan birinchi yig'iladi.
 */
export async function listSellerOrders(
  userId: string,
  query: SellerOrderQuery,
): Promise<{ orders: SellerOrder[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  if (query.shopId) {
    await assertOwnsShop(userId, query.shopId);
  }

  const where: Prisma.MarketOrderWhereInput = {
    shop: { ownerId: userId },
    ...(query.shopId ? { shopId: query.shopId } : {}),
    ...buildStatusFilter(query.status),
  };

  // Faol ro'yxatda eng eskisi tepada: navbat tartibi buzilmasligi kerak.
  const isQueue = query.status === 'ACTIVE';

  const [rows, total] = await Promise.all([
    prisma.marketOrder.findMany({
      where,
      select: SELLER_ORDER_SELECT,
      orderBy: { createdAt: isQueue ? 'asc' : query.order },
      skip,
      take,
    }),
    prisma.marketOrder.count({ where }),
  ]);

  return { orders: rows.map(toSellerOrder), total };
}

function buildStatusFilter(status: SellerOrderQuery['status']): Prisma.MarketOrderWhereInput {
  if (status === 'ALL') return {};
  if (status === 'ACTIVE') return { status: { in: ACTIVE_STATUSES } };

  return { status: status as MarketOrderStatus };
}

/** Bitta buyurtma. Begona do'kon buyurtmasi "topilmadi" qaytaradi. */
export async function getSellerOrder(userId: string, orderId: string): Promise<SellerOrder> {
  const order = await prisma.marketOrder.findFirst({
    where: { id: orderId, shop: { ownerId: userId } },
    select: SELLER_ORDER_SELECT,
  });

  if (!order) {
    throw new NotFoundError('Buyurtma');
  }

  return toSellerOrder(order);
}

interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Buyurtma holatini o'zgartiradi.
 *
 * ── Uchta himoya (restoran kabineti bilan bir xil) ────────────────────
 *
 * 1. EGALIK: so'rov shartida `shop.ownerId = userId`.
 *
 * 2. HOLATLAR AVTOMATI: `canTransition()` ruxsat bermasa xatolik.
 *    Jadval `market.types.ts` da — server, interfeys va testlar bitta
 *    manbadan oziqlanadi.
 *
 * 3. RAQOBAT: yozish `updateMany` orqali, ESKI holat sharti bilan
 *    bajariladi. Ikki xodim bir vaqtda bossa, ikkinchisi "holat
 *    o'zgardi" xabarini oladi va ekranini yangilaydi.
 *
 * Rad etish (`CANCELLED`) alohida yo'l: u pulni ham, zaxirani ham
 * qaytaradi.
 */
export async function updateSellerOrderStatus(
  userId: string,
  orderId: string,
  input: UpdateSellerOrderStatusInput,
  meta: OperationMeta = {},
): Promise<SellerOrder> {
  const order = await prisma.marketOrder.findFirst({
    where: { id: orderId, shop: { ownerId: userId } },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      deliveryFee: true,
      userId: true,
      shop: { select: { name: true } },
      items: { select: { productId: true, quantity: true } },
    },
  });

  if (!order) {
    throw new NotFoundError('Buyurtma');
  }

  const from = order.status as MarketOrderStatusName;
  const to = input.status as MarketOrderStatusName;

  if (!canTransition(from, to)) {
    throw new ConflictError(buildTransitionMessage(from, to));
  }

  // Tekshiruv `input.status` bo'yicha: shunda TypeScript quyida
  // `CANCELLED` chiqib ketganini o'zi biladi va bildirishnoma turi
  // aniq bo'ladi (cast kerak emas).
  if (input.status === 'CANCELLED') {
    return rejectOrder(userId, order, input.reason ?? "Do'kon buyurtmani bajara olmadi", meta);
  }

  const now = new Date();

  /**
   * Holat o'zgarishi va kuryer topshirig'i BITTA tranzaksiyada.
   *
   * "Yo'lga chiqarish" bosilganda topshiriq ochiladi. Agar buyurtma
   * yo'lga chiqib topshiriq yaratilmasa, uni hech bir kuryer
   * ko'rmasdi va buyurtma jimgina osilib qolardi.
   */
  await prisma.$transaction(async (tx) => {
    if (to === 'DELIVERED') {
      // Yetkazilganini KURYER tasdiqlaydi — 17-bosqichdan beri.
      await assertDeliveryNotPending(tx, { marketOrderId: order.id });
    }

    const updated = await tx.marketOrder.updateMany({
      // Eski holat sharti — raqobatdan himoya.
      where: { id: order.id, status: order.status },
      data: {
        status: to as MarketOrderStatus,
        ...(to === 'CONFIRMED' ? { confirmedAt: now } : {}),
        ...(to === 'SHIPPED' ? { shippedAt: now } : {}),
        ...(to === 'DELIVERED' ? { deliveredAt: now } : {}),
      },
    });

    if (updated.count === 0) {
      throw new ConflictError("Buyurtma holati o'zgardi. Sahifani yangilang.");
    }

    if (to === 'SHIPPED') {
      await createMarketDelivery(tx, { id: order.id, deliveryFee: order.deliveryFee });
    }
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.SELLER_ORDER_STATUS_CHANGED,
    resourceType: 'MarketOrder',
    resourceId: order.id,
    module: MODULE,
    metadata: { from, to, orderNumber: order.orderNumber },
    ...meta,
  });

  // Mahsulot kunlab yo'lda bo'ladi — xaridor har bosqichni bilishi kerak.
  await notifyUser(order.userId, 'market.order_status_changed', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    shopName: order.shop.name,
    status: input.status,
  });

  logger.info({ userId, orderId: order.id, from, to }, "Buyurtma holati o'zgartirildi");

  return getSellerOrder(userId, orderId);
}

/** Ruxsat etilmagan o'tish uchun tushunarli xabar. */
function buildTransitionMessage(from: MarketOrderStatusName, to: MarketOrderStatusName): string {
  if (from === 'DELIVERED' || from === 'CANCELLED') {
    return "Buyurtma yakunlangan — uni o'zgartirib bo'lmaydi.";
  }

  if (to === 'CANCELLED') {
    return "Yo'lga chiqarilgan buyurtmani rad etib bo'lmaydi. Qo'llab-quvvatlashga murojaat qiling.";
  }

  return "Bosqichni sakrab o'tib bo'lmaydi. Buyurtmani navbati bilan o'tkazing.";
}

/**
 * Do'kon buyurtmani rad etadi — pul TO'LIQ qaytadi, zaxira tiklanadi.
 *
 * ── Nima uchun ikkalasi bitta tranzaksiyada ───────────────────────────
 * Pul qaytib, zaxira tiklanmasa: tovar javonda turadi, lekin bazada
 * "sotilgan" — hech kim sotib ololmaydi.
 * Zaxira tiklanib, pul qaytmasa: xaridor tovarsiz ham, pulsiz ham
 * qoladi.
 *
 * Ikkalasi ham bitta tranzaksiyada bajariladi: yo hammasi, yo hech
 * narsa. Idempotentlik kaliti buyurtma ID'sidan hisoblanadi va ustun
 * bazada UNIQUE — takroriy bosish ikkinchi marta pul qaytarmaydi.
 */
async function rejectOrder(
  userId: string,
  order: {
    id: string;
    orderNumber: string;
    status: MarketOrderStatus;
    total: bigint;
    userId: string;
    shop: { name: string };
    items: { productId: string | null; quantity: number }[];
  },
  reason: string,
  meta: OperationMeta,
): Promise<SellerOrder> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId: order.userId },
    select: { id: true },
  });

  if (!wallet) {
    // To'lov bo'lgan bo'lsa hamyon albatta bor. Bu holat faqat
    // ma'lumot buzilganda yuz beradi — jimgina davom etib bo'lmaydi.
    throw new ConflictError("Xaridor hamyoni topilmadi. Qo'llab-quvvatlashga murojaat qiling.");
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.marketOrder.updateMany({
      where: { id: order.id, status: order.status },
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
      description: `${order.shop.name} — do'kon buyurtmani rad etdi`,
      sourceModule: MODULE,
      sourceId: order.id,
      idempotencyKey: `market-refund-${order.id}`,
    });

    await tx.marketOrder.update({
      where: { id: order.id },
      data: { refundTransactionId: credit.id },
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.SELLER_ORDER_REJECTED,
    resourceType: 'MarketOrder',
    resourceId: order.id,
    module: MODULE,
    metadata: {
      amountTiyin: order.total.toString(),
      orderNumber: order.orderNumber,
      customerId: order.userId,
      restoredLines: order.items.filter((item) => item.productId).length,
      reason,
    },
    ...meta,
  });

  await notifyUser(order.userId, 'market.order_rejected', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    shopName: order.shop.name,
    amountTiyin: tiyinToNumber(order.total),
    reason,
  });

  logger.warn({ userId, orderId: order.id, customerId: order.userId, reason }, "Do'kon buyurtmani rad etdi");

  return getSellerOrder(userId, order.id);
}
