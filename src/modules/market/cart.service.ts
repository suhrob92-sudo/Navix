import { Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import {
  MAX_CART_LINES,
  MAX_SAVED_LINES,
  cartLineKey,
  clampQuantity,
  mergeCartLines,
  type CartLine,
} from '@/config/cart';
import { priceCartLines } from '@/modules/market/cart-preview.service';
import type { CartShopView, CartView } from '@/modules/market/cart.types';

/**
 * Savat — SERVER tomoni.
 *
 * ── Nima uchun savatning DO'KONI ustunda saqlanmaydi ──────────────────
 * `carts` jadvalini yaratib, unga `shopId` yozib qo'ysa bo'lardi.
 *
 * Lekin o'shanda ikkita haqiqat paydo bo'lardi: ustundagi do'kon va
 * qatorlardagi mahsulotlarning haqiqiy do'koni. Ular bir kun kelib
 * mos kelmay qolardi — masalan oxirgi mahsulot o'chirilganda ustun
 * tozalanmay qolsa, savat "bo'sh, lekin do'koni bor" holatga
 * tushardi.
 *
 * Shuning uchun do'kon QATORLARDAN kelib chiqadi. Bitta haqiqat
 * bor va u hech qachon eskirmaydi.
 *
 * ── Nima uchun savat BITTA do'konga tegishli ──────────────────────────
 * Har do'konning o'z omborxonasi, yetkazish haqi va muddati bor. Ikki
 * do'kondan bitta buyurtma — ikki alohida jo'natma demak.
 *
 * "Keyinroq sotib olaman" ro'yxatiga esa bu cheklov TEGISHLI EMAS:
 * u hali buyurtma emas, shunchaki eslatma.
 */

const ITEM_SELECT = {
  id: true,
  productId: true,
  variantId: true,
  quantity: true,
  savedForLater: true,
  updatedAt: true,
  product: {
    select: {
      shop: { select: { id: true, slug: true, name: true, isOpen: true } },
    },
  },
} satisfies Prisma.CartItemSelect;

type ItemRow = Prisma.CartItemGetPayload<{ select: typeof ITEM_SELECT }>;

/** Savatdagi barcha qatorlar — faol va "keyinroq". */
async function readItems(userId: string): Promise<ItemRow[]> {
  return prisma.cartItem.findMany({
    where: { userId },
    select: ITEM_SELECT,
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Savatning do'koni — FAOL qatorlardan.
 *
 * Faol qator bo'lmasa `null`: savat bo'sh va istalgan do'kondan
 * mahsulot qo'shish mumkin.
 */
function shopOf(items: readonly ItemRow[]): CartShopView | null {
  const active = items.find((item) => !item.savedForLater);

  if (!active) return null;

  const shop = active.product.shop;

  return { id: shop.id, slug: shop.slug, name: shop.name, isOpen: shop.isOpen };
}

/**
 * Savatni o'qiydi va NARXLARNI bazadan qo'yadi.
 *
 * Narx savatda saqlanmaydi — sabab `CartItem` izohida.
 */
export async function getCart(userId: string): Promise<CartView> {
  const items = await readItems(userId);

  const active = items.filter((item) => !item.savedForLater);
  const saved = items.filter((item) => item.savedForLater);

  /*
    Ikkala ro'yxat BITTA so'rov bilan narxlanadi: alohida
    so'ralsa, savat sahifasi ikki marta bazaga borardi.
  */
  const priced = await priceCartLines(
    items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    })),
  );

  const priceByKey = new Map(
    priced.lines.map((line) => [cartLineKey(line.productId, line.variantId), line]),
  );

  const toView = (rows: readonly ItemRow[]) =>
    rows.flatMap((item) => {
      const line = priceByKey.get(cartLineKey(item.productId, item.variantId));

      // Mahsulot bazadan butunlay o'chirilgan — ko'rsatadigan narsa yo'q.
      if (!line) return [];

      return [{ ...line, quantity: item.quantity, savedForLater: item.savedForLater }];
    });

  return {
    shop: shopOf(items),
    lines: toView(active),
    savedLines: toView(saved),
    missingCount: priced.missingCount,
  };
}

/**
 * Mahsulotni savatga qo'shadi.
 *
 * ── Nima uchun `replaceShop` ALOHIDA bayroq ───────────────────────────
 * Boshqa do'kon mahsulotini qo'shish savatni tozalashni talab
 * qiladi. Buni jimgina qilib bo'lmaydi: odam yig'gan narsalari
 * yo'qolganini sezmay qolardi.
 *
 * Shuning uchun birinchi urinish XATO qaytaradi, ekran esa
 * "savatingiz tozalansinmi?" deb so'raydi. Odam rozi bo'lsa,
 * so'rov `replaceShop` bilan qaytariladi.
 */
export async function addToCart(
  userId: string,
  input: {
    productId: string;
    variantId?: string | null;
    quantity?: number;
    replaceShop?: boolean;
  },
): Promise<CartView> {
  const quantity = clampQuantity(input.quantity ?? 1);
  const variantId = input.variantId ?? null;

  const product = await prisma.product.findFirst({
    where: { id: input.productId, isActive: true },
    select: { id: true, shopId: true, options: { select: { id: true } } },
  });

  if (!product) {
    throw new NotFoundError('Mahsulot');
  }

  /*
    Variantli mahsulotni variantsiz qo'shib bo'lmaydi: qaysi rang va
    o'lcham kerakligi noma'lum qolardi va buyurtma berishda xato
    chiqardi.
  */
  if (product.options.length > 0 && !variantId) {
    throw new ValidationError('Avval mahsulot turini tanlang');
  }

  if (variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId: product.id, isActive: true },
      select: { id: true },
    });

    if (!variant) {
      throw new NotFoundError('Mahsulot turi');
    }
  }

  const items = await readItems(userId);
  const shop = shopOf(items);

  if (shop && shop.id !== product.shopId) {
    if (!input.replaceShop) {
      throw new ConflictError(
        `Savatingizda ${shop.name} mahsulotlari bor. Ikki do'kondan bitta buyurtma berib bo'lmaydi.`,
      );
    }

    /*
      FAQAT faol qatorlar o'chiriladi. "Keyinroq" ro'yxati boshqa
      do'konga o'tishdan zarar ko'rmasligi kerak — u buyurtmaga
      aloqador emas.
    */
    await prisma.cartItem.deleteMany({ where: { userId, savedForLater: false } });
  }

  const activeCount = items.filter((item) => !item.savedForLater).length;
  const key = cartLineKey(input.productId, variantId);
  const exists = items.some(
    (item) => !item.savedForLater && cartLineKey(item.productId, item.variantId) === key,
  );

  if (!exists && activeCount >= MAX_CART_LINES) {
    throw new ValidationError(`Savatga eng ko'pi bilan ${MAX_CART_LINES} ta mahsulot sig'adi`);
  }

  await upsertLine(userId, input.productId, variantId, quantity, { add: true });

  return getCart(userId);
}

/**
 * Miqdorni belgilaydi. Nol yoki undan kichik — qator o'chiriladi.
 */
export async function setCartQuantity(
  userId: string,
  input: { productId: string; variantId?: string | null; quantity: number },
): Promise<CartView> {
  const variantId = input.variantId ?? null;

  if (input.quantity <= 0) {
    return removeFromCart(userId, { productId: input.productId, variantId });
  }

  const updated = await prisma.cartItem.updateMany({
    where: { userId, productId: input.productId, variantId },
    data: { quantity: clampQuantity(input.quantity) },
  });

  if (updated.count === 0) {
    throw new NotFoundError('Savat qatori');
  }

  return getCart(userId);
}

/** Qatorni savatdan olib tashlaydi. */
export async function removeFromCart(
  userId: string,
  input: { productId: string; variantId?: string | null },
): Promise<CartView> {
  await prisma.cartItem.deleteMany({
    where: { userId, productId: input.productId, variantId: input.variantId ?? null },
  });

  return getCart(userId);
}

/**
 * Qatorni "keyinroq" ro'yxatiga yoki qaytib savatga ko'chiradi.
 *
 * ── Nima uchun bu KO'CHIRISH emas, BELGI almashtirish ─────────────────
 * Ikkita jadval bo'lsa, ko'chirish o'chirish va qo'shishni talab
 * qilardi — ikkita amal va ular orasida buzilish ehtimoli.
 *
 * Bitta belgi esa bitta yangilanish bilan almashadi.
 */
export async function setSavedForLater(
  userId: string,
  input: { productId: string; variantId?: string | null; savedForLater: boolean },
): Promise<CartView> {
  const variantId = input.variantId ?? null;

  const item = await prisma.cartItem.findFirst({
    where: { userId, productId: input.productId, variantId },
    select: { id: true, savedForLater: true, product: { select: { shopId: true } } },
  });

  if (!item) {
    throw new NotFoundError('Savat qatori');
  }

  // Holat allaqachon shunday — qo'shimcha yozuv shart emas.
  if (item.savedForLater === input.savedForLater) {
    return getCart(userId);
  }

  if (input.savedForLater) {
    const savedCount = await prisma.cartItem.count({ where: { userId, savedForLater: true } });

    if (savedCount >= MAX_SAVED_LINES) {
      throw new ValidationError(`Ro'yxatga eng ko'pi bilan ${MAX_SAVED_LINES} ta mahsulot sig'adi`);
    }
  } else {
    /*
      Savatga QAYTARISHDA do'kon qoidasi yana ishlaydi: "keyinroq"
      ro'yxatida boshqa do'kon mahsuloti turgan bo'lishi mumkin.
    */
    const items = await readItems(userId);
    const shop = shopOf(items);

    if (shop && shop.id !== item.product.shopId) {
      throw new ConflictError(
        `Savatingizda ${shop.name} mahsulotlari bor. Avval savatni bo'shating.`,
      );
    }
  }

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { savedForLater: input.savedForLater },
  });

  return getCart(userId);
}

/** Savatni tozalaydi. "Keyinroq" ro'yxati saqlanadi. */
export async function clearCart(userId: string): Promise<CartView> {
  await prisma.cartItem.deleteMany({ where: { userId, savedForLater: false } });

  return getCart(userId);
}

/**
 * Brauzerdagi eski savatni serverdagisiga QO'SHADI.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Savat serverga ko'chgan kuni odamlarning brauzerida allaqachon
 * to'ldirilgan savat turibdi. Uni tashlab yuborsak, hamma o'z
 * savatini yo'qotardi.
 *
 * ── Nima uchun bu amal TAKRORLANSA ham xavfsiz ────────────────────────
 * Miqdorlar qo'shilmaydi, ENG KATTASI olinadi (`mergeCartLines`).
 * Shuning uchun so'rov qaytarilsa ham savat shishib ketmaydi.
 */
export async function mergeLocalCart(
  userId: string,
  local: readonly CartLine[],
): Promise<CartView> {
  if (local.length === 0) return getCart(userId);

  const items = await readItems(userId);
  const shop = shopOf(items);

  /*
    Brauzerdagi savat qaysi do'konga tegishli ekanini tekshiramiz:
    unda ID'lar bor, lekin ularga ishonib bo'lmaydi — savatni
    foydalanuvchining o'zi tahrirlagan bo'lishi mumkin.
  */
  const products = await prisma.product.findMany({
    where: { id: { in: local.map((line) => line.productId) }, isActive: true },
    select: { id: true, shopId: true },
  });

  const shopById = new Map(products.map((product) => [product.id, product.shopId]));

  /*
    Serverdagi savat bo'sh bo'lsa, brauzerdagi savatning O'Z
    do'koni tanlanadi — birinchi topilgani bo'yicha.
  */
  const targetShopId =
    shop?.id ?? local.map((line) => shopById.get(line.productId)).find((id) => id !== undefined);

  if (targetShopId === undefined) return getCart(userId);

  /*
    Boshqa do'kon mahsulotlari TASHLAB YUBORILADI, savat esa
    tozalanmaydi.

    Serverdagi savat har doim ustun turadi: odam uni yaqinroqda
    va ongli ravishda to'ldirgan.
  */
  const usable = local.filter((line) => shopById.get(line.productId) === targetShopId);

  const serverLines: CartLine[] = items
    .filter((item) => !item.savedForLater)
    .map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }));

  const merged = mergeCartLines(serverLines, usable);

  for (const line of merged) {
    await upsertLine(userId, line.productId, line.variantId, line.quantity, { add: false });
  }

  return getCart(userId);
}

/**
 * Qatorni yozadi yoki yangilaydi.
 *
 * ── Nima uchun `upsert` emas, qo'lda tekshiruv ────────────────────────
 * Prisma'ning `upsert` amali yagona kalitni talab qiladi. Bu yerdagi
 * yagonalik esa QISMIY indeks bilan berilgan (`variantId IS NULL`
 * va `IS NOT NULL` uchun alohida) — Prisma bunday indeksni bilmaydi.
 *
 * Sabab migratsiyada batafsil: PostgreSQL'da NULL qiymatlar
 * bir-biriga teng emas va oddiy yagonalik cheklovi variantsiz
 * mahsulotni takrorlanishdan saqlay olmasdi.
 */
async function upsertLine(
  userId: string,
  productId: string,
  variantId: string | null,
  quantity: number,
  options: { add: boolean },
): Promise<void> {
  const existing = await prisma.cartItem.findFirst({
    where: { userId, productId, variantId },
    select: { id: true, quantity: true, savedForLater: true },
  });

  if (!existing) {
    await prisma.cartItem.create({ data: { userId, productId, variantId, quantity } });

    return;
  }

  const next = options.add ? existing.quantity + quantity : quantity;

  await prisma.cartItem.update({
    where: { id: existing.id },
    data: {
      quantity: clampQuantity(next),
      /*
        "Keyinroq" ro'yxatidagi mahsulot qaytadan qo'shilsa, u
        savatga QAYTADI — odam aynan shuni kutadi.
      */
      savedForLater: false,
    },
  });
}
