import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { ConflictError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { TIYIN_IN_SOM } from '@/lib/money';
import { calculateTaxiFare, routeDistanceKm } from '@/modules/taxi/taxi.pricing';
import {
  acceptRide,
  advanceRide,
  cancelRide,
  completeRide,
  createRide,
  setDriverOnline,
} from '@/modules/taxi/taxi.service';
import { topUp } from '@/modules/wallet/wallet.service';

/**
 * TAKSI — pul harakati sinovlari.
 *
 * ── Taksining boshqa modullardan farqi: UCH TOMON ─────────────────────
 * Ovqat va bozorda pul bir yo'nalishda ketadi: mijozdan ilovaga.
 * Taksida esa uch tomon bor:
 *
 *   mijoz  ->  [ilova]  ->  haydovchi
 *
 * Mijozdan `priceTiyin` yechiladi, haydovchiga `driverFeeTiyin`
 * yoziladi, farqi — ilovaning ulushi (komissiya).
 *
 * Shuning uchun bu yerda eng muhim tekshiruv — PUL YO'QOLMAYDI:
 * mijozning kamaygani = haydovchining ko'paygani + komissiya.
 * Agar bu tenglik buzilsa, pul yo'qdan bor bo'lgan yoki yo'qolgan
 * bo'ladi va buni oylab payqamaslik mumkin.
 *
 * Nima uchun soxta baza emasligi `wallet.service.int.test.ts` da.
 */

const BAZA_BOR = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return true;
  } catch {
    return false;
  }
})();

const yaratilganlar: string[] = [];

/** Toshkent markazi — ikki nuqta orasi ~3 km. */
const QAYERDAN = { latitude: 41.3111, longitude: 69.2797 };
const QAYERGA = { latitude: 41.3275, longitude: 69.2817 };
const TARIF = 'ECONOM' as const;

/** Safar narxi — kod HISOBLAGAN qiymat, qo'lda yozilgan emas. */
const MASOFA = routeDistanceKm(QAYERDAN, QAYERGA);
const NARX = calculateTaxiFare(TARIF, MASOFA);

async function sinovOdam(prefix: string): Promise<string> {
  const raqam = `+9989${prefix}${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;

  const user = await prisma.user.create({
    data: { phone: raqam, firstName: 'Sinov', lastName: 'Taksi' },
    select: { id: true },
  });

  yaratilganlar.push(user.id);

  return user.id;
}

/** Hamyoni to'ldirilgan yo'lovchi. */
async function yolovchi(som = 200_000): Promise<string> {
  const odam = await sinovOdam('7');

  await topUp(odam, { amount: som, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

  return odam;
}

/** Onlayn haydovchi — safarni qabul qila oladigan holatda. */
async function haydovchi(): Promise<string> {
  const odam = await sinovOdam('8');

  await prisma.taxiDriver.create({
    data: {
      userId: odam,
      carModel: 'Cobalt',
      carColor: 'Oq',
      plateNumber: `01${Math.floor(100 + Math.random() * 899)}SIN`,
      tariff: TARIF,
    },
  });

  await setDriverOnline(odam, { isOnline: true });

  return odam;
}

async function balans(userId: string): Promise<bigint> {
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });

  return wallet?.balance ?? 0n;
}

/** Safar buyurtmasi — bir xil marshrut, har safar yangi kalit. */
async function safarBuyurtma(userId: string, kalit = `k-${randomUUID()}`) {
  return createRide(userId, {
    tariff: TARIF,
    fromLat: QAYERDAN.latitude,
    fromLng: QAYERDAN.longitude,
    fromAddress: "Amir Temur ko'chasi, 1",
    toLat: QAYERGA.latitude,
    toLng: QAYERGA.longitude,
    toAddress: "Navoiy ko'chasi, 40",
    idempotencyKey: kalit,
  });
}

afterAll(async () => {
  if (!BAZA_BOR || yaratilganlar.length === 0) return;

  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: yaratilganlar } },
    select: { id: true },
  });

  /*
    Safarlar IKKI tomondan bog'langan: yo'lovchi va haydovchi.

    Avval faqat `riderId` bo'yicha o'chirgandim. Haydovchi tomonidagi
    yozuv qolib ketardi va foydalanuvchini o'chirish tashqi kalitga
    urilib yiqilardi — natijada bazada sinov qoldiqlari to'planardi.
    Buni o'lchab topdim: mutatsiya sinovlaridan keyin bazada 6 ta
    sinov foydalanuvchisi qolib ketgan edi.
  */
  const drivers = await prisma.taxiDriver.findMany({
    where: { userId: { in: yaratilganlar } },
    select: { id: true },
  });

  await prisma.taxiRide.deleteMany({
    where: {
      OR: [{ riderId: { in: yaratilganlar } }, { driverId: { in: drivers.map((d) => d.id) } }],
    },
  });
  await prisma.taxiDriver.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.walletTransaction.deleteMany({ where: { walletId: { in: wallets.map((w) => w.id) } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.notification.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: yaratilganlar } } });
  await prisma.user.deleteMany({ where: { id: { in: yaratilganlar } } });

  await prisma.$disconnect();
});

describe.skipIf(!BAZA_BOR)('safar buyurtmasi', () => {
  it('hamyondan AYNAN hisoblangan narx yechiladi', async () => {
    /*
      Narx sinovda qo'lda yozilmaydi — `calculateTaxiFare` dan
      olinadi. Aks holda tarif o'zgarganda sinov yiqilardi va sabab
      koddan emas, sinovning eskirganidan bo'lardi.
    */
    const odam = await yolovchi();
    const oldin = await balans(odam);

    await safarBuyurtma(odam);

    expect(oldin - (await balans(odam))).toBe(BigInt(NARX.priceTiyin));
  });

  it("mablag' yetmasa — safar ham, yozuv ham bo'lmaydi", async () => {
    /*
      Yarim yaratilgan safar eng yomon holat: haydovchi yo'lga
      chiqadi, lekin pul olinmagan.
    */
    const odam = await yolovchi(1_000);

    await expect(safarBuyurtma(odam)).rejects.toThrow(ConflictError);

    expect(await balans(odam)).toBe(1_000n * TIYIN_IN_SOM);
    expect(await prisma.taxiRide.count({ where: { riderId: odam } })).toBe(0);
  });

  it('BIR XIL kalit ikki marta — bitta safar, pul bir marta', async () => {
    /*
      Tarmoq uzilganda mijoz tugmani ikkinchi marta bosadi. Kalitsiz
      ikkinchi safar yaratilardi va undan ikkinchi marta pul
      yechilardi — mashina esa bitta kelardi.
    */
    const odam = await yolovchi();
    const kalit = `k-${randomUUID()}`;
    const oldin = await balans(odam);

    const birinchi = await safarBuyurtma(odam, kalit);
    const ikkinchi = await safarBuyurtma(odam, kalit);

    expect(ikkinchi.id).toBe(birinchi.id);
    expect(oldin - (await balans(odam))).toBe(BigInt(NARX.priceTiyin));
    expect(await prisma.taxiRide.count({ where: { riderId: odam } })).toBe(1);
  });

  it("bekor qilinganda pul TO'LIQ qaytadi", async () => {
    const odam = await yolovchi();
    const oldin = await balans(odam);

    const safar = await safarBuyurtma(odam);

    expect(await balans(odam)).toBeLessThan(oldin);

    await cancelRide(odam, safar.id, { reason: 'Sinov' });

    expect(await balans(odam)).toBe(oldin);
  });

  it("IKKI MARTA bekor qilib bo'lmaydi", async () => {
    const odam = await yolovchi();
    const oldin = await balans(odam);

    const safar = await safarBuyurtma(odam);

    await cancelRide(odam, safar.id, { reason: 'Birinchi' });

    await expect(cancelRide(odam, safar.id, { reason: 'Ikkinchi' })).rejects.toThrow(ConflictError);

    // Pul FAQAT bir marta qaytgan.
    expect(await balans(odam)).toBe(oldin);
  });
});

describe.skipIf(!BAZA_BOR)('haydovchi va uch tomonlama hisob', () => {
  it("yakunlanganda haydovchiga AYNAN o'z ulushi yoziladi", async () => {
    const mijoz = await yolovchi();
    const shofyor = await haydovchi();

    const safar = await safarBuyurtma(mijoz);

    await acceptRide(shofyor, safar.id);
    await advanceRide(shofyor, safar.id, 'ARRIVED');
    await advanceRide(shofyor, safar.id, 'START');

    const shofyorOldin = await balans(shofyor);

    await completeRide(shofyor, safar.id);

    expect((await balans(shofyor)) - shofyorOldin).toBe(BigInt(NARX.driverFeeTiyin));
  });

  it("PUL YO'QOLMAYDI: mijozning chiqimi = haydovchi ulushi + komissiya", async () => {
    /*
      ── Bu fayldagi eng muhim sinov ──────────────────────────────────
      Uch tomonli hisobda eng oson yo'qoladigan narsa — tenglik.
      Mijozdan yechilgan summa haydovchiga yozilgan summa va ilova
      ulushining YIG'INDISIGA teng bo'lishi shart.

      Agar tenglik buzilsa: yo ilova o'z hisobidan qo'shimcha
      to'layapti, yo mijozning puli hech qayerga ketmay yo'qolayapti.
      Ikkalasi ham hisobotdan oylar o'tib topiladi.
    */
    const mijoz = await yolovchi();
    const shofyor = await haydovchi();

    const mijozOldin = await balans(mijoz);
    const shofyorOldin = await balans(shofyor);

    const safar = await safarBuyurtma(mijoz);

    await acceptRide(shofyor, safar.id);
    await advanceRide(shofyor, safar.id, 'ARRIVED');
    await advanceRide(shofyor, safar.id, 'START');
    await completeRide(shofyor, safar.id);

    const mijozChiqim = mijozOldin - (await balans(mijoz));
    const shofyorKirim = (await balans(shofyor)) - shofyorOldin;
    const komissiya = BigInt(NARX.priceTiyin) - BigInt(NARX.driverFeeTiyin);

    expect(mijozChiqim).toBe(shofyorKirim + komissiya);

    // Komissiya MANFIY bo'lmasligi shart: ilova zarar ko'rib ishlamaydi.
    expect(komissiya >= 0n).toBe(true);
  });

  it("boshlangan safarni BEKOR qilib bo'lmaydi", async () => {
    /*
      Mashina yo'lda, hisoblagich ishlayapti. Bu paytda bekor
      qilishga ruxsat berilsa, mijoz manzilga yetib olib pulni
      qaytarib olardi.
    */
    const mijoz = await yolovchi();
    const shofyor = await haydovchi();

    const safar = await safarBuyurtma(mijoz);

    await acceptRide(shofyor, safar.id);
    await advanceRide(shofyor, safar.id, 'ARRIVED');
    await advanceRide(shofyor, safar.id, 'START');

    const oldin = await balans(mijoz);

    await expect(cancelRide(mijoz, safar.id, { reason: 'Sinov' })).rejects.toThrow(ConflictError);

    expect(await balans(mijoz)).toBe(oldin);
  });

  it("IKKI MARTA yakunlab bo'lmaydi", async () => {
    /*
      Ikkinchi yakunlash o'tib ketsa, haydovchiga ulush ikki marta
      yozilardi — ya'ni pul yo'qdan bor bo'lardi.
    */
    const mijoz = await yolovchi();
    const shofyor = await haydovchi();

    const safar = await safarBuyurtma(mijoz);

    await acceptRide(shofyor, safar.id);
    await advanceRide(shofyor, safar.id, 'ARRIVED');
    await advanceRide(shofyor, safar.id, 'START');
    await completeRide(shofyor, safar.id);

    const shofyorOldin = await balans(shofyor);

    await expect(completeRide(shofyor, safar.id)).rejects.toThrow(ConflictError);

    expect(await balans(shofyor)).toBe(shofyorOldin);
  });

  it('bitta safarni IKKI haydovchi ola olmaydi', async () => {
    /*
      Ikkalasi ham "qabul qilindi" degan xabar olsa, ikkovi ham
      manzilga borardi va biri bekorga yo'l yurardi.
    */
    const mijoz = await yolovchi();
    const birinchi = await haydovchi();
    const ikkinchi = await haydovchi();

    const safar = await safarBuyurtma(mijoz);

    await acceptRide(birinchi, safar.id);

    await expect(acceptRide(ikkinchi, safar.id)).rejects.toThrow(ConflictError);
  });
});
