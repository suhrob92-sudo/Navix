import { FoodOrderStatus, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { formatTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { toSearchText } from '@/lib/search';
import type { ServiceColor } from '@/config/modules';
import { notifyUser } from '@/modules/notification/notification.service';
import { chargeWallet, getOrCreateWallet, refundWallet } from '@/modules/wallet/wallet.service';
import type {
  CancelFoodOrderInput,
  CreateFoodOrderInput,
  FoodOrderQuery,
  RestaurantQuery,
} from '@/modules/food/food.schemas';
import type {
  FoodOrderView,
  MenuCategoryView,
  OrderCourierView,
  RestaurantDetail,
  RestaurantListItem,
} from '@/modules/food/food.types';

/**
 * Ovqat yetkazish moduli.
 *
 * ── Ikkita asosiy qoida ───────────────────────────────────────────────
 *
 * 1. NARX HAR DOIM BAZADAN. Mijoz savatdan faqat "qaysi taom, nechta"
 *    yuboradi. Narx, yetkazish haqi va umumiy summa serverda qayta
 *    hisoblanadi — aks holda so'rovni tahrirlab tekinga ovqat olish
 *    mumkin bo'lardi.
 *
 * 2. BUYURTMA — O'ZGARMAS NUSXA. Taom nomi va narxi buyurtma qatoriga
 *    ko'chiriladi. Restoran ertaga narxni oshirsa yoki taomni o'chirsa,
 *    eski chek o'zgarmasligi kerak.
 *
 * Pul yechish `chargeWallet()`, qaytarish `refundWallet()` orqali —
 * ikkalasi ham hamyon modulida, bir joyda.
 */

const SOURCE_MODULE = 'food';

// ── Restoranlar ───────────────────────────────────────────────────────

const RESTAURANT_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  cuisine: true,
  deliveryFee: true,
  minOrder: true,
  deliveryMinutes: true,
  rating: true,
  ratingCount: true,
  color: true,
  isOpen: true,
} as const;

type RestaurantRow = Prisma.RestaurantGetPayload<{ select: typeof RESTAURANT_SELECT }>;

function toRestaurantItem(row: RestaurantRow): RestaurantListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    cuisine: row.cuisine,
    deliveryFee: tiyinToNumber(row.deliveryFee),
    minOrder: tiyinToNumber(row.minOrder),
    deliveryMinutes: row.deliveryMinutes,
    // `Decimal` JSON'ga tushmaydi, shuning uchun songa o'giramiz.
    rating: Number(row.rating),
    ratingCount: row.ratingCount,
    color: row.color as ServiceColor,
    isOpen: row.isOpen,
  };
}

/**
 * Qidiruv shartini yig'adi.
 *
 * ── Nima uchun `searchName` ustuni ────────────────────────────────────
 * Odam "lagmon" deb yozadi, bazada esa "Lag'mon" turadi. To'g'ridan-
 * to'g'ri solishtirsak — hech qachon topilmaydi. Shuning uchun ikkala
 * tomon ham `toSearchText()` dan o'tkaziladi (baza tomonida bu natija
 * yozishda `searchName` ga saqlanadi).
 *
 * `cuisine` — qisqa ro'yxatdan tanlangan qiymat ("Milliy", "Yapon"),
 * apostrof bo'lmaydi, shuning uchun u odatdagidek solishtiriladi.
 */
function buildSearchFilter(search: string): Prisma.RestaurantWhereInput {
  const needle = toSearchText(search);

  // Faqat tinish belgisi kiritilgan bo'lsa hech narsa qidirmaymiz.
  if (needle.length === 0) return {};

  return {
    OR: [
      { searchName: { contains: needle } },
      { cuisine: { contains: search, mode: 'insensitive' } },
      // Taom nomi bo'yicha ham topilsin: "lag'mon" deb qidirgan
      // odam uni sotadigan restoranni ko'rishi kerak.
      { items: { some: { searchName: { contains: needle } } } },
    ],
  };
}

/** Faol restoranlar. Yopiqlari ham ko'rinadi, lekin oxirida turadi. */
export async function listRestaurants(query: RestaurantQuery): Promise<RestaurantListItem[]> {
  const restaurants = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      ...(query.cuisine ? { cuisine: query.cuisine } : {}),
      ...(query.search ? buildSearchFilter(query.search) : {}),
    },
    select: RESTAURANT_SELECT,
    // Ochiqlar birinchi: yopiq restorandan buyurtma berib bo'lmaydi.
    orderBy: [{ isOpen: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  });

  return restaurants.map(toRestaurantItem);
}

/** Bitta restoran — menyusi bilan. */
export async function getRestaurant(slug: string): Promise<RestaurantDetail> {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug, isActive: true },
    select: {
      ...RESTAURANT_SELECT,
      categories: {
        select: {
          id: true,
          name: true,
          items: {
            select: { id: true, name: true, description: true, price: true, isAvailable: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      },
    },
  });

  if (!restaurant) {
    throw new NotFoundError('Restoran');
  }

  const categories: MenuCategoryView[] = restaurant.categories
    // Bo'sh bo'lim ko'rsatilmaydi — foydalanuvchini chalkashtiradi.
    .filter((category) => category.items.length > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      items: category.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: tiyinToNumber(item.price),
        isAvailable: item.isAvailable,
      })),
    }));

  return { ...toRestaurantItem(restaurant), categories };
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
  deliveredAt: true,
  cancelledAt: true,
  restaurant: { select: { id: true, slug: true, name: true, color: true, deliveryMinutes: true } },
  items: {
    select: { id: true, name: true, unitPrice: true, quantity: true, lineTotal: true },
    orderBy: { name: 'asc' as const },
  },
  delivery: {
    select: {
      status: true,
      courier: { select: { firstName: true, lastName: true, phone: true } },
    },
  },
} as const;

/**
 * Buyurtma sahifasida ko'rinadigan kuryer.
 *
 * Topshiriq ochilgan, lekin hali hech kim olmagan bo'lsa `null`
 * qaytadi: "kuryer kutilmoqda" degan holatni ko'rsatish uchun
 * bosqichlar chizig'ining o'zi yetarli, bo'sh ism esa chalg'itardi.
 */
function toCourierView(
  delivery: {
    status: string;
    courier: { firstName: string | null; lastName: string | null; phone: string } | null;
  } | null,
): OrderCourierView | null {
  if (!delivery?.courier) return null;

  return {
    name: [delivery.courier.firstName, delivery.courier.lastName].filter(Boolean).join(' ') || null,
    phone: delivery.courier.phone,
    status: delivery.status as OrderCourierView['status'],
  };
}

type OrderRow = Prisma.FoodOrderGetPayload<{ select: typeof ORDER_SELECT }>;

function toOrderView(row: OrderRow): FoodOrderView {
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
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    restaurant: {
      id: row.restaurant.id,
      slug: row.restaurant.slug,
      name: row.restaurant.name,
      color: row.restaurant.color as ServiceColor,
      deliveryMinutes: row.restaurant.deliveryMinutes,
    },
    items: row.items.map((item) => ({
      id: item.id,
      name: item.name,
      unitPrice: tiyinToNumber(item.unitPrice),
      quantity: item.quantity,
      lineTotal: tiyinToNumber(item.lineTotal),
    })),
    courier: toCourierView(row.delivery),
  };
}

/** Buyurtma raqamini yaratadi: NVX-F-20260803-A1B2C3 */
function generateOrderNumber(): string {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('');

  return `NVX-F-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** Manzilni bitta qatorga yig'adi — buyurtmaga nusxa qilish uchun. */
function formatAddressLine(address: {
  city: string;
  district: string | null;
  street: string;
  building: string | null;
  apartment: string | null;
}): string {
  const parts = [
    address.city,
    address.district,
    address.street,
    address.building ? `${address.building}-uy` : null,
    address.apartment ? `${address.apartment}-xonadon` : null,
  ].filter(Boolean);

  return parts.join(', ').slice(0, 400);
}

interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Buyurtma yaratadi va hamyondan pul yechadi.
 *
 * Ketma-ketlik:
 *  1. Takroriy so'rov emasligini tekshiramiz;
 *  2. Restoran faol va OCHIQ ekanini tekshiramiz;
 *  3. Taomlarni bazadan olamiz — hammasi shu restoranniki va mavjud;
 *  4. Summani BAZADAGI narxlardan hisoblaymiz;
 *  5. Eng kam buyurtma shartini tekshiramiz;
 *  6. Manzilni tekshiramiz va matn nusxasini olamiz;
 *  7. BITTA tranzaksiyada: buyurtma + qatorlar + pul yechish.
 */
export async function createFoodOrder(
  userId: string,
  input: CreateFoodOrderInput,
  meta: OperationMeta = {},
): Promise<FoodOrderView> {
  // 1. Takror bo'lsa — eski buyurtmani qaytaramiz, pul ikkinchi marta ketmaydi.
  const duplicate = await prisma.walletTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { sourceId: true },
  });

  if (duplicate?.sourceId) {
    const existing = await prisma.foodOrder.findUnique({
      where: { id: duplicate.sourceId },
      select: ORDER_SELECT,
    });

    if (existing) return toOrderView(existing);
  }

  // 2. Restoran.
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: input.restaurantId, isActive: true },
    select: { id: true, name: true, isOpen: true, deliveryFee: true, minOrder: true },
  });

  if (!restaurant) {
    throw new NotFoundError('Restoran');
  }

  if (!restaurant.isOpen) {
    throw new ConflictError(`${restaurant.name} hozir yopiq. Keyinroq urinib ko'ring.`);
  }

  // 3. Taomlar — faqat shu restoranniki va mavjudlari.
  const requestedIds = input.items.map((line) => line.menuItemId);

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: requestedIds }, restaurantId: restaurant.id },
    select: { id: true, name: true, price: true, isAvailable: true },
  });

  const itemById = new Map(menuItems.map((item) => [item.id, item]));

  const missing = requestedIds.filter((id) => !itemById.has(id));
  if (missing.length > 0) {
    throw new ValidationError("Savatdagi ba'zi taomlar topilmadi", {
      items: ["Menyu o'zgargan. Savatni yangilab, qaytadan urinib ko'ring."],
    });
  }

  const unavailable = menuItems.filter((item) => !item.isAvailable);
  if (unavailable.length > 0) {
    throw new ConflictError(`"${unavailable[0].name}" hozir mavjud emas. Savatdan olib tashlang.`);
  }

  // 4. Summa — BAZADAGI narxlardan.
  const lines = input.items.map((line) => {
    const item = itemById.get(line.menuItemId)!;
    const lineTotal = item.price * BigInt(line.quantity);

    return {
      menuItemId: item.id,
      name: item.name,
      unitPrice: item.price,
      quantity: line.quantity,
      lineTotal,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0n);

  // 5. Eng kam buyurtma.
  if (subtotal < restaurant.minOrder) {
    throw new ValidationError('Buyurtma summasi yetarli emas', {
      items: [`${restaurant.name} uchun eng kam buyurtma — ${formatTiyin(restaurant.minOrder)}`],
    });
  }

  const total = subtotal + restaurant.deliveryFee;

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

  // 7. Buyurtma va pul — ajralmas juftlik.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.foodOrder.create({
      data: {
        userId,
        restaurantId: restaurant.id,
        addressId: address.id,
        orderNumber,
        /**
         * Buyurtma RESTORAN TASDIG'INI kutadi.
         *
         * Bu qator uzoq vaqt `CONFIRMED` bo'lib turdi — o'shanda
         * to'lov o'tgani qabul qilingan deb hisoblanardi. Natijada
         * restoran kabinetidagi "Buyurtmani qabul qilish" tugmasi
         * hech qachon ko'rinmasdi va oshxona yangi buyurtmani
         * "kutilmoqda" ro'yxatida ko'ra olmasdi.
         *
         * Marketplace 16-bosqichda shu tartibga o'tdi; endi ovqat ham
         * xuddi shunday ishlaydi — ikkala modulda bitta qoida.
         */
        status: FoodOrderStatus.PENDING,
        subtotal,
        deliveryFee: restaurant.deliveryFee,
        total,
        deliveryAddress: formatAddressLine(address),
        deliveryNote: input.deliveryNote ?? null,
        items: { create: lines },
      },
      select: { id: true },
    });

    const charge = await chargeWallet(tx, {
      userId,
      walletId: wallet.id,
      amountTiyin: total,
      description: `${restaurant.name} — ovqat buyurtmasi`,
      sourceModule: SOURCE_MODULE,
      sourceId: created.id,
      idempotencyKey: input.idempotencyKey,
    });

    return tx.foodOrder.update({
      where: { id: created.id },
      data: { walletTransactionId: charge.id },
      select: ORDER_SELECT,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.FOOD_ORDER_CREATED,
    resourceType: 'FoodOrder',
    resourceId: order.id,
    module: SOURCE_MODULE,
    metadata: { amountTiyin: total.toString(), restaurant: restaurant.name, orderNumber },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  await notifyUser(userId, 'food.order_created', {
    orderId: order.id,
    orderNumber,
    restaurantName: restaurant.name,
    amountTiyin: tiyinToNumber(total),
    deliveryMinutes: order.restaurant.deliveryMinutes,
  });

  logger.info(
    { userId, orderId: order.id, restaurant: restaurant.name, total: total.toString() },
    'Ovqat buyurtmasi yaratildi',
  );

  return toOrderView(order);
}

/**
 * Buyurtmani bekor qiladi va pulni to'liq qaytaradi.
 *
 * ── Nima uchun faqat PENDING va CONFIRMED holatida ────────────────────
 * Oshxona ovqatni tayyorlashni boshlaganidan keyin mahsulot sarflangan
 * bo'ladi — bekor qilish restoranga zarar keltiradi. Chegara aynan
 * shu yerda.
 *
 * ── Ikki marta qaytarishning oldini olish ─────────────────────────────
 * `refundPayment` dagi kabi: idempotentlik kaliti buyurtma ID'sidan
 * hisoblanadi (`food-refund-{orderId}`) va ustun bazada UNIQUE.
 * Holat tekshiruvi ham tranzaksiya ichida `updateMany` sharti orqali
 * takrorlanadi.
 */
export async function cancelFoodOrder(
  userId: string,
  orderId: string,
  input: CancelFoodOrderInput,
  meta: OperationMeta = {},
): Promise<FoodOrderView> {
  const order = await prisma.foodOrder.findFirst({
    where: { id: orderId, userId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      restaurant: { select: { name: true } },
    },
  });

  if (!order) {
    throw new NotFoundError('Buyurtma');
  }

  if (order.status === FoodOrderStatus.CANCELLED) {
    throw new ConflictError('Buyurtma allaqachon bekor qilingan');
  }

  const cancellable: FoodOrderStatus[] = [FoodOrderStatus.PENDING, FoodOrderStatus.CONFIRMED];

  if (!cancellable.includes(order.status)) {
    throw new ConflictError(
      "Buyurtma allaqachon tayyorlanmoqda — uni bekor qilib bo'lmaydi. Qo'llab-quvvatlashga murojaat qiling.",
    );
  }

  const wallet = await getOrCreateWallet(userId);
  const reason = input.reason ?? 'Foydalanuvchi bekor qildi';

  const cancelled = await prisma.$transaction(async (tx) => {
    // Holatni QULF ostida yana tekshiramiz: shu oraliqda restoran
    // buyurtmani tayyorlashga o'tkazgan bo'lishi mumkin.
    const claimed = await tx.foodOrder.updateMany({
      where: { id: order.id, status: { in: cancellable } },
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
      description: `${order.restaurant.name} — buyurtma bekor qilindi`,
      sourceModule: SOURCE_MODULE,
      sourceId: order.id,
      idempotencyKey: `food-refund-${order.id}`,
    });

    return tx.foodOrder.update({
      where: { id: order.id },
      data: { refundTransactionId: credit.id },
      select: ORDER_SELECT,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.FOOD_ORDER_CANCELLED,
    resourceType: 'FoodOrder',
    resourceId: order.id,
    module: SOURCE_MODULE,
    metadata: { amountTiyin: order.total.toString(), orderNumber: order.orderNumber, reason },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  await notifyUser(userId, 'food.order_cancelled', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    restaurantName: order.restaurant.name,
    amountTiyin: tiyinToNumber(order.total),
  });

  logger.info({ userId, orderId: order.id, reason }, 'Ovqat buyurtmasi bekor qilindi');

  return toOrderView(cancelled);
}

/** Foydalanuvchining buyurtmalari — sahifalangan. */
export async function listFoodOrders(
  userId: string,
  query: FoodOrderQuery,
): Promise<{ orders: FoodOrderView[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  const where: Prisma.FoodOrderWhereInput = { userId, ...buildStatusFilter(query.status) };

  const [rows, total] = await Promise.all([
    prisma.foodOrder.findMany({
      where,
      select: ORDER_SELECT,
      orderBy: { createdAt: query.order },
      skip,
      take,
    }),
    prisma.foodOrder.count({ where }),
  ]);

  return { orders: rows.map(toOrderView), total };
}

/** "Faol" — hali yetkazilmagan va bekor qilinmagan buyurtmalar. */
function buildStatusFilter(status: FoodOrderQuery['status']): Prisma.FoodOrderWhereInput {
  switch (status) {
    case 'ACTIVE':
      return {
        status: {
          in: [
            FoodOrderStatus.PENDING,
            FoodOrderStatus.CONFIRMED,
            FoodOrderStatus.PREPARING,
            FoodOrderStatus.DELIVERING,
          ],
        },
      };
    case 'DELIVERED':
      return { status: FoodOrderStatus.DELIVERED };
    case 'CANCELLED':
      return { status: FoodOrderStatus.CANCELLED };
    default:
      return {};
  }
}

/** Bitta buyurtma. Boshqa foydalanuvchi buyurtmasi ko'rinmaydi. */
export async function getFoodOrder(userId: string, orderId: string): Promise<FoodOrderView> {
  const order = await prisma.foodOrder.findFirst({
    where: { id: orderId, userId },
    select: ORDER_SELECT,
  });

  if (!order) {
    throw new NotFoundError('Buyurtma');
  }

  return toOrderView(order);
}
