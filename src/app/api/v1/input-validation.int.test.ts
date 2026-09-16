import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { MAX_TOP_UP_SOM, MIN_TOP_UP_SOM, TIYIN_IN_SOM } from '@/lib/money';
import { MAX_QUANTITY_PER_LINE } from '@/config/cart';
import { balans, chaqir, sinovOdam, sorov, tozala, type SinovOdam } from '@/test/api-harness';
import { topUp } from '@/modules/wallet/wallet.service';

import { POST as topUpRoute } from '@/app/api/v1/wallet/topup/route';
import { POST as marketOrderRoute } from '@/app/api/v1/market/orders/route';
import { GET as parcelGet } from '@/app/api/v1/parcels/[id]/route';

/**
 * KIRITILGAN MA'LUMOT tekshiruvi — yo'l darajasida.
 *
 * ── Nima uchun sxema sinovlari yetarli emas ───────────────────────────
 * Sxemalar (`*.schemas.ts`) alohida sinalgan va ular yaxshi yozilgan.
 * Lekin sxema — bu qog'ozdagi qoida. Savol boshqa: yo'l uni HAQIQATAN
 * qo'llaydimi, va qoida buzilganda nima bo'ladi?
 *
 * Bu yerda ikki narsa tekshiriladi:
 *
 *   1. Mijoz NARXNI o'zi belgilay olmaydi. Brauzerdan istalgan maydon
 *      yuborish mumkin — `totalTiyin: 1` deb yozib, mahsulotni bir
 *      tiyinga olishga urinish eng oddiy hujum.
 *
 *   2. Yaroqsiz kiritish 400 beradi, 500 EMAS. Farqi katta: 400 —
 *      "siz noto'g'ri yubordingiz", 500 — "bizda nimadir sindi".
 *      500 bo'lsa, xato jurnalga yoziladi va haqiqiy nosozliklar
 *      soxta yozuvlar orasida ko'rinmay qoladi.
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

/** Sinov yaratgan do'kon — boshqa sinovlar bilan to'qnashmaslik uchun o'ziniki. */
const DOKON =
  BAZA_BOR && TURKUM !== null
    ? await (async () => {
        const belgi = randomUUID().slice(0, 8);

        const shop = await prisma.shop.create({
          data: {
            slug: `sinov-dokon-${belgi}`,
            name: `Sinov do'koni ${belgi}`,
            description: 'Kiritish tekshiruvi sinovi uchun',
            searchName: `sinov dokon ${belgi}`,
            deliveryFee: 0n,
            minOrder: 0n,
            deliveryDays: 1,
            color: '#0ea5e9',
          },
          select: { id: true },
        });

        const product = await prisma.product.create({
          data: {
            shopId: shop.id,
            categoryId: TURKUM.id,
            slug: `sinov-mahsulot-${belgi}`,
            name: `Sinov mahsuloti ${belgi}`,
            searchName: `sinov mahsulot ${belgi}`,
            price: 50_000_00n,
            stock: 500,
          },
          select: { id: true, price: true },
        });

        return { shopId: shop.id, productId: product.id, narx: product.price };
      })()
    : null;

const TAYYOR = BAZA_BOR && DOKON !== null;

afterAll(async () => {
  if (!BAZA_BOR) return;

  await tozala();

  if (DOKON) {
    await prisma.product.deleteMany({ where: { shopId: DOKON.shopId } });
    await prisma.shop.deleteMany({ where: { id: DOKON.shopId } });
  }

  await prisma.$disconnect();
});

async function xaridor(som = 1_000_000): Promise<SinovOdam> {
  const odam = await sinovOdam();

  await topUp(odam.userId, { amount: som, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

  return odam;
}

async function manzil(userId: string): Promise<string> {
  const address = await prisma.address.create({
    data: { userId, label: 'Uy', city: 'Toshkent', street: 'Amir Temur', latitude: 41.3111, longitude: 69.2797 },
    select: { id: true },
  });

  return address.id;
}

/** Bozor buyurtmasi so'rovi — qo'shimcha maydonlar bilan to'ldirish mumkin. */
async function buyurtmaSorovi(odam: SinovOdam, qoshimcha: Record<string, unknown> = {}, quantity: unknown = 1) {
  return chaqir(
    marketOrderRoute,
    sorov('POST', '/api/v1/market/orders', {
      token: odam.token,
      body: {
        shopId: DOKON!.shopId,
        addressId: await manzil(odam.userId),
        items: [{ productId: DOKON!.productId, quantity }],
        idempotencyKey: `k-${randomUUID()}`,
        ...qoshimcha,
      },
    }),
  );
}

describe.skipIf(!TAYYOR)('mijoz NARXNI belgilay olmaydi', () => {
  it("so'rovga yozilgan `totalTiyin` E'TIBORGA OLINMAYDI", async () => {
    /*
      ── Eng oddiy hujum ─────────────────────────────────────────────
      Brauzerda so'rovni ko'chirib, tanasiga `totalTiyin: 1` qo'shib
      yuborish — buning uchun hech qanday bilim kerak emas.

      Agar server shu qiymatni ishlatsa, 500 000 so'mlik mahsulot
      bir tiyinga ketardi va buni faqat oylik hisobotda payqardik.

      Zod sxemasi notanish maydonlarni TASHLAB yuboradi — narx esa
      serverda mahsulot reyestridan olinadi.
    */
    const odam = await xaridor();
    const oldin = await balans(odam.userId);

    const javob = await buyurtmaSorovi(odam, { totalTiyin: 1, priceTiyin: 1, deliveryFeeTiyin: 0 });

    expect(javob.status).toBe(201);

    // Hamyondan AYNAN haqiqiy narx yechilgan bo'lishi kerak.
    expect(oldin - (await balans(odam.userId))).toBe(DOKON!.narx);
  });

  it("so'rovga yozilgan `status` E'TIBORGA OLINMAYDI", async () => {
    /*
      `status: 'DELIVERED'` yuborib, buyurtmani "yetkazilgan" qilib
      ko'rsatish — sotuvchini chalg'itish va qaytarishni to'sish
      uchun ishlatilishi mumkin.
    */
    const odam = await xaridor();

    const javob = await buyurtmaSorovi(odam, { status: 'DELIVERED' });

    expect(javob.status).toBe(201);

    const order = await prisma.marketOrder.findFirst({
      where: { userId: odam.userId },
      select: { status: true },
    });

    expect(order?.status, 'mijoz holatni o`zi belgiladi').not.toBe('DELIVERED');
  });

  it("so'rovga yozilgan `userId` E'TIBORGA OLINMAYDI", async () => {
    /*
      Buyurtmani BOSHQA odam nomiga yozdirishga urinish: agar
      o'tib ketsa, pul o'zinikidan yechilib, buyurtma begonaga
      yozilardi (yoki teskarisi).
    */
    const odam = await xaridor();
    const begona = await xaridor();

    const javob = await buyurtmaSorovi(odam, { userId: begona.userId });

    expect(javob.status).toBe(201);
    expect(await prisma.marketOrder.count({ where: { userId: begona.userId } })).toBe(0);
    expect(await prisma.marketOrder.count({ where: { userId: odam.userId } })).toBe(1);
  });
});

describe.skipIf(!TAYYOR)('yaroqsiz SON — 400 va pul qimirlamaydi', () => {
  const yomonSonlar: ReadonlyArray<{ nom: string; qiymat: unknown }> = [
    { nom: 'nol', qiymat: 0 },
    { nom: 'manfiy', qiymat: -1 },
    { nom: 'manfiy katta', qiymat: -1_000_000 },
    { nom: 'kasr', qiymat: 1.5 },
    { nom: 'chegaradan katta', qiymat: MAX_QUANTITY_PER_LINE + 1 },
    { nom: 'juda katta', qiymat: 2 ** 40 },
    { nom: 'satr', qiymat: '3' },
    { nom: 'null', qiymat: null },
    { nom: 'massiv', qiymat: [1] },
  ];

  for (const { nom, qiymat } of yomonSonlar) {
    it(`son ${nom} bo'lsa — buyurtma ham, pul harakati ham bo'lmaydi`, async () => {
      const odam = await xaridor();
      const oldin = await balans(odam.userId);

      const javob = await buyurtmaSorovi(odam, {}, qiymat);

      expect(javob.status, `${nom} qabul qilindi`).toBe(400);
      expect(await balans(odam.userId), 'pul yechildi').toBe(oldin);
      expect(await prisma.marketOrder.count({ where: { userId: odam.userId } })).toBe(0);
    });
  }
});

describe.skipIf(!BAZA_BOR)("hamyon to'ldirish summasi", () => {
  const yomonSummalar: ReadonlyArray<{ nom: string; qiymat: unknown }> = [
    { nom: 'manfiy', qiymat: -100_000 },
    { nom: 'nol', qiymat: 0 },
    { nom: 'eng kam chegaradan past', qiymat: MIN_TOP_UP_SOM - 1 },
    { nom: 'eng ko`p chegaradan yuqori', qiymat: MAX_TOP_UP_SOM + 1 },
    { nom: 'kasr', qiymat: 10_000.5 },
    { nom: 'satr', qiymat: '50000' },
    { nom: 'cheksizlik', qiymat: 1e308 * 10 },
  ];

  for (const { nom, qiymat } of yomonSummalar) {
    it(`summa ${nom} bo'lsa — balans o'zgarmaydi`, async () => {
      /*
        Manfiy summa eng xavflisi: "to'ldirish" o'rniga hamyonni
        MINUSGA olib ketardi, yoki teskarisi — cheksiz pul.
      */
      const odam = await sinovOdam();
      const oldin = await balans(odam.userId);

      const javob = await chaqir(
        topUpRoute,
        sorov('POST', '/api/v1/wallet/topup', {
          token: odam.token,
          body: { amount: qiymat, method: 'CARD', idempotencyKey: `k-${randomUUID()}` },
        }),
      );

      expect(javob.status, `${nom} qabul qilindi`).toBe(400);
      expect(await balans(odam.userId), "balans o'zgardi").toBe(oldin);
    });
  }

  it("to'g'ri summa esa ISHLAYDI", async () => {
    // Teskari tekshiruv: "hammaga 400" qaytaradigan kod ham yuqoridagilardan o'tardi.
    const odam = await sinovOdam();

    const javob = await chaqir(
      topUpRoute,
      sorov('POST', '/api/v1/wallet/topup', {
        token: odam.token,
        body: { amount: 50_000, method: 'CARD', idempotencyKey: `k-${randomUUID()}` },
      }),
    );

    expect(javob.status).toBe(201);
    expect(await balans(odam.userId)).toBe(50_000n * TIYIN_IN_SOM);
  });
});

describe.skipIf(!BAZA_BOR)('buzuq so`rov — 400, 500 EMAS', () => {
  /*
    ── Nima uchun 500 ALOHIDA muammo ─────────────────────────────────
    500 har safar xato jurnaliga yoziladi. Ya'ni istalgan odam
    buzuq so'rov yuborib, jurnalni to'ldirib tashlashi mumkin —
    va haqiqiy nosozlik o'sha axlat orasida ko'rinmay qolardi.
  */

  it('yaroqsiz UUID manzilda — 400 (server xatosi emas)', async () => {
    const odam = await sinovOdam();

    const javob = await chaqir(parcelGet, sorov('GET', '/api/v1/parcels/emas-uuid', { token: odam.token }), {
      id: 'emas-uuid',
    });

    expect(javob.status).toBe(400);
  });

  it('TANASIZ so`rov — 400', async () => {
    const odam = await sinovOdam();

    const javob = await chaqir(topUpRoute, sorov('POST', '/api/v1/wallet/topup', { token: odam.token }));

    expect(javob.status).toBe(400);
  });

  it('BUZUQ JSON — 400', async () => {
    const odam = await sinovOdam();

    /* Tana qo'lda yoziladi: `sorov()` har doim to'g'ri JSON yasaydi. */
    const request = sorov('POST', '/api/v1/wallet/topup', { token: odam.token, body: {} });

    const buzuq = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: '{"amount": 5000,',
    });

    const javob = await chaqir(topUpRoute, buzuq as Parameters<typeof chaqir>[1]);

    expect(javob.status).toBe(400);
  });

  it('notanish `method` qiymati — 400', async () => {
    const odam = await sinovOdam();

    const javob = await chaqir(
      topUpRoute,
      sorov('POST', '/api/v1/wallet/topup', {
        token: odam.token,
        body: { amount: 50_000, method: 'BEPUL_PUL', idempotencyKey: `k-${randomUUID()}` },
      }),
    );

    expect(javob.status).toBe(400);
    expect(await balans(odam.userId)).toBe(0n);
  });
});
