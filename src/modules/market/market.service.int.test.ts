import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { ConflictError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { TIYIN_IN_SOM } from '@/lib/money';
import { cancelMarketOrder, createMarketOrder } from '@/modules/market/market.service';
import { topUp } from '@/modules/wallet/wallet.service';

/**
 * MARKETPLACE BUYURTMASI — pul va ZAXIRA sinovlari.
 *
 * ── Ovqatdan farqi: ZAXIRA ────────────────────────────────────────────
 * Restoranda taom "tugamaydi" — oshpaz yana tayyorlaydi. Do'konda esa
 * mahsulot SANOQLI: omborda 3 ta muzlatgich bo'lsa, 4-buyurtma
 * qabul qilinmasligi kerak.
 *
 * Bu — pul xatosidan ham ko'proq odamni ranjitadigan xato: pul
 * yechiladi, xabar "qabul qilindi" deydi, keyin do'kon qo'ng'iroq
 * qilib "kechirasiz, tugab qolibdi" deydi.
 *
 * Shuning uchun bu yerda ikki narsa tekshiriladi: pul TO'G'RI
 * yechiladimi va zaxira ORTIQCHA sotilmaydimi.
 */

const BAZA_BOR = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return true;
  } catch {
    return false;
  }
})();

/**
 * Variantsiz mahsulot — zaxirasi yetarli.
 *
 * Variantli mahsulot (rang, o'lcham) alohida qoidaga ega va uni shu
 * yerda aralashtirish sinovni o'qib bo'lmaydigan qilardi.
 */
const MAHSULOT = BAZA_BOR
  ? await prisma.product.findFirst({
      where: {
        isActive: true,
        stock: { gte: 6 },
        variants: { none: {} },
        shop: { isActive: true, isOpen: true },
      },
      select: {
        id: true,
        price: true,
        stock: true,
        shop: { select: { id: true, minOrder: true, deliveryFee: true } },
      },
    })
  : null;

const TAYYOR = BAZA_BOR && MAHSULOT !== null;

const yaratilganlar: string[] = [];

async function sinovOdam(): Promise<string> {
  const raqam = `+99895${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;

  const user = await prisma.user.create({
    data: { phone: raqam, firstName: 'Sinov', lastName: 'Bozor' },
    select: { id: true },
  });

  yaratilganlar.push(user.id);

  return user.id;
}

async function manzil(userId: string): Promise<string> {
  const address = await prisma.address.create({
    data: {
      userId,
      label: 'Uy',
      city: 'Toshkent',
      street: 'Amir Temur',
      latitude: 41.3111,
      longitude: 69.2797,
    },
    select: { id: true },
  });

  return address.id;
}

async function balans(userId: string): Promise<bigint> {
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });

  return wallet?.balance ?? 0n;
}

async function zaxira(): Promise<number> {
  const row = await prisma.product.findUnique({
    where: { id: MAHSULOT!.id },
    select: { stock: true },
  });

  return row?.stock ?? 0;
}

/** Hamyonni buyurtmadan ancha katta summa bilan to'ldiradi. */
async function boyOdam(): Promise<string> {
  const odam = await sinovOdam();
  const kerak = Number((MAHSULOT!.price * 4n + MAHSULOT!.shop.deliveryFee) / TIYIN_IN_SOM) + 100_000;

  await topUp(odam, { amount: kerak, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

  return odam;
}

/** Eng kam summani qoplaydigan son. */
function kerakliSon(): number {
  let son = 1n;

  while (MAHSULOT!.price * son < MAHSULOT!.shop.minOrder) son += 1n;

  return Number(son);
}

/** Buyurtmaning to'liq summasi. */
function jamiTiyin(son: number): bigint {
  return MAHSULOT!.price * BigInt(son) + MAHSULOT!.shop.deliveryFee;
}

/**
 * Bariyer — hamma ishtirokchi shu yerda uchrashadi.
 *
 * Izohi `wallet.lock.int.test.ts` da: usiz "bir vaqtda" degan sinov
 * amalda navbat bilan bajarilib, hech narsani o'lchamaydi.
 */
function bariyer(n: number): () => Promise<void> {
  let kelganlar = 0;
  let ochish: () => void = () => {};
  const eshik = new Promise<void>((resolve) => {
    ochish = resolve;
  });

  return async () => {
    kelganlar += 1;

    if (kelganlar >= n) ochish();

    await eshik;
  };
}

/** Sinov boshidagi zaxira — oxirida aynan shunga qaytariladi. */
const BOSHLANGICH_ZAXIRA = MAHSULOT?.stock ?? 0;

afterAll(async () => {
  if (!BAZA_BOR || yaratilganlar.length === 0) return;

  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: yaratilganlar } },
    select: { id: true },
  });

  await prisma.marketOrderItem.deleteMany({ where: { order: { userId: { in: yaratilganlar } } } });
  await prisma.marketOrder.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.walletTransaction.deleteMany({ where: { walletId: { in: wallets.map((w) => w.id) } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.address.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.notification.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: yaratilganlar } } });
  await prisma.user.deleteMany({ where: { id: { in: yaratilganlar } } });

  /*
    ZAXIRA TIKLANADI.

    Sinovlar haqiqiy katalogdan sotib oladi. Tiklamasak, har ishga
    tushirishda ombor kamayib borardi va bir kun sinovlar "zaxira
    yetmaydi" deb yiqilardi — sabab esa koddan emas, sinovning
    o'zidan bo'lardi.
  */
  if (MAHSULOT) {
    await prisma.product.update({
      where: { id: MAHSULOT.id },
      data: { stock: BOSHLANGICH_ZAXIRA },
    });
  }

  await prisma.$disconnect();
});

describe.skipIf(!TAYYOR)('marketplace buyurtmasi', () => {
  it('hamyondan AYNAN summa yechiladi va ZAXIRA kamayadi', async () => {
    const odam = await boyOdam();
    const son = kerakliSon();
    const oldinPul = await balans(odam);
    const oldinZaxira = await zaxira();

    await createMarketOrder(odam, {
      shopId: MAHSULOT!.shop.id,
      addressId: await manzil(odam),
      items: [{ productId: MAHSULOT!.id, quantity: son }],
      idempotencyKey: `k-${randomUUID()}`,
    });

    expect(oldinPul - (await balans(odam))).toBe(jamiTiyin(son));
    expect(await zaxira()).toBe(oldinZaxira - son);
  });

  it("ZAXIRADAN ko'p buyurtma rad etiladi", async () => {
    /*
      Omborda yo'q narsani sotish — pul xatosidan ham ko'proq
      ranjitadi: pul yechiladi, "qabul qilindi" deyiladi, keyin
      do'kon qo'ng'iroq qilib uzr so'raydi.
    */
    const odam = await boyOdam();
    const bor = await zaxira();
    const oldinPul = await balans(odam);

    await expect(
      createMarketOrder(odam, {
        shopId: MAHSULOT!.shop.id,
        addressId: await manzil(odam),
        items: [{ productId: MAHSULOT!.id, quantity: bor + 5 }],
        idempotencyKey: `k-${randomUUID()}`,
      }),
    ).rejects.toThrow();

    // Pul ham, zaxira ham tegilmagan.
    expect(await balans(odam)).toBe(oldinPul);
    expect(await zaxira()).toBe(bor);
  });

  it("mablag' yetmasa — buyurtma ham, zaxira ham tegilmaydi", async () => {
    const odam = await sinovOdam();
    await topUp(odam, { amount: 1_000, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });
    const oldinZaxira = await zaxira();

    await expect(
      createMarketOrder(odam, {
        shopId: MAHSULOT!.shop.id,
        addressId: await manzil(odam),
        items: [{ productId: MAHSULOT!.id, quantity: kerakliSon() }],
        idempotencyKey: `k-${randomUUID()}`,
      }),
    ).rejects.toThrow(ConflictError);

    expect(await balans(odam)).toBe(1_000n * TIYIN_IN_SOM);
    expect(await zaxira()).toBe(oldinZaxira);
    expect(await prisma.marketOrder.count({ where: { userId: odam } })).toBe(0);
  });

  it('BIR XIL kalit ikki marta — bitta buyurtma, zaxira bir marta kamayadi', async () => {
    const odam = await boyOdam();
    const kalit = `k-${randomUUID()}`;
    const addressId = await manzil(odam);
    const son = kerakliSon();
    const oldinZaxira = await zaxira();

    const birinchi = await createMarketOrder(odam, {
      shopId: MAHSULOT!.shop.id,
      addressId,
      items: [{ productId: MAHSULOT!.id, quantity: son }],
      idempotencyKey: kalit,
    });

    const ikkinchi = await createMarketOrder(odam, {
      shopId: MAHSULOT!.shop.id,
      addressId,
      items: [{ productId: MAHSULOT!.id, quantity: son }],
      idempotencyKey: kalit,
    });

    expect(ikkinchi.id).toBe(birinchi.id);
    expect(await zaxira()).toBe(oldinZaxira - son);
    expect(await prisma.marketOrder.count({ where: { userId: odam } })).toBe(1);
  });

  it('bekor qilinganda pul qaytadi va zaxira TIKLANADI', async () => {
    const odam = await boyOdam();
    const son = kerakliSon();
    const oldinPul = await balans(odam);
    const oldinZaxira = await zaxira();

    const order = await createMarketOrder(odam, {
      shopId: MAHSULOT!.shop.id,
      addressId: await manzil(odam),
      items: [{ productId: MAHSULOT!.id, quantity: son }],
      idempotencyKey: `k-${randomUUID()}`,
    });

    await cancelMarketOrder(odam, order.id, { reason: 'Sinov' });

    expect(await balans(odam)).toBe(oldinPul);
    expect(await zaxira()).toBe(oldinZaxira);
  });

  /*
    ── NIMA QAMRAB OLINMAGAN: eng kam buyurtma summasi ─────────────────
    Do'konning eng kam summasi tekshiruvi bu yerda sinalmaydi va bu
    ATAYLAB qoldirilgan bo'shliq emas — uni yaratib bo'lmadi.

    Sabab o'lchandi: katalogda narxi o'z do'konining eng kam
    summasidan PAST bo'lgan birorta mahsulot yo'q. Ya'ni bitta
    mahsulot ham allaqachon chegarani qoplaydi va rad etiladigan
    holatni haqiqiy ma'lumot bilan yasab bo'lmaydi.

    Soxta mahsulot yaratib sinash mumkin edi, lekin unda sinov
    katalogdan uzilib qolardi. Bu qoida ovqat modulida (bir xil
    mantiq) qamrab olingan: `food.service.int.test.ts`.

    Katalogga arzon mahsulot qo'shilsa — shu yerga sinov yoziladi.
  */
});

describe.skipIf(!TAYYOR)('zaxira va bir vaqtdalik', () => {
  it('bir vaqtda kelgan buyurtmalar ZAXIRADAN ortiq sotmaydi', async () => {
    /*
      ── Eng muhim sinov ──────────────────────────────────────────────
      Chegirma boshlanganda o'nlab odam bir vaqtda "Sotib olish"
      tugmasini bosadi. Zaxira tekshiruvi oddiy "o'qi, keyin yoz"
      bo'lsa, hammasi "bor" deb ko'radi va omborda yo'q narsa
      sotiladi.

      Bu yerda zaxira ATAYLAB kichkina qilinadi: 2 ta. Keyin 5 ta
      odam bir vaqtda bittadan buyurtma beradi. Atigi 2 tasi
      o'tishi kerak.
    */
    const son = 1;
    const odamlar = await Promise.all(Array.from({ length: 5 }, () => boyOdam()));
    const manzillar = await Promise.all(odamlar.map((o) => manzil(o)));

    // Do'kon eng kam summasi yo'lda to'sib qo'ymasligi uchun uni vaqtincha nolga tushiramiz.
    const shop = await prisma.shop.findUniqueOrThrow({
      where: { id: MAHSULOT!.shop.id },
      select: { minOrder: true },
    });

    await prisma.shop.update({ where: { id: MAHSULOT!.shop.id }, data: { minOrder: 0 } });
    await prisma.product.update({ where: { id: MAHSULOT!.id }, data: { stock: 2 } });

    const uchrashuv = bariyer(odamlar.length);

    const natijalar = await Promise.allSettled(
      odamlar.map(async (odam, i) => {
        await uchrashuv();

        return createMarketOrder(odam, {
          shopId: MAHSULOT!.shop.id,
          addressId: manzillar[i]!,
          items: [{ productId: MAHSULOT!.id, quantity: son }],
          idempotencyKey: `k-${randomUUID()}`,
        });
      }),
    );

    const otdi = natijalar.filter((r) => r.status === 'fulfilled').length;

    // Do'kon sozlamasini qaytaramiz.
    await prisma.shop.update({ where: { id: MAHSULOT!.shop.id }, data: { minOrder: shop.minOrder } });

    expect(otdi).toBe(2);

    // Zaxira MANFIY bo'lmasligi shart.
    const qolgan = await zaxira();

    expect(qolgan).toBe(0);
    expect(qolgan >= 0).toBe(true);
  });
});
