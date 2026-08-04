import { FoodOrderStatus, Prisma } from '@/generated/prisma/client';
import { somToTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { toSearchText } from '@/lib/search';
import { MAX_DISH_OPTIONS } from '@/modules/assistant/assistant.food.constants';
import type { FoodOrderStatusName } from '@/modules/food/food.types';

/**
 * AI yordamchi uchun OVQAT ma'lumotlari.
 *
 * ── Nima uchun alohida fayl ───────────────────────────────────────────
 * `food.service.ts` mijoz ilovasiga xizmat qiladi: u to'liq menyu,
 * sahifalash va buyurtma yaratish bilan ishlaydi. Yordamchiga esa
 * boshqacha kesim kerak — "shu so'zga mos eng yaxshi 5 ta taom".
 *
 * Ikkalasini bitta faylga tiqish har ikkalasini ham chalkashtirardi.
 * Bu yerda FAQAT O'QISH bor: yordamchi hech narsani o'zgartirmaydi.
 *
 * ── Eng muhim qoida ───────────────────────────────────────────────────
 * Bu yerdagi narxlar faqat KO'RSATISH uchun. Buyurtma yaratilganda
 * `createFoodOrder()` narxni bazadan qaytadan o'qiydi. Ya'ni yordamchi
 * eskirgan narxni ko'rsatsa ham, pul har doim to'g'ri hisoblanadi.
 */

export { MAX_DISH_OPTIONS } from '@/modules/assistant/assistant.food.constants';

/** Qidiruvda bazadan olinadigan qatorlar soni — keyin JS'da saralanadi. */
const SEARCH_FETCH_LIMIT = 40;

/** Qidiruv so'zi shundan qisqa bo'lsa e'tiborga olinmaydi. */
const MIN_WORD_LENGTH = 3;

export interface DishMatch {
  menuItemId: string;
  name: string;
  priceSom: number;
  categoryName: string;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  deliveryFeeSom: number;
  minOrderSom: number;
  deliveryMinutes: number;
  isOpen: boolean;
}

const DISH_SELECT = {
  id: true,
  name: true,
  searchName: true,
  price: true,
  category: { select: { name: true } },
  restaurant: {
    select: {
      id: true,
      slug: true,
      name: true,
      deliveryFee: true,
      minOrder: true,
      deliveryMinutes: true,
      isOpen: true,
      rating: true,
    },
  },
} as const;

type DishRow = Prisma.MenuItemGetPayload<{ select: typeof DISH_SELECT }>;

function toDishMatch(row: DishRow): DishMatch {
  return {
    menuItemId: row.id,
    name: row.name,
    priceSom: tiyinToNumber(row.price) / 100,
    categoryName: row.category.name,
    restaurantId: row.restaurant.id,
    restaurantSlug: row.restaurant.slug,
    restaurantName: row.restaurant.name,
    deliveryFeeSom: tiyinToNumber(row.restaurant.deliveryFee) / 100,
    minOrderSom: tiyinToNumber(row.restaurant.minOrder) / 100,
    deliveryMinutes: row.restaurant.deliveryMinutes,
    isOpen: row.restaurant.isOpen,
  };
}

/**
 * Bitta so'z uchun qidiruv sharti.
 *
 * ── Nima uchun "so'z boshidan" ────────────────────────────────────────
 * Oddiy `contains` juda ko'p yolg'on natija beradi: "osh" so'zi
 * "kart-OSH-ka" ichida ham bor. Aynan teng solishtirish esa juda qattiq:
 * "burger" so'zi "Burgerlar" bo'limini topa olmasdi.
 *
 * O'rtadagi to'g'ri yechim — so'z BOSHIDAN moslik. O'zbek tilida
 * qo'shimchalar oxiriga qo'shilgani uchun bu tabiiy ishlaydi.
 */
function wordStartsWith(needle: string): Prisma.MenuItemWhereInput[] {
  return [
    // Nomning birinchi so'zi;
    { searchName: { startsWith: needle } },
    // yoki o'rtadagi so'zlardan biri.
    { searchName: { contains: ` ${needle}` } },
  ];
}

export interface FindDishesParams {
  /** Probel bilan ajratilgan qidiruv so'zlari. */
  query: string;
  /** Eng ko'p shuncha so'm — "50 minggacha nimadir bor?" uchun. */
  maxPriceSom?: number;
}

/**
 * Menyudan taom qidiradi.
 *
 * Qidiruv uch joydan boradi: taom nomi, menyu bo'limi va oshxona turi.
 * Shuning uchun "shirinlik" so'zi ham taom nomida bo'lmasa-da,
 * "Shirinliklar" bo'limini topadi.
 *
 * Saralash bazada emas, JS'da: bir nechta so'z berilganda "nechtasi
 * mos keldi" muhim, buni SQL'da yozish o'qishga og'ir bo'lardi va
 * natija soni baribir kichik (eng ko'pi 40 qator).
 */
export async function findDishes(params: FindDishesParams): Promise<DishMatch[]> {
  const words = toSearchText(params.query)
    .split(' ')
    .filter((word) => word.length >= MIN_WORD_LENGTH);

  if (words.length === 0) return [];

  const rows = await prisma.menuItem.findMany({
    where: {
      isAvailable: true,
      restaurant: { isActive: true },
      ...(params.maxPriceSom === undefined ? {} : { price: { lte: somToTiyin(params.maxPriceSom) } }),
      OR: words.flatMap((word) => [
        ...wordStartsWith(word),
        { category: { name: { contains: word, mode: 'insensitive' as const } } },
        { restaurant: { cuisine: { contains: word, mode: 'insensitive' as const } } },
      ]),
    },
    select: DISH_SELECT,
    take: SEARCH_FETCH_LIMIT,
  });

  return rows
    .map((row) => ({ row, score: scoreDish(row, words) }))
    .sort((left, right) => {
      // 1. Nechta so'z to'g'ri keldi;
      if (right.score !== left.score) return right.score - left.score;
      // 2. Ochiq restoran — yopiqdan buyurtma berib bo'lmaydi;
      if (right.row.restaurant.isOpen !== left.row.restaurant.isOpen) {
        return right.row.restaurant.isOpen ? 1 : -1;
      }
      // 3. Reytingi balandroq;
      const ratingGap = Number(right.row.restaurant.rating) - Number(left.row.restaurant.rating);
      if (ratingGap !== 0) return ratingGap;
      // 4. Arzonroq — teng sharoitda foydalanuvchi foydasiga.
      return Number(left.row.price - right.row.price);
    })
    .slice(0, MAX_DISH_OPTIONS)
    .map(({ row }) => toDishMatch(row));
}

/**
 * Bitta taomni ID bo'yicha oladi.
 *
 * Tasdiqlashdan oldin narx va restoran holati QAYTADAN o'qiladi:
 * suhbat davomida narx o'zgargan yoki restoran yopilgan bo'lishi
 * mumkin, foydalanuvchiga esa hozirgi holat ko'rsatilishi kerak.
 */
export async function findDishById(menuItemId: string): Promise<DishMatch | null> {
  const row = await prisma.menuItem.findFirst({
    where: { id: menuItemId, isAvailable: true, restaurant: { isActive: true } },
    select: DISH_SELECT,
  });

  return row ? toDishMatch(row) : null;
}

/**
 * Taom qidiruv so'zlariga qanchalik mos kelganini baholaydi.
 *
 * Taom NOMIDAGI moslik bo'lim yoki oshxona turidagi moslikdan qimmatroq:
 * "burger" deganda "Klassik burger" kerak, "Burgerlar bo'limidagi
 * kola" emas.
 */
function scoreDish(row: DishRow, words: string[]): number {
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

// ── Restoranlar ───────────────────────────────────────────────────────

export interface RestaurantSuggestion {
  slug: string;
  name: string;
  cuisine: string;
  minOrderSom: number;
  deliveryMinutes: number;
  rating: number;
}

/**
 * Tavsiya uchun ochiq restoranlar — reytingi bo'yicha.
 *
 * "Och qoldim" degan odamga taom emas, joy taklif qilinadi: u hali
 * nima yeyishini bilmaydi.
 */
export async function findOpenRestaurants(limit = 3): Promise<RestaurantSuggestion[]> {
  const rows = await prisma.restaurant.findMany({
    where: { isActive: true, isOpen: true },
    select: {
      slug: true,
      name: true,
      cuisine: true,
      minOrder: true,
      deliveryMinutes: true,
      rating: true,
    },
    orderBy: [{ rating: 'desc' }, { ratingCount: 'desc' }],
    take: limit,
  });

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    cuisine: row.cuisine,
    minOrderSom: tiyinToNumber(row.minOrder) / 100,
    deliveryMinutes: row.deliveryMinutes,
    rating: Number(row.rating),
  }));
}

// ── Buyurtma holati ───────────────────────────────────────────────────

export interface ActiveOrderInfo {
  id: string;
  orderNumber: string;
  status: FoodOrderStatusName;
  restaurantName: string;
  totalTiyin: bigint;
  deliveryMinutes: number;
  createdAt: Date;
  cancelReason: string | null;
}

/** Hali yakunlanmagan holatlar. */
const OPEN_STATUSES: FoodOrderStatus[] = [
  FoodOrderStatus.PENDING,
  FoodOrderStatus.CONFIRMED,
  FoodOrderStatus.PREPARING,
  FoodOrderStatus.DELIVERING,
];

const ORDER_INFO_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  total: true,
  createdAt: true,
  cancelReason: true,
  restaurant: { select: { name: true, deliveryMinutes: true } },
} as const;

function toOrderInfo(row: Prisma.FoodOrderGetPayload<{ select: typeof ORDER_INFO_SELECT }>): ActiveOrderInfo {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    restaurantName: row.restaurant.name,
    totalTiyin: row.total,
    deliveryMinutes: row.restaurant.deliveryMinutes,
    createdAt: row.createdAt,
    cancelReason: row.cancelReason,
  };
}

/**
 * "Buyurtmam qayerda?" savoliga javob beradigan buyurtma.
 *
 * Avval FAOL buyurtma qidiriladi. Bo'lmasa — oxirgi buyurtma
 * qaytariladi: "yetkazildi" yoki "bekor qilindi" javobi ham
 * foydalanuvchi uchun to'g'ri javob.
 */
export async function getLatestFoodOrder(userId: string): Promise<ActiveOrderInfo | null> {
  const active = await prisma.foodOrder.findFirst({
    where: { userId, status: { in: OPEN_STATUSES } },
    select: ORDER_INFO_SELECT,
    orderBy: { createdAt: 'desc' },
  });

  if (active) return toOrderInfo(active);

  const last = await prisma.foodOrder.findFirst({
    where: { userId },
    select: ORDER_INFO_SELECT,
    orderBy: { createdAt: 'desc' },
  });

  return last ? toOrderInfo(last) : null;
}

// ── Manzil ────────────────────────────────────────────────────────────

export interface DeliveryAddress {
  id: string;
  line: string;
}

/**
 * Yetkazish uchun manzil.
 *
 * Asosiy manzil olinadi; u belgilanmagan bo'lsa — eng oxirgi
 * qo'shilgani. Manzil umuman bo'lmasa `null` qaytadi va yordamchi
 * foydalanuvchini manzil qo'shish sahifasiga yuboradi.
 */
export async function getDeliveryAddress(userId: string): Promise<DeliveryAddress | null> {
  const address = await prisma.address.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true, label: true, city: true, street: true, building: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  if (!address) return null;

  const parts = [address.city, address.street, address.building ? `${address.building}-uy` : null].filter(
    Boolean,
  );

  return { id: address.id, line: `${address.label}: ${parts.join(', ')}` };
}
