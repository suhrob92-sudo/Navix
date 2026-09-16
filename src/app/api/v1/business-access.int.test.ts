import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { Role } from '@/config/rbac';
import { chaqir, sinovOdam, sorov, tozala, type SinovOdam } from '@/test/api-harness';
import { createFoodOrder } from '@/modules/food/food.service';
import { createMarketOrder } from '@/modules/market/market.service';
import { topUp } from '@/modules/wallet/wallet.service';

import { GET as merchantGet, PATCH as merchantPatch } from '@/app/api/v1/merchant/orders/[id]/route';
import { GET as sellerGet, PATCH as sellerPatch } from '@/app/api/v1/seller/orders/[id]/route';

/**
 * BIZNES KABINETI — raqobatchining buyurtmasiga tegib bo'lmasligi.
 *
 * ── Bu yerdagi xavf mijoznikidan boshqacha ────────────────────────────
 * Mijoz yo'llarida savol sodda: "buyurtma shu odamnikimi?". Biznes
 * kabinetida esa egalik BIR POG'ONA uzoqda: buyurtma do'konga, do'kon
 * esa egasiga tegishli. Ya'ni tekshiruv `shop.ownerId` orqali ketadi.
 *
 * Bu — eng oson unutiladigan joy. Va bu yerda hamma sotuvchida
 * `MERCHANT` roli bor: ya'ni rol tekshiruvi HECH KIMNI to'smaydi.
 * Agar egalik sharti tushib qolsa, har bir sotuvchi raqobatchisining
 * buyurtmalarini o'qiy olardi — kim nima sotayotgani, qancha
 * buyurtma kelayotgani hammasi ochiq bo'lardi. Undan ham yomoni:
 * raqobatchining buyurtmasini BEKOR QILA olardi.
 */

const BAZA_BOR = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return true;
  } catch {
    return false;
  }
})();

const TURKUM = BAZA_BOR ? await prisma.productCategory.findFirst({ select: { id: true } }) : null;
const TAOM_TURKUM = BAZA_BOR ? await prisma.menuCategory.findFirst({ select: { id: true } }) : null;

/** Sinov yaratgan do'kon, restoran va mahsulotlar — oxirida o'chiriladi. */
const dokonlar: string[] = [];
const restoranlar: string[] = [];

afterAll(async () => {
  if (!BAZA_BOR) return;

  await tozala();

  await prisma.product.deleteMany({ where: { shopId: { in: dokonlar } } });
  await prisma.shop.deleteMany({ where: { id: { in: dokonlar } } });
  await prisma.menuItem.deleteMany({ where: { restaurantId: { in: restoranlar } } });
  await prisma.restaurant.deleteMany({ where: { id: { in: restoranlar } } });

  await prisma.$disconnect();
});

/** Sotuvchi: `MERCHANT` roli bilan — u har qanday biznes yo'liga kira oladi. */
async function sotuvchi(): Promise<SinovOdam> {
  return sinovOdam({ roles: [Role.MERCHANT] });
}

async function xaridor(): Promise<SinovOdam> {
  const odam = await sinovOdam();

  await topUp(odam.userId, { amount: 3_000_000, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

  return odam;
}

async function manzil(userId: string): Promise<string> {
  const address = await prisma.address.create({
    data: { userId, label: 'Uy', city: 'Toshkent', street: 'Amir Temur', latitude: 41.3111, longitude: 69.2797 },
    select: { id: true },
  });

  return address.id;
}

/**
 * Egasi bo'lgan do'kon va undagi mahsulot.
 *
 * Har sinov O'Z do'konini yaratadi: tayyor do'kon ishlatilsa,
 * boshqa sinovlar bilan bir qator ustida to'qnashardi.
 */
async function dokon(ega: SinovOdam) {
  const belgi = randomUUID().slice(0, 8);

  const shop = await prisma.shop.create({
    data: {
      ownerId: ega.userId,
      slug: `sinov-dokon-${belgi}`,
      name: `Sinov do'koni ${belgi}`,
      description: 'Biznes egalik sinovi uchun',
      searchName: `sinov dokon ${belgi}`,
      deliveryFee: 0n,
      minOrder: 0n,
      deliveryDays: 1,
      color: '#0ea5e9',
    },
    select: { id: true },
  });

  dokonlar.push(shop.id);

  const product = await prisma.product.create({
    data: {
      shopId: shop.id,
      categoryId: TURKUM!.id,
      slug: `sinov-mahsulot-${belgi}`,
      name: `Sinov mahsuloti ${belgi}`,
      searchName: `sinov mahsulot ${belgi}`,
      price: 50_000_00n,
      stock: 100,
    },
    select: { id: true },
  });

  return { shopId: shop.id, productId: product.id };
}

/** Egasi bo'lgan restoran va undagi taom. */
async function restoran(ega: SinovOdam) {
  const belgi = randomUUID().slice(0, 8);

  const place = await prisma.restaurant.create({
    data: {
      ownerId: ega.userId,
      slug: `sinov-restoran-${belgi}`,
      name: `Sinov restorani ${belgi}`,
      description: 'Biznes egalik sinovi uchun',
      cuisine: 'Milliy',
      searchName: `sinov restoran ${belgi}`,
      deliveryFee: 0n,
      minOrder: 0n,
      deliveryMinutes: 30,
      color: '#f97316',
    },
    select: { id: true },
  });

  restoranlar.push(place.id);

  const item = await prisma.menuItem.create({
    data: {
      restaurantId: place.id,
      categoryId: TAOM_TURKUM!.id,
      name: `Sinov taomi ${belgi}`,
      searchName: `sinov taom ${belgi}`,
      price: 40_000_00n,
    },
    select: { id: true },
  });

  return { restaurantId: place.id, itemId: item.id };
}

describe.skipIf(!BAZA_BOR || TURKUM === null)("sotuvchi kabineti — o'z do'koni", () => {
  it('GET /seller/orders/[id] — RAQOBATCHI sotuvchi ocholmaydi', async () => {
    const ega = await sotuvchi();
    const { shopId, productId } = await dokon(ega);

    const mijoz = await xaridor();
    const order = await createMarketOrder(mijoz.userId, {
      shopId,
      addressId: await manzil(mijoz.userId),
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `k-${randomUUID()}`,
    });

    /*
      Raqobatchining ham o'z do'koni va MERCHANT roli bor — ya'ni
      rol tekshiruvi uni to'smaydi. To'sishi kerak bo'lgan yagona
      narsa — do'kon egasi sharti.
    */
    const raqobatchi = await sotuvchi();
    await dokon(raqobatchi);

    const javob = await chaqir(
      sellerGet,
      sorov('GET', `/api/v1/seller/orders/${order.id}`, { token: raqobatchi.token }),
      { id: order.id },
    );

    expect(javob.status).toBe(404);
  });

  it("PATCH /seller/orders/[id] — RAQOBATCHI holatni o'zgartira olmaydi", async () => {
    const ega = await sotuvchi();
    const { shopId, productId } = await dokon(ega);

    const mijoz = await xaridor();
    const order = await createMarketOrder(mijoz.userId, {
      shopId,
      addressId: await manzil(mijoz.userId),
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `k-${randomUUID()}`,
    });

    const raqobatchi = await sotuvchi();
    await dokon(raqobatchi);

    const holatOldin = (await prisma.marketOrder.findUnique({ where: { id: order.id }, select: { status: true } }))
      ?.status;

    const javob = await chaqir(
      sellerPatch,
      sorov('PATCH', `/api/v1/seller/orders/${order.id}`, {
        token: raqobatchi.token,
        body: { status: 'CANCELLED', reason: 'Raqobatchining urinishi' },
      }),
      { id: order.id },
    );

    expect(javob.status).toBe(404);

    const holatKeyin = (await prisma.marketOrder.findUnique({ where: { id: order.id }, select: { status: true } }))
      ?.status;

    expect(holatKeyin, "buyurtma holati o'zgardi").toBe(holatOldin);
  });

  it("GET /seller/orders/[id] — EGASI o'zinikini ocha oladi", async () => {
    /*
      Teskari tomondan tekshiruv: "hammaga 404" qaytaradigan kod
      ham yuqoridagi ikki sinovdan o'tardi.
    */
    const ega = await sotuvchi();
    const { shopId, productId } = await dokon(ega);

    const mijoz = await xaridor();
    const order = await createMarketOrder(mijoz.userId, {
      shopId,
      addressId: await manzil(mijoz.userId),
      items: [{ productId, quantity: 1 }],
      idempotencyKey: `k-${randomUUID()}`,
    });

    const javob = await chaqir(
      sellerGet,
      sorov('GET', `/api/v1/seller/orders/${order.id}`, { token: ega.token }),
      {
        id: order.id,
      },
    );

    expect(javob.status).toBe(200);
  });
});

describe.skipIf(!BAZA_BOR || TAOM_TURKUM === null)("restoran kabineti — o'z restorani", () => {
  it('GET /merchant/orders/[id] — RAQOBATCHI restoran ocholmaydi', async () => {
    const ega = await sotuvchi();
    const { restaurantId, itemId } = await restoran(ega);

    const mijoz = await xaridor();
    const order = await createFoodOrder(mijoz.userId, {
      restaurantId,
      addressId: await manzil(mijoz.userId),
      items: [{ menuItemId: itemId, quantity: 1 }],
      idempotencyKey: `k-${randomUUID()}`,
    });

    const raqobatchi = await sotuvchi();
    await restoran(raqobatchi);

    const javob = await chaqir(
      merchantGet,
      sorov('GET', `/api/v1/merchant/orders/${order.id}`, { token: raqobatchi.token }),
      { id: order.id },
    );

    expect(javob.status).toBe(404);
  });

  it("PATCH /merchant/orders/[id] — RAQOBATCHI holatni o'zgartira olmaydi", async () => {
    const ega = await sotuvchi();
    const { restaurantId, itemId } = await restoran(ega);

    const mijoz = await xaridor();
    const order = await createFoodOrder(mijoz.userId, {
      restaurantId,
      addressId: await manzil(mijoz.userId),
      items: [{ menuItemId: itemId, quantity: 1 }],
      idempotencyKey: `k-${randomUUID()}`,
    });

    const raqobatchi = await sotuvchi();
    await restoran(raqobatchi);

    const holatOldin = (await prisma.foodOrder.findUnique({ where: { id: order.id }, select: { status: true } }))
      ?.status;

    const javob = await chaqir(
      merchantPatch,
      sorov('PATCH', `/api/v1/merchant/orders/${order.id}`, {
        token: raqobatchi.token,
        body: { status: 'CANCELLED', reason: 'Raqobatchining urinishi' },
      }),
      { id: order.id },
    );

    expect(javob.status).toBe(404);

    const holatKeyin = (await prisma.foodOrder.findUnique({ where: { id: order.id }, select: { status: true } }))
      ?.status;

    expect(holatKeyin, "buyurtma holati o'zgardi").toBe(holatOldin);
  });

  it("GET /merchant/orders/[id] — EGASI o'zinikini ocha oladi", async () => {
    const ega = await sotuvchi();
    const { restaurantId, itemId } = await restoran(ega);

    const mijoz = await xaridor();
    const order = await createFoodOrder(mijoz.userId, {
      restaurantId,
      addressId: await manzil(mijoz.userId),
      items: [{ menuItemId: itemId, quantity: 1 }],
      idempotencyKey: `k-${randomUUID()}`,
    });

    const javob = await chaqir(
      merchantGet,
      sorov('GET', `/api/v1/merchant/orders/${order.id}`, { token: ega.token }),
      { id: order.id },
    );

    expect(javob.status).toBe(200);
  });
});
