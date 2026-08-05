import { formatTiyin, somToTiyin } from '@/lib/money';
import { FOOD_ORDER_STATUS_LABELS } from '@/modules/food/food.types';
import { getWalletSummary } from '@/modules/wallet/wallet.service';
import { MAX_ITEM_QUANTITY } from '@/modules/food/food.schemas';
import { MAX_DISH_OPTIONS } from '@/modules/assistant/assistant.food.constants';
import {
  findDishById,
  findDishes,
  findOpenRestaurants,
  getDeliveryAddress,
  getLatestFoodOrder,
  type DishMatch,
} from '@/modules/assistant/assistant.food';
import { Intent } from '@/modules/assistant/intent';
import type {
  AssistantReply,
  AssistantSlots,
  FoodOptionSlot,
} from '@/modules/assistant/assistant.types';

/**
 * Yordamchining OVQAT suhbati.
 *
 * ── Suhbat qanday boradi ──────────────────────────────────────────────
 *   "lag'mon buyur"
 *      → menyudan qidiriladi
 *      → bir nechta topilsa ro'yxat ko'rsatiladi ("1. Lag'mon — ...")
 *      → bittasi tanlanadi
 *      → soni, manzil va balans tekshiriladi
 *      → TASDIQLASH kartochkasi chiqadi
 *
 * ── Eng muhim qoida (butun yordamchida bir xil) ───────────────────────
 * Yordamchi BUYURTMANI O'ZI BERMAYDI. U faqat tayyorlangan buyruqni
 * ko'rsatadi; foydalanuvchi tugmani bosgach, mijoz odatdagi
 * `POST /api/v1/food/orders` ga murojaat qiladi. Shu sababli narx,
 * eng kam buyurtma, restoran ochiqligi va balans — hammasi server
 * tomonida QAYTADAN tekshiriladi.
 *
 * Bu yerdagi tekshiruvlar ularning o'rnini bosmaydi: ular faqat
 * foydalanuvchiga XATONI OLDINDAN aytish uchun. Tasdiqlagandan keyin
 * "mablag' yetmadi" degan javob olish — yomon tajriba.
 */

interface Reply {
  text: string;
  suggestions?: string[];
  action?: AssistantReply['action'];
  state?: AssistantReply['state'];
}

function make(reply: Reply): AssistantReply {
  return {
    text: reply.text,
    suggestions: reply.suggestions ?? [],
    action: reply.action ?? { kind: 'none' },
    state: reply.state ?? { slots: {} },
  };
}

/** Suhbat tugadi. */
const DONE: AssistantReply['state'] = { slots: {} };

/** Narxni so'mda chiroyli yozadi. `formatTiyin` tiyin kutadi. */
function som(value: number): string {
  return formatTiyin(somToTiyin(value));
}

/** Variantni ro'yxat qatoriga aylantiradi: "1. Lag'mon — Milliy Taomlar · 42 000 so'm". */
function optionLabel(index: number, option: FoodOptionSlot): string {
  return `${index + 1}. ${option.name} — ${option.restaurantName} · ${som(option.priceSom)}`;
}

function toOptionSlot(dish: DishMatch): FoodOptionSlot {
  return {
    menuItemId: dish.menuItemId,
    name: dish.name,
    restaurantName: dish.restaurantName,
    priceSom: dish.priceSom,
  };
}

// ── Buyurtma holati ───────────────────────────────────────────────────

/**
 * "Buyurtmam qayerda?"
 *
 * Faol buyurtma bo'lmasa oxirgisi aytiladi — "yetkazildi" ham javob.
 */
export async function handleFoodStatus(userId: string): Promise<AssistantReply> {
  const order = await getLatestFoodOrder(userId);

  if (!order) {
    return make({
      text: "Hozircha ovqat buyurtmangiz yo'q. Nima yegingiz kelyapti?",
      suggestions: ["Lag'mon buyur", 'Burger buyur', 'Nima buyursam'],
    });
  }

  const status = FOOD_ORDER_STATUS_LABELS[order.status];
  const where = `${order.orderNumber} — ${order.restaurantName}, ${formatTiyin(order.totalTiyin)}.`;

  if (order.status === 'CANCELLED') {
    const reason = order.cancelReason ? ` Sabab: ${order.cancelReason}.` : '';

    return make({
      text: `${where} Buyurtma bekor qilindi va pul hamyoningizga qaytarildi.${reason}`,
      action: { kind: 'navigate', href: `/orders/${order.id}`, label: "Buyurtmani ko'rish" },
      suggestions: ['Yana buyurtma beraman', 'Balansim qancha'],
    });
  }

  if (order.status === 'DELIVERED') {
    return make({
      text: `${where} Buyurtma yetkazilgan. Yana buyurtma berasizmi?`,
      action: { kind: 'navigate', href: `/orders/${order.id}`, label: "Buyurtmani ko'rish" },
      suggestions: ['Yana buyurtma beraman'],
    });
  }

  // Hali yo'lda: taxminiy vaqtni ham aytamiz.
  const eta = estimateMinutesLeft(order.createdAt, order.deliveryMinutes);

  const etaText =
    eta === null
      ? 'Yetkazish vaqti belgilangan muddatdan oshdi — restoranga bog\'lanishingiz mumkin.'
      : `Taxminan ${eta} daqiqada yetkaziladi.`;

  return make({
    text: `${where} Holati: ${status}. ${etaText}`,
    action: { kind: 'navigate', href: `/orders/${order.id}`, label: "Buyurtmani ko'rish" },
    suggestions: ['Balansim qancha'],
  });
}

/**
 * Yetkazishga qancha vaqt qolganini hisoblaydi.
 *
 * Muddat o'tib ketgan bo'lsa `null` — "0 daqiqa" deb yolg'on aytgandan
 * ko'ra rostini aytgan yaxshi.
 */
export function estimateMinutesLeft(createdAt: Date, deliveryMinutes: number, now = new Date()): number | null {
  const passed = Math.floor((now.getTime() - createdAt.getTime()) / 60_000);
  const left = deliveryMinutes - passed;

  return left > 0 ? left : null;
}

// ── Buyurtma berish ───────────────────────────────────────────────────

export interface FoodOrderParams {
  userId: string;
  slots: AssistantSlots;
  /** Menyudan qidiriladigan matn. */
  foodQuery: string | null;
  /** "2 ta" — nechta dona. */
  quantity: number | null;
  /** Ro'yxatdan tanlangan raqam. */
  ordinal: number | null;
  /** "50 minggacha" — narx chegarasi. */
  maxPriceSom: number | null;
  /**
   * Oldindan topilgan natijalar.
   *
   * `assistant.service.ts` qaysi katalogda qidirishni hal qilish uchun
   * menyuni allaqachon so'ragan bo'lishi mumkin. Natijani qayta
   * so'ramaslik uchun shu yerga uzatiladi.
   */
  prefetched?: DishMatch[];
}

/**
 * Ovqat buyurtmasi suhbatining bir qadami.
 *
 * Har qadamda faqat BITTA narsa so'raladi — telefonda uzun savol
 * o'qilmaydi.
 */
export async function handleFoodOrder(params: FoodOrderParams): Promise<AssistantReply> {
  const { userId, slots } = params;

  // 1. Foydalanuvchi ro'yxatdan tanladimi?
  const chosen = pickFromOptions(slots.foodOptions, params.ordinal);

  if (chosen) {
    return buildOrder(userId, chosen.menuItemId, params.quantity ?? slots.quantity ?? 1);
  }

  // 2. Avval tanlangan taom bor bo'lsa — faqat soni o'zgargan bo'lishi mumkin.
  if (slots.menuItemId && params.foodQuery === null) {
    return buildOrder(userId, slots.menuItemId, params.quantity ?? slots.quantity ?? 1);
  }

  // 3. Nima qidirishni bilmasak — restoran tavsiya qilamiz.
  if (!params.foodQuery) {
    return suggestRestaurants();
  }

  // 4. Menyudan qidiramiz.
  const dishes =
    params.prefetched ??
    (await findDishes({
      query: params.foodQuery,
      ...(params.maxPriceSom === null ? {} : { maxPriceSom: params.maxPriceSom }),
    }));

  if (dishes.length === 0) {
    return notFound(params.foodQuery, params.maxPriceSom);
  }

  // 5. Bitta aniq natija — darhol tasdiqlashga o'tamiz.
  if (dishes.length === 1) {
    return buildOrder(userId, dishes[0].menuItemId, params.quantity ?? 1);
  }

  // 6. Bir nechta — tanlashni so'raymiz.
  const options = dishes.map(toOptionSlot);

  return make({
    text: `${dishes.length} ta variant topildi. Qaysi birini buyuraman?`,
    suggestions: options.map((option, index) => optionLabel(index, option)),
    state: {
      intent: Intent.FOOD_ORDER,
      slots: {
        foodOptions: options,
        ...(params.quantity === null ? {} : { quantity: params.quantity }),
      },
    },
  });
}

/** Ro'yxatdan tanlovni oladi. Raqam noto'g'ri bo'lsa `null`. */
function pickFromOptions(options: FoodOptionSlot[] | undefined, ordinal: number | null): FoodOptionSlot | null {
  if (!options || options.length === 0 || ordinal === null) return null;

  return options[ordinal - 1] ?? null;
}

/** Hech narsa topilmadi. */
function notFound(query: string, maxPriceSom: number | null): AssistantReply {
  const limit = maxPriceSom === null ? '' : ` ${som(maxPriceSom)} gacha bo'lgan`;

  return make({
    text: `Menyulardan${limit} "${query}" topilmadi. Boshqa nom bilan urinib ko'ring yoki menyuni o'zingiz ko'ring.`,
    action: { kind: 'navigate', href: '/food', label: 'Restoranlarni ochish' },
    suggestions: ['Osh buyur', 'Burger buyur', 'Pitsa buyur'],
  });
}

/** "Och qoldim" — nima yeyishini bilmaydigan odamga joy taklif qilamiz. */
async function suggestRestaurants(): Promise<AssistantReply> {
  const restaurants = await findOpenRestaurants(MAX_DISH_OPTIONS - 1);

  if (restaurants.length === 0) {
    return make({
      text: "Hozir ochiq restoran yo'q. Keyinroq urinib ko'ring.",
      action: { kind: 'navigate', href: '/food', label: 'Restoranlarni ochish' },
    });
  }

  const lines = restaurants.map(
    (restaurant) =>
      `• ${restaurant.name} — ${restaurant.cuisine}, ${restaurant.deliveryMinutes} daqiqa, ` +
      `eng kam ${som(restaurant.minOrderSom)}`,
  );

  return make({
    text: `Hozir ochiq restoranlar:\n${lines.join('\n')}\n\nNima yegingiz kelyapti? Taom nomini yozing.`,
    suggestions: ['Osh buyur', 'Burger buyur', 'Shirinlik buyur'],
    action: { kind: 'navigate', href: '/food', label: "Hammasini ko'rish" },
  });
}

/**
 * Tanlangan taom bo'yicha tasdiqlash kartochkasini tayyorlaydi.
 *
 * Ketma-ketlik ataylab shunday: avval ARZON tekshiruvlar (taom bormi,
 * restoran ochiqmi), keyingina bazaga qo'shimcha so'rov talab qiladigan
 * manzil va balans.
 */
async function buildOrder(userId: string, menuItemId: string, rawQuantity: number): Promise<AssistantReply> {
  const quantity = Math.min(Math.max(rawQuantity, 1), MAX_ITEM_QUANTITY);

  // Taomni ID bo'yicha qaytadan o'qiymiz: holatdagi narx eskirgan
  // bo'lishi mumkin, foydalanuvchiga esa HOZIRGI narx ko'rsatilishi kerak.
  const dish = await findDishById(menuItemId);

  if (!dish) {
    return make({
      text: "Bu taom endi mavjud emas — menyu o'zgargan bo'lishi mumkin.",
      action: { kind: 'navigate', href: '/food', label: 'Menyuni ochish' },
      suggestions: ['Osh buyur', 'Burger buyur'],
    });
  }

  if (!dish.isOpen) {
    return make({
      text: `${dish.restaurantName} hozir yopiq. Boshqa restorandan tanlaymizmi?`,
      action: { kind: 'navigate', href: '/food', label: 'Ochiq restoranlar' },
      suggestions: ['Nima buyursam'],
    });
  }

  const subtotalSom = dish.priceSom * quantity;

  // Eng kam buyurtma — yetkazish haqisiz hisoblanadi (`food.service.ts`
  // dagi qoida bilan bir xil).
  if (subtotalSom < dish.minOrderSom) {
    const needed = Math.ceil(dish.minOrderSom / dish.priceSom);

    return make({
      text:
        `${dish.restaurantName} uchun eng kam buyurtma — ${som(dish.minOrderSom)}. ` +
        `${quantity} ta "${dish.name}" ${som(subtotalSom)} bo'ladi, bu yetmaydi. ` +
        `Kamida ${needed} ta olsangiz bo'ladi.`,
      suggestions: [`${needed} ta`],
      state: { intent: Intent.FOOD_ORDER, slots: { menuItemId: dish.menuItemId } },
    });
  }

  const address = await getDeliveryAddress(userId);

  if (!address) {
    return make({
      text: "Yetkazish uchun manzil kerak. Avval manzil qo'shing — keyin buyurtmani bir bosishda beraman.",
      action: { kind: 'navigate', href: '/addresses', label: "Manzil qo'shish" },
    });
  }

  const amountSom = subtotalSom + dish.deliveryFeeSom;
  const wallet = await getWalletSummary(userId, 1);

  if (wallet.available < somToTiyin(amountSom)) {
    return make({
      text:
        `Buyurtma ${som(amountSom)} turadi, hamyoningizda esa ${formatTiyin(wallet.available)} bor. ` +
        'Avval hisobni to\'ldiraylikmi?',
      action: { kind: 'navigate', href: '/wallet/topup', label: "Hisobni to'ldirish" },
      suggestions: ["Hisobni to'ldir"],
      state: DONE,
    });
  }

  return make({
    text: `${dish.restaurantName} — ${quantity} ta "${dish.name}". Buyurtma beramizmi?`,
    action: {
      kind: 'confirm_food_order',
      restaurantId: dish.restaurantId,
      restaurantName: dish.restaurantName,
      addressId: address.id,
      addressLine: address.line,
      itemName: dish.name,
      menuItemId: dish.menuItemId,
      quantity,
      subtotalSom,
      deliveryFeeSom: dish.deliveryFeeSom,
      amountSom,
      deliveryMinutes: dish.deliveryMinutes,
    },
    state: DONE,
  });
}
