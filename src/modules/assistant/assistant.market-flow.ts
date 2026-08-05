import { formatTiyin, somToTiyin } from '@/lib/money';
import { MARKET_ORDER_STATUS_LABELS } from '@/modules/market/market.types';
import { MAX_ITEM_QUANTITY } from '@/modules/market/market.schemas';
import { getWalletSummary } from '@/modules/wallet/wallet.service';
import { getDeliveryAddress } from '@/modules/assistant/assistant.food';
import {
  findProductById,
  findProducts,
  findTopCategories,
  getLatestMarketOrder,
  type ProductMatch,
} from '@/modules/assistant/assistant.market';
import { Intent } from '@/modules/assistant/intent';
import type {
  AssistantReply,
  AssistantSlots,
  MarketOptionSlot,
} from '@/modules/assistant/assistant.types';

/**
 * Yordamchining MARKETPLACE suhbati.
 *
 * Ovqat oqimi bilan bir xil tuzilgan — foydalanuvchi ikki modul
 * o'rtasidagi farqni sezmasligi kerak. Lekin ikkita muhim farqi bor:
 *
 *  1. ZAXIRA tekshiriladi. Ovqatda "tugadi" faqat bayroq edi, bu yerda
 *     esa aniq son bor: "atigi 2 ta qolgan".
 *  2. Eng kam buyurtmaga yetmasa "kamida N ta oling" deb aytib
 *     bo'lmaydi — zaxira yetmasligi mumkin. Shuning uchun yetishmayotgan
 *     SUMMA aytiladi va do'kon sahifasiga yo'naltiriladi.
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

function optionLabel(index: number, option: MarketOptionSlot): string {
  return `${index + 1}. ${option.name} — ${option.shopName} · ${som(option.priceSom)}`;
}

function toOptionSlot(product: ProductMatch): MarketOptionSlot {
  return {
    productId: product.productId,
    name: product.name,
    shopName: product.shopName,
    priceSom: product.priceSom,
  };
}

// ── Buyurtma holati ───────────────────────────────────────────────────

/** "Marketplace buyurtmam qayerda?" */
export async function handleMarketStatus(userId: string): Promise<AssistantReply> {
  const order = await getLatestMarketOrder(userId);

  if (!order) {
    return make({
      text: "Marketplace'dan buyurtmangiz yo'q. Nima sotib olmoqchisiz?",
      suggestions: ['Telefon qidir', 'Kitob qidir', 'Nima sotib olsam'],
    });
  }

  const where = `${order.orderNumber} — ${order.shopName}, ${formatTiyin(order.totalTiyin)}.`;
  const href = `/marketplace/orders/${order.id}`;

  if (order.status === 'CANCELLED') {
    const reason = order.cancelReason ? ` Sabab: ${order.cancelReason}.` : '';

    return make({
      text: `${where} Buyurtma bekor qilindi va pul hamyoningizga qaytarildi.${reason}`,
      action: { kind: 'navigate', href, label: "Buyurtmani ko'rish" },
      suggestions: ['Yana buyurtma beraman', 'Balansim qancha'],
    });
  }

  if (order.status === 'DELIVERED') {
    return make({
      text: `${where} Buyurtma yetkazilgan.`,
      action: { kind: 'navigate', href, label: "Buyurtmani ko'rish" },
      suggestions: ['Yana buyurtma beraman'],
    });
  }

  return make({
    text: `${where} Holati: ${MARKET_ORDER_STATUS_LABELS[order.status]}. Taxminan ${order.deliveryDays} kunda yetkaziladi.`,
    action: { kind: 'navigate', href, label: "Buyurtmani ko'rish" },
    suggestions: ['Balansim qancha'],
  });
}

// ── Buyurtma berish ───────────────────────────────────────────────────

export interface MarketOrderParams {
  userId: string;
  slots: AssistantSlots;
  /** Katalogdan qidiriladigan matn. */
  query: string | null;
  quantity: number | null;
  ordinal: number | null;
  /** "500 minggacha" — narx chegarasi. */
  maxPriceSom: number | null;
  /** Oldindan topilgan natijalar — qayta qidirmaslik uchun. */
  prefetched?: ProductMatch[];
}

/** Marketplace buyurtmasi suhbatining bir qadami. */
export async function handleMarketOrder(params: MarketOrderParams): Promise<AssistantReply> {
  const { userId, slots } = params;

  // 1. Foydalanuvchi ro'yxatdan tanladimi?
  const chosen = pickFromOptions(slots.productOptions, params.ordinal);

  if (chosen) {
    return buildOrder(userId, chosen.productId, params.quantity ?? slots.quantity ?? 1);
  }

  // 2. Avval tanlangan mahsulot bor bo'lsa — faqat soni o'zgargan bo'lishi mumkin.
  if (slots.productId && params.query === null) {
    return buildOrder(userId, slots.productId, params.quantity ?? slots.quantity ?? 1);
  }

  // 3. Nima qidirishni bilmasak — toifa tavsiya qilamiz.
  if (!params.query) {
    return suggestCategories();
  }

  // 4. Katalogdan qidiramiz.
  const products =
    params.prefetched ??
    (await findProducts({
      query: params.query,
      ...(params.maxPriceSom === null ? {} : { maxPriceSom: params.maxPriceSom }),
    }));

  if (products.length === 0) {
    return notFound(params.query, params.maxPriceSom);
  }

  // 5. Bitta aniq natija — darhol tasdiqlashga o'tamiz.
  if (products.length === 1) {
    return buildOrder(userId, products[0].productId, params.quantity ?? 1);
  }

  // 6. Bir nechta — tanlashni so'raymiz.
  const options = products.map(toOptionSlot);

  return make({
    text: `${products.length} ta mahsulot topildi. Qaysi birini olamiz?`,
    suggestions: options.map((option, index) => optionLabel(index, option)),
    state: {
      intent: Intent.MARKET_ORDER,
      slots: {
        productOptions: options,
        ...(params.quantity === null ? {} : { quantity: params.quantity }),
      },
    },
  });
}

/** Ro'yxatdan tanlovni oladi. Raqam noto'g'ri bo'lsa `null`. */
function pickFromOptions(
  options: MarketOptionSlot[] | undefined,
  ordinal: number | null,
): MarketOptionSlot | null {
  if (!options || options.length === 0 || ordinal === null) return null;

  return options[ordinal - 1] ?? null;
}

/** Hech narsa topilmadi. */
function notFound(query: string, maxPriceSom: number | null): AssistantReply {
  const limit = maxPriceSom === null ? '' : ` ${som(maxPriceSom)} gacha bo'lgan`;

  return make({
    text: `Katalogdan${limit} "${query}" topilmadi. Boshqa nom bilan urinib ko'ring yoki katalogni o'zingiz ko'ring.`,
    action: { kind: 'navigate', href: '/marketplace', label: 'Katalogni ochish' },
    suggestions: ['Telefon qidir', 'Kitob qidir', 'Kiyim qidir'],
  });
}

/** "Nima sotib olsam?" — toifa taklif qilamiz. */
async function suggestCategories(): Promise<AssistantReply> {
  const categories = await findTopCategories();

  if (categories.length === 0) {
    return make({
      text: "Katalogda hozir mahsulot yo'q. Keyinroq urinib ko'ring.",
      action: { kind: 'navigate', href: '/marketplace', label: 'Katalogni ochish' },
    });
  }

  const lines = categories.map((category) => `• ${category.name} — ${category.productCount} ta mahsulot`);

  return make({
    text: `Marketplace'da nima bor:\n${lines.join('\n')}\n\nNima izlayapsiz? Mahsulot nomini yozing.`,
    suggestions: categories.slice(0, 3).map((category) => `${category.name} qidir`),
    action: { kind: 'navigate', href: '/marketplace', label: "Hammasini ko'rish" },
  });
}

/**
 * Tanlangan mahsulot bo'yicha tasdiqlash kartochkasini tayyorlaydi.
 *
 * Ketma-ketlik ovqatdagi bilan bir xil, faqat qo'shimcha ZAXIRA
 * tekshiruvi bor.
 */
async function buildOrder(userId: string, productId: string, rawQuantity: number): Promise<AssistantReply> {
  const quantity = Math.min(Math.max(rawQuantity, 1), MAX_ITEM_QUANTITY);

  // Mahsulotni qaytadan o'qiymiz: suhbat davomida narx o'zgargan yoki
  // mahsulot sotilib ketgan bo'lishi mumkin.
  const product = await findProductById(productId);

  if (!product) {
    return make({
      text: "Bu mahsulot endi katalogda yo'q.",
      action: { kind: 'navigate', href: '/marketplace', label: 'Katalogni ochish' },
      suggestions: ['Telefon qidir', 'Kitob qidir'],
    });
  }

  // ZAXIRA — marketplace'ga xos tekshiruv.
  if (product.stock <= 0) {
    return make({
      text: `"${product.name}" tugagan. ${product.shopName} zaxirani to'ldirganda qaytadan paydo bo'ladi.`,
      action: {
        kind: 'navigate',
        href: `/marketplace/s/${product.shopSlug}`,
        label: "Do'konni ochish",
      },
      suggestions: ['Boshqasini qidir'],
    });
  }

  if (quantity > product.stock) {
    return make({
      text: `"${product.name}" dan atigi ${product.stock} ta qolgan. Shuncha olamizmi?`,
      suggestions: [`${product.stock} ta`],
      state: { intent: Intent.MARKET_ORDER, slots: { productId: product.productId } },
    });
  }

  const subtotalSom = product.priceSom * quantity;

  /**
   * Eng kam buyurtma.
   *
   * Ovqatdagidek "kamida N ta oling" deb bo'lmaydi: zaxira yetmasligi
   * mumkin. Shuning uchun yetishmayotgan SUMMA aytiladi va do'kon
   * sahifasiga yo'naltiriladi — u yerda boshqa mahsulot qo'shadi.
   */
  if (subtotalSom < product.minOrderSom) {
    const missing = product.minOrderSom - subtotalSom;

    return make({
      text:
        `${product.shopName} uchun eng kam buyurtma — ${som(product.minOrderSom)}. ` +
        `${quantity} ta "${product.name}" ${som(subtotalSom)} bo'ladi. ` +
        `Yana ${som(missing)} lik mahsulot qo'shish kerak.`,
      action: {
        kind: 'navigate',
        href: `/marketplace/s/${product.shopSlug}`,
        label: "Do'konni ochish",
      },
      state: DONE,
    });
  }

  const address = await getDeliveryAddress(userId);

  if (!address) {
    return make({
      text: "Yetkazish uchun manzil kerak. Avval manzil qo'shing — keyin buyurtmani bir bosishda beraman.",
      action: { kind: 'navigate', href: '/addresses', label: "Manzil qo'shish" },
    });
  }

  const amountSom = subtotalSom + product.deliveryFeeSom;
  const wallet = await getWalletSummary(userId, 1);

  if (wallet.available < somToTiyin(amountSom)) {
    return make({
      text:
        `Buyurtma ${som(amountSom)} turadi, hamyoningizda esa ${formatTiyin(wallet.available)} bor. ` +
        "Avval hisobni to'ldiraylikmi?",
      action: { kind: 'navigate', href: '/wallet/topup', label: "Hisobni to'ldirish" },
      suggestions: ["Hisobni to'ldir"],
      state: DONE,
    });
  }

  return make({
    text: `${product.shopName} — ${quantity} ta "${product.name}". Buyurtma beramizmi?`,
    action: {
      kind: 'confirm_market_order',
      shopId: product.shopId,
      shopName: product.shopName,
      addressId: address.id,
      addressLine: address.line,
      itemName: product.name,
      productId: product.productId,
      quantity,
      subtotalSom,
      deliveryFeeSom: product.deliveryFeeSom,
      amountSom,
      deliveryDays: product.deliveryDays,
    },
    state: DONE,
  });
}
