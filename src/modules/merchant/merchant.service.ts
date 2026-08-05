import { FoodOrderStatus, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { startOfTashkentDay, startOfTashkentDaysAgo } from '@/lib/date';
import { logger } from '@/lib/logger';
import { somToTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import type { ServiceColor } from '@/config/modules';
import { notifyUser } from '@/modules/notification/notification.service';
import { refundWallet } from '@/modules/wallet/wallet.service';
import { canTransition, type FoodOrderStatusName } from '@/modules/food/food.types';
import { assertDeliveryNotPending, createFoodDelivery } from '@/modules/courier/courier.service';
import type {
  MerchantOrderQuery,
  UpdateMenuItemInput,
  UpdateOrderStatusInput,
  UpdateRestaurantInput,
} from '@/modules/merchant/merchant.schemas';
import type {
  MerchantMenuItem,
  MerchantOrder,
  MerchantRestaurant,
  MerchantStats,
} from '@/modules/merchant/merchant.types';

/**
 * Restoran kabineti.
 *
 * ── Asosiy qoida: EGALIK har bir amalda tekshiriladi ──────────────────
 * Restoran egasi faqat O'Z restoranlarining buyurtmalarini ko'radi va
 * o'zgartiradi. Tekshiruv mijoz yuborgan `restaurantId` ga emas,
 * tokendagi foydalanuvchiga tayanadi: har bir so'rovda
 * `restaurant.ownerId = userId` sharti qo'yiladi.
 *
 * Shu sababli "boshqa restoran buyurtmasini ko'rdim" degan holat
 * bo'lishi mumkin emas — noto'g'ri ID yuborilsa "topilmadi" qaytadi.
 *
 * ── Holatlar avtomati ─────────────────────────────────────────────────
 * Buyurtma holati faqat `FOOD_ORDER_TRANSITIONS` jadvali ruxsat bergan
 * yo'nalishda o'zgaradi. Jadval `food.types.ts` da — server, interfeys
 * va testlar bitta manbadan oziqlanadi.
 */

const MODULE = 'merchant';

// ── Restoranlar ───────────────────────────────────────────────────────

/** Hozir e'tibor talab qiladigan holatlar. */
const ACTIVE_STATUSES: FoodOrderStatus[] = [
  FoodOrderStatus.PENDING,
  FoodOrderStatus.CONFIRMED,
  FoodOrderStatus.PREPARING,
  FoodOrderStatus.DELIVERING,
];

/**
 * Foydalanuvchiga tegishli restoranlar va umumiy ko'rsatkichlar.
 *
 * Bitta odam bir nechta restoranga ega bo'lishi mumkin, shuning uchun
 * ro'yxat qaytariladi.
 */
export async function getMerchantOverview(
  userId: string,
): Promise<{ restaurants: MerchantRestaurant[]; stats: MerchantStats }> {
  const rows = await prisma.restaurant.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      slug: true,
      name: true,
      cuisine: true,
      color: true,
      isOpen: true,
      isActive: true,
      deliveryMinutes: true,
      deliveryFee: true,
      minOrder: true,
      rating: true,
      ratingCount: true,
      _count: { select: { items: true } },
    },
    orderBy: { name: 'asc' },
  });

  if (rows.length === 0) {
    return { restaurants: [], stats: emptyStats() };
  }

  const restaurantIds = rows.map((row) => row.id);

  // Har bir restoran uchun faol buyurtmalar sonini BITTA so'rovda olamiz.
  const activeCounts = await prisma.foodOrder.groupBy({
    by: ['restaurantId'],
    where: { restaurantId: { in: restaurantIds }, status: { in: ACTIVE_STATUSES } },
    _count: { _all: true },
  });

  const activeByRestaurant = new Map(activeCounts.map((row) => [row.restaurantId, row._count._all]));

  return {
    restaurants: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      cuisine: row.cuisine,
      color: row.color as ServiceColor,
      isOpen: row.isOpen,
      isActive: row.isActive,
      deliveryMinutes: row.deliveryMinutes,
      deliveryFee: tiyinToNumber(row.deliveryFee),
      minOrder: tiyinToNumber(row.minOrder),
      rating: Number(row.rating),
      ratingCount: row.ratingCount,
      menuItemCount: row._count.items,
      activeOrderCount: activeByRestaurant.get(row.id) ?? 0,
    })),
    stats: await getMerchantStats(restaurantIds),
  };
}

function emptyStats(): MerchantStats {
  return {
    todayOrders: 0,
    todayRevenue: 0,
    weekOrders: 0,
    weekRevenue: 0,
    activeOrders: 0,
    cancelledToday: 0,
  };
}

/**
 * Kabinetdagi raqamlar.
 *
 * Daromadga faqat BEKOR QILINMAGAN buyurtmalar kiradi: bekor qilingan
 * buyurtmada pul mijozga qaytgan, uni daromad deb ko'rsatish restoran
 * egasini chalg'itardi.
 */
async function getMerchantStats(restaurantIds: string[]): Promise<MerchantStats> {
  const todayStart = startOfTashkentDay();
  const weekStart = startOfTashkentDaysAgo(7);

  const earning = { not: FoodOrderStatus.CANCELLED };

  const [today, week, active, cancelledToday] = await Promise.all([
    prisma.foodOrder.aggregate({
      _count: true,
      _sum: { total: true },
      where: { restaurantId: { in: restaurantIds }, status: earning, createdAt: { gte: todayStart } },
    }),
    prisma.foodOrder.aggregate({
      _count: true,
      _sum: { total: true },
      where: { restaurantId: { in: restaurantIds }, status: earning, createdAt: { gte: weekStart } },
    }),
    prisma.foodOrder.count({
      where: { restaurantId: { in: restaurantIds }, status: { in: ACTIVE_STATUSES } },
    }),
    prisma.foodOrder.count({
      where: {
        restaurantId: { in: restaurantIds },
        status: FoodOrderStatus.CANCELLED,
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
  };
}

/**
 * Restoran sozlamalarini o'zgartiradi (ochiq/yopiq, yetkazish vaqti).
 *
 * "Yopish" — eng ko'p ishlatiladigan tugma: oshxona band bo'lganda yoki
 * ish vaqti tugaganda restoran o'zini ro'yxatdan olib qo'yadi.
 */
export async function updateMerchantRestaurant(
  userId: string,
  restaurantId: string,
  input: UpdateRestaurantInput,
): Promise<MerchantRestaurant> {
  await assertOwnsRestaurant(userId, restaurantId);

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      ...(input.isOpen === undefined ? {} : { isOpen: input.isOpen }),
      ...(input.deliveryMinutes === undefined ? {} : { deliveryMinutes: input.deliveryMinutes }),
    },
  });

  logger.info({ userId, restaurantId, changed: Object.keys(input) }, "Restoran sozlamasi o'zgartirildi");

  const overview = await getMerchantOverview(userId);
  const updated = overview.restaurants.find((restaurant) => restaurant.id === restaurantId);

  if (!updated) {
    throw new NotFoundError('Restoran');
  }

  return updated;
}

/** Restoran shu foydalanuvchiga tegishlimi. */
async function assertOwnsRestaurant(userId: string, restaurantId: string): Promise<void> {
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: userId },
    select: { id: true },
  });

  if (!restaurant) {
    // "Sizniki emas" emas, "topilmadi": begona restoran mavjudligini ham
    // oshkor qilmaymiz.
    throw new NotFoundError('Restoran');
  }
}

// ── Menyu ─────────────────────────────────────────────────────────────

/** Restoran menyusi — mavjud bo'lmaganlari bilan birga. */
export async function listMerchantMenu(userId: string, restaurantId: string): Promise<MerchantMenuItem[]> {
  await assertOwnsRestaurant(userId, restaurantId);

  const items = await prisma.menuItem.findMany({
    where: { restaurantId },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      isAvailable: true,
      category: { select: { name: true, sortOrder: true } },
    },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: tiyinToNumber(item.price),
    isAvailable: item.isAvailable,
    categoryName: item.category.name,
  }));
}

/**
 * Taomni yangilaydi: mavjudligi yoki narxi.
 *
 * Narx o'zgarishi ESKI buyurtmalarga ta'sir qilmaydi — ular nomi va
 * narxining nusxasini saqlaydi (`food_order_items`).
 */
export async function updateMerchantMenuItem(
  userId: string,
  menuItemId: string,
  input: UpdateMenuItemInput,
): Promise<MerchantMenuItem> {
  const item = await prisma.menuItem.findFirst({
    where: { id: menuItemId, restaurant: { ownerId: userId } },
    select: { id: true, restaurantId: true, name: true },
  });

  if (!item) {
    throw new NotFoundError('Taom');
  }

  const updated = await prisma.menuItem.update({
    where: { id: item.id },
    data: {
      ...(input.isAvailable === undefined ? {} : { isAvailable: input.isAvailable }),
      ...(input.priceSom === undefined ? {} : { price: somToTiyin(input.priceSom) }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      isAvailable: true,
      category: { select: { name: true } },
    },
  });

  logger.info({ userId, menuItemId, changed: Object.keys(input) }, "Menyu elementi o'zgartirildi");

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    price: tiyinToNumber(updated.price),
    isAvailable: updated.isAvailable,
    categoryName: updated.category.name,
  };
}

// ── Buyurtmalar ───────────────────────────────────────────────────────

const MERCHANT_ORDER_SELECT = {
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
  deliveredAt: true,
  restaurant: { select: { id: true, name: true, color: true } },
  user: { select: { firstName: true, lastName: true, phone: true } },
  items: {
    select: { id: true, name: true, quantity: true, unitPrice: true, lineTotal: true },
    orderBy: { name: 'asc' as const },
  },
} as const;

type MerchantOrderRow = Prisma.FoodOrderGetPayload<{ select: typeof MERCHANT_ORDER_SELECT }>;

function toMerchantOrder(row: MerchantOrderRow): MerchantOrder {
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
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    restaurant: {
      id: row.restaurant.id,
      name: row.restaurant.name,
      color: row.restaurant.color as ServiceColor,
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
 * Restoran buyurtmalari.
 *
 * Standart filtr — FAOL buyurtmalar va ular ESKISIDAN boshlab
 * ko'rsatiladi: oshxonada birinchi kelgan birinchi tayyorlanadi.
 */
export async function listMerchantOrders(
  userId: string,
  query: MerchantOrderQuery,
): Promise<{ orders: MerchantOrder[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  if (query.restaurantId) {
    await assertOwnsRestaurant(userId, query.restaurantId);
  }

  const where: Prisma.FoodOrderWhereInput = {
    restaurant: { ownerId: userId },
    ...(query.restaurantId ? { restaurantId: query.restaurantId } : {}),
    ...buildStatusFilter(query.status),
  };

  // Faol ro'yxatda eng eskisi tepada: navbat tartibi buzilmasligi kerak.
  const isQueue = query.status === 'ACTIVE';

  const [rows, total] = await Promise.all([
    prisma.foodOrder.findMany({
      where,
      select: MERCHANT_ORDER_SELECT,
      orderBy: { createdAt: isQueue ? 'asc' : query.order },
      skip,
      take,
    }),
    prisma.foodOrder.count({ where }),
  ]);

  return { orders: rows.map(toMerchantOrder), total };
}

function buildStatusFilter(status: MerchantOrderQuery['status']): Prisma.FoodOrderWhereInput {
  if (status === 'ALL') return {};
  if (status === 'ACTIVE') return { status: { in: ACTIVE_STATUSES } };

  return { status: status as FoodOrderStatus };
}

/** Bitta buyurtma. Begona restoran buyurtmasi "topilmadi" qaytaradi. */
export async function getMerchantOrder(userId: string, orderId: string): Promise<MerchantOrder> {
  const order = await prisma.foodOrder.findFirst({
    where: { id: orderId, restaurant: { ownerId: userId } },
    select: MERCHANT_ORDER_SELECT,
  });

  if (!order) {
    throw new NotFoundError('Buyurtma');
  }

  return toMerchantOrder(order);
}

interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Buyurtma holatini o'zgartiradi.
 *
 * ── Uchta himoya ──────────────────────────────────────────────────────
 *
 * 1. EGALIK: so'rov shartida `restaurant.ownerId = userId`.
 *
 * 2. HOLATLAR AVTOMATI: `canTransition()` ruxsat bermasa xatolik.
 *    Ya'ni "Qabul qilindi" dan to'g'ridan-to'g'ri "Yetkazildi" ga
 *    sakrab bo'lmaydi va orqaga qaytib ham bo'lmaydi.
 *
 * 3. RAQOBAT: yozish `updateMany` orqali, ESKI holat sharti bilan
 *    bajariladi. Ikki xodim bir vaqtda bossa, ikkinchisi "holat
 *    o'zgardi" xabarini oladi va ekranini yangilaydi.
 *
 * Rad etish (`CANCELLED`) alohida yo'l: u pulni ham qaytaradi.
 */
export async function updateMerchantOrderStatus(
  userId: string,
  orderId: string,
  input: UpdateOrderStatusInput,
  meta: OperationMeta = {},
): Promise<MerchantOrder> {
  const order = await prisma.foodOrder.findFirst({
    where: { id: orderId, restaurant: { ownerId: userId } },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      deliveryFee: true,
      userId: true,
      restaurant: { select: { name: true } },
    },
  });

  if (!order) {
    throw new NotFoundError('Buyurtma');
  }

  const from = order.status as FoodOrderStatusName;
  const to = input.status as FoodOrderStatusName;

  if (!canTransition(from, to)) {
    throw new ConflictError(buildTransitionMessage(from, to));
  }

  // Tekshiruv `input.status` bo'yicha: shunda TypeScript quyida
  // `CANCELLED` chiqib ketganini o'zi biladi va bildirishnoma turi
  // aniq bo'ladi (cast kerak emas).
  if (input.status === 'CANCELLED') {
    return rejectOrder(userId, order, input.reason ?? 'Restoran buyurtmani qabul qila olmadi', meta);
  }

  const now = new Date();

  /**
   * Holat o'zgarishi va kuryer topshirig'i BITTA tranzaksiyada.
   *
   * "Yo'lga chiqarish" bosilganda topshiriq ochiladi. Agar buyurtma
   * "yo'lda" bo'lib topshiriq yaratilmasa, uni hech bir kuryer
   * ko'rmasdi va buyurtma jimgina osilib qolardi.
   */
  await prisma.$transaction(async (tx) => {
    if (to === 'DELIVERED') {
      // Yetkazilganini KURYER tasdiqlaydi — 17-bosqichdan beri.
      await assertDeliveryNotPending(tx, { foodOrderId: order.id });
    }

    const updated = await tx.foodOrder.updateMany({
      // Eski holat sharti — raqobatdan himoya.
      where: { id: order.id, status: order.status },
      data: {
        status: to as FoodOrderStatus,
        ...(to === 'CONFIRMED' ? { confirmedAt: now } : {}),
        ...(to === 'DELIVERED' ? { deliveredAt: now } : {}),
      },
    });

    if (updated.count === 0) {
      throw new ConflictError("Buyurtma holati o'zgardi. Sahifani yangilang.");
    }

    if (to === 'DELIVERING') {
      await createFoodDelivery(tx, { id: order.id, deliveryFee: order.deliveryFee });
    }
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.MERCHANT_ORDER_STATUS_CHANGED,
    resourceType: 'FoodOrder',
    resourceId: order.id,
    module: MODULE,
    metadata: { from, to, orderNumber: order.orderNumber },
    ...meta,
  });

  // Mijoz har bosqichni bilishi kerak — aks holda u qo'ng'iroq qiladi.
  await notifyUser(order.userId, 'food.order_status_changed', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    restaurantName: order.restaurant.name,
    status: input.status,
  });

  logger.info({ userId, orderId: order.id, from, to }, "Buyurtma holati o'zgartirildi");

  return getMerchantOrder(userId, orderId);
}

/** Ruxsat etilmagan o'tish uchun tushunarli xabar. */
function buildTransitionMessage(from: FoodOrderStatusName, to: FoodOrderStatusName): string {
  if (from === 'DELIVERED' || from === 'CANCELLED') {
    return "Buyurtma yakunlangan — uni o'zgartirib bo'lmaydi.";
  }

  if (to === 'CANCELLED') {
    return "Tayyorlash boshlangan buyurtmani rad etib bo'lmaydi. Qo'llab-quvvatlashga murojaat qiling.";
  }

  return "Bosqichni sakrab o'tib bo'lmaydi. Buyurtmani navbati bilan o'tkazing.";
}

/**
 * Restoran buyurtmani rad etadi — pul mijozga TO'LIQ qaytadi.
 *
 * `cancelFoodOrder` (mijoz uchun) bilan bir xil himoya: idempotentlik
 * kaliti buyurtma ID'sidan hisoblanadi va ustun bazada UNIQUE, holat
 * esa tranzaksiya ichida qayta tekshiriladi.
 */
async function rejectOrder(
  userId: string,
  order: {
    id: string;
    orderNumber: string;
    status: FoodOrderStatus;
    total: bigint;
    userId: string;
    restaurant: { name: string };
  },
  reason: string,
  meta: OperationMeta,
): Promise<MerchantOrder> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId: order.userId },
    select: { id: true },
  });

  if (!wallet) {
    // To'lov bo'lgan bo'lsa hamyon albatta bor. Bu holat faqat
    // ma'lumot buzilganda yuz beradi — jimgina davom etib bo'lmaydi.
    throw new ConflictError("Mijoz hamyoni topilmadi. Qo'llab-quvvatlashga murojaat qiling.");
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.foodOrder.updateMany({
      where: { id: order.id, status: order.status },
      data: {
        status: FoodOrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    if (claimed.count === 0) {
      throw new ConflictError("Buyurtma holati o'zgardi. Sahifani yangilang.");
    }

    const credit = await refundWallet(tx, {
      walletId: wallet.id,
      amountTiyin: order.total,
      description: `${order.restaurant.name} — restoran buyurtmani rad etdi`,
      sourceModule: MODULE,
      sourceId: order.id,
      idempotencyKey: `food-refund-${order.id}`,
    });

    await tx.foodOrder.update({
      where: { id: order.id },
      data: { refundTransactionId: credit.id },
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.MERCHANT_ORDER_REJECTED,
    resourceType: 'FoodOrder',
    resourceId: order.id,
    module: MODULE,
    metadata: {
      amountTiyin: order.total.toString(),
      orderNumber: order.orderNumber,
      customerId: order.userId,
      reason,
    },
    ...meta,
  });

  await notifyUser(order.userId, 'food.order_rejected', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    restaurantName: order.restaurant.name,
    amountTiyin: tiyinToNumber(order.total),
    reason,
  });

  logger.warn({ userId, orderId: order.id, customerId: order.userId, reason }, 'Restoran buyurtmani rad etdi');

  return getMerchantOrder(userId, order.id);
}
