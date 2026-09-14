import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { ConflictError, ValidationError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { TIYIN_IN_SOM } from '@/lib/money';
import { cancelFoodOrder, createFoodOrder } from '@/modules/food/food.service';
import { topUp } from '@/modules/wallet/wallet.service';

/**
 * OVQAT BUYURTMASI — pul harakati sinovlari.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Ovqat buyurtmasi ham hamyondan pul yechadi. Hamyon moduli endi
 * qo'riqlangan, lekin BUYURTMA tomonidagi qarorlar — "savat summasi
 * yetarlimi", "taom hali mavjudmi", "bekor qilinganda pul qaytadimi" —
 * hali ham sinovsiz edi.
 *
 * ── Ma'lumot BAZADAN olinadi ──────────────────────────────────────────
 * Restoran va taomlar sinov ichida yasalmaydi: ular reyestrda turadi va
 * har birining o'z narxi, yetkazish haqi va eng kam buyurtma summasi
 * bor. Qo'lda yozsak, ertaga reyestr o'zgarganda sinov haqiqatdan
 * uzilib qolardi.
 */

const BAZA_BOR = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return true;
  } catch {
    return false;
  }
})();

/** Ochiq restoran va uning mavjud taomlari. */
const RESTORAN = BAZA_BOR
  ? await prisma.restaurant.findFirst({
      where: { isActive: true, isOpen: true, items: { some: { isAvailable: true } } },
      select: {
        id: true,
        name: true,
        deliveryFee: true,
        minOrder: true,
        items: {
          where: { isAvailable: true },
          select: { id: true, price: true },
          orderBy: { price: 'desc' },
        },
      },
    })
  : null;

const TAYYOR = BAZA_BOR && RESTORAN !== null && RESTORAN.items.length > 0;

const yaratilganlar: string[] = [];

async function sinovOdam(): Promise<string> {
  const raqam = `+99894${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;

  const user = await prisma.user.create({
    data: { phone: raqam, firstName: 'Sinov', lastName: 'Ovqat' },
    select: { id: true },
  });

  yaratilganlar.push(user.id);

  return user.id;
}

/** Yetkazish manzili — buyurtma uchun majburiy. */
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

async function pulQoy(userId: string, som: number): Promise<void> {
  await topUp(userId, { amount: som, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });
}

/**
 * Eng kam buyurtmani qoplaydigan SON.
 *
 * Restoranning eng kam summasi taom narxidan katta bo'lishi mumkin,
 * shuning uchun son hisoblab olinadi — qo'lda "2 ta" deb yozilsa,
 * boshqa restoran uchun yetmay qolardi.
 */
function kerakliSon(): number {
  const narx = RESTORAN!.items[0]!.price;
  const eng_kam = RESTORAN!.minOrder;

  let son = 1n;
  while (narx * son < eng_kam) son += 1n;

  return Number(son);
}

/** Eng ARZON taom — eng kam summa tekshiruvi uchun. */
function engArzon(): { id: string; price: bigint } {
  return RESTORAN!.items[RESTORAN!.items.length - 1]!;
}

/** Buyurtmaning to'liq summasi — taomlar + yetkazish. */
function jamiTiyin(son: number): bigint {
  return RESTORAN!.items[0]!.price * BigInt(son) + RESTORAN!.deliveryFee;
}

afterAll(async () => {
  if (!BAZA_BOR || yaratilganlar.length === 0) return;

  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: yaratilganlar } },
    select: { id: true },
  });

  await prisma.foodOrderItem.deleteMany({
    where: { order: { userId: { in: yaratilganlar } } },
  });
  await prisma.foodOrder.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.walletTransaction.deleteMany({ where: { walletId: { in: wallets.map((w) => w.id) } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.address.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.notification.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: yaratilganlar } } });
  await prisma.user.deleteMany({ where: { id: { in: yaratilganlar } } });

  await prisma.$disconnect();
});

describe.skipIf(!TAYYOR)('ovqat buyurtmasi', () => {
  it('hamyondan AYNAN buyurtma summasi yechiladi', async () => {
    /*
      Yetkazish haqi ham hisobga olinishi SHART. Faqat taomlar
      summasi yechilsa, restoran yetkazish pulini olmay qolardi va
      farqni oylar o'tib hisobotdan topardik.
    */
    const odam = await sinovOdam();
    await pulQoy(odam, 500_000);
    const son = kerakliSon();

    const oldin = await balans(odam);

    await createFoodOrder(odam, {
      restaurantId: RESTORAN!.id,
      addressId: await manzil(odam),
      items: [{ menuItemId: RESTORAN!.items[0]!.id, quantity: son }],
      idempotencyKey: `k-${randomUUID()}`,
    });

    expect(oldin - (await balans(odam))).toBe(jamiTiyin(son));
  });

  it("mablag' yetmasa — buyurtma ham, yozuv ham bo'lmaydi", async () => {
    /*
      Yarim bajarilgan buyurtma (yozuv bor, pul yo'q) eng yomon
      holat: kuryer yo'lga chiqadi, restoran taom tayyorlaydi,
      lekin pul kelmagan.
    */
    const odam = await sinovOdam();
    await pulQoy(odam, 1_000);

    await expect(
      createFoodOrder(odam, {
        restaurantId: RESTORAN!.id,
        addressId: await manzil(odam),
        items: [{ menuItemId: RESTORAN!.items[0]!.id, quantity: kerakliSon() }],
        idempotencyKey: `k-${randomUUID()}`,
      }),
    ).rejects.toThrow(ConflictError);

    expect(await balans(odam)).toBe(1_000n * TIYIN_IN_SOM);
    expect(await prisma.foodOrder.count({ where: { userId: odam } })).toBe(0);
  });

  it('BIR XIL kalit ikki marta — bitta buyurtma, pul bir marta', async () => {
    /*
      Sekin internetda "yuborilmadi" degan xato chiqadi va odam
      qaytadan bosadi. Ikkita buyurtma ketsa, ikki marta taom
      keladi va ikki marta pul yechiladi.
    */
    const odam = await sinovOdam();
    await pulQoy(odam, 500_000);
    const kalit = `k-${randomUUID()}`;
    const addressId = await manzil(odam);
    const son = kerakliSon();

    const birinchi = await createFoodOrder(odam, {
      restaurantId: RESTORAN!.id,
      addressId,
      items: [{ menuItemId: RESTORAN!.items[0]!.id, quantity: son }],
      idempotencyKey: kalit,
    });

    const ikkinchi = await createFoodOrder(odam, {
      restaurantId: RESTORAN!.id,
      addressId,
      items: [{ menuItemId: RESTORAN!.items[0]!.id, quantity: son }],
      idempotencyKey: kalit,
    });

    expect(ikkinchi.id).toBe(birinchi.id);
    expect(await prisma.foodOrder.count({ where: { userId: odam } })).toBe(1);
  });

  it('eng kam summadan PAST buyurtma rad etiladi', async () => {
    /*
      Restoran eng kam buyurtma summasini belgilaydi. Tekshiruvsiz
      bitta somsaga kuryer yuborilardi — yetkazish haqi taom
      narxidan qimmat bo'lardi.

      ── Nima uchun eng ARZON taom ────────────────────────────────────
      Birinchi yozgan variantim eng QIMMAT taomni olib, "agar u
      allaqachon eng kam summani qoplasa — sinovni o'tkazib yubor"
      degan edi. Bazadagi ma'lumotda u har safar o'tkazib yuborilardi:
      sinov bor ko'rinardi, lekin HECH NARSANI tekshirmasdi.

      Eng arzon taom esa hamma restoranda eng kam summadan past —
      demak sinov har doim ishlaydi.
    */
    const odam = await sinovOdam();
    await pulQoy(odam, 500_000);
    const arzon = engArzon();

    // Shart haqiqatan bajarilayotganini tasdiqlaymiz.
    expect(arzon.price).toBeLessThan(RESTORAN!.minOrder);

    await expect(
      createFoodOrder(odam, {
        restaurantId: RESTORAN!.id,
        addressId: await manzil(odam),
        items: [{ menuItemId: arzon.id, quantity: 1 }],
        idempotencyKey: `k-${randomUUID()}`,
      }),
    ).rejects.toThrow(ValidationError);

    expect(await prisma.foodOrder.count({ where: { userId: odam } })).toBe(0);
  });

  it("bekor qilinganda pul TO'LIQ qaytadi", async () => {
    const odam = await sinovOdam();
    await pulQoy(odam, 500_000);
    const oldin = await balans(odam);

    const order = await createFoodOrder(odam, {
      restaurantId: RESTORAN!.id,
      addressId: await manzil(odam),
      items: [{ menuItemId: RESTORAN!.items[0]!.id, quantity: kerakliSon() }],
      idempotencyKey: `k-${randomUUID()}`,
    });

    expect(await balans(odam)).toBeLessThan(oldin);

    await cancelFoodOrder(odam, order.id, { reason: 'Sinov' });

    expect(await balans(odam)).toBe(oldin);
  });

  it("IKKI MARTA bekor qilib bo'lmaydi", async () => {
    /*
      Ikkinchi bekor qilish o'tib ketsa, pul ikki marta qaytardi —
      ya'ni yo'qdan bor bo'lardi.
    */
    const odam = await sinovOdam();
    await pulQoy(odam, 500_000);
    const oldin = await balans(odam);

    const order = await createFoodOrder(odam, {
      restaurantId: RESTORAN!.id,
      addressId: await manzil(odam),
      items: [{ menuItemId: RESTORAN!.items[0]!.id, quantity: kerakliSon() }],
      idempotencyKey: `k-${randomUUID()}`,
    });

    await cancelFoodOrder(odam, order.id, { reason: 'Birinchi' });

    await expect(cancelFoodOrder(odam, order.id, { reason: 'Ikkinchi' })).rejects.toThrow(ConflictError);

    expect(await balans(odam)).toBe(oldin);
  });
});
