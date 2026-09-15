import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { ConflictError, ValidationError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { TIYIN_IN_SOM } from '@/lib/money';
import { DELIVERY_TARIFF, type DeliveryRegion } from '@/config/delivery';
import { calculateParcelPrice } from '@/modules/parcel/parcel.pricing';
import { cancelParcel, createParcel } from '@/modules/parcel/parcel.service';
import { topUp } from '@/modules/wallet/wallet.service';

/**
 * POSILKA — pul va NARX HISOBI sinovlari.
 *
 * ── Boshqa modullardan farqi: narx HISOBLANADI ────────────────────────
 * Ovqat va bozorda narx reyestrdan olinadi. Posilkada esa u har safar
 * qaytadan hisoblanadi: hudud ichidami yoki hududlararomi, og'irligi
 * qancha, nechta qo'shimcha kilogramm bor.
 *
 * Bu — jimgina buziladigan hisob. Bitta kilogramm noto'g'ri sanalsa,
 * har jo'natmada bir necha ming so'm yo'qoladi va buni faqat oylik
 * hisobotda payqash mumkin.
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

/** Ikki xil hudud — hududlararo narxni sinash uchun. */
const HUDUD_A: DeliveryRegion = 'Toshkent shahri';
const HUDUD_B: DeliveryRegion = 'Samarqand';

async function sinovOdam(): Promise<string> {
  const raqam = `+99899${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;

  const user = await prisma.user.create({
    data: { phone: raqam, firstName: 'Sinov', lastName: 'Posilka' },
    select: { id: true },
  });

  yaratilganlar.push(user.id);

  return user.id;
}

async function balans(userId: string): Promise<bigint> {
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });

  return wallet?.balance ?? 0n;
}

async function boyOdam(som = 300_000): Promise<string> {
  const odam = await sinovOdam();

  await topUp(odam, { amount: som, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

  return odam;
}

interface JonatmaOpts {
  toRegion?: DeliveryRegion;
  weightGrams?: number;
  kalit?: string;
}

async function jonat(userId: string, opts: JonatmaOpts = {}) {
  return createParcel(userId, {
    fromRegion: HUDUD_A,
    fromAddress: "Amir Temur ko'chasi, 12-uy, 5-xonadon",
    toRegion: opts.toRegion ?? HUDUD_A,
    toAddress: "Navoiy ko'chasi, 40-uy, 2-podyezd",
    recipientName: 'Qabul Qiluvchi',
    recipientPhone: '+998901112233',
    description: 'Hujjatlar papkasi',
    weightGrams: opts.weightGrams ?? 500,
    idempotencyKey: opts.kalit ?? `k-${randomUUID()}`,
  });
}

/** Kutilayotgan narx — kod HISOBLAGAN qiymat, qo'lda yozilgan emas. */
function kutilganTiyin(toRegion: DeliveryRegion, weightGrams: number): bigint {
  return BigInt(calculateParcelPrice({ fromRegion: HUDUD_A, toRegion, weightGrams }).priceTiyin);
}

afterAll(async () => {
  if (!BAZA_BOR || yaratilganlar.length === 0) return;

  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: yaratilganlar } },
    select: { id: true },
  });

  await prisma.parcel.deleteMany({ where: { senderId: { in: yaratilganlar } } });
  await prisma.walletTransaction.deleteMany({ where: { walletId: { in: wallets.map((w) => w.id) } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.notification.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: yaratilganlar } } });
  await prisma.user.deleteMany({ where: { id: { in: yaratilganlar } } });

  await prisma.$disconnect();
});

describe.skipIf(!BAZA_BOR)('posilka narxi', () => {
  it('hudud ICHIDA — arzonroq tarif', async () => {
    const odam = await boyOdam();
    const oldin = await balans(odam);

    await jonat(odam, { toRegion: HUDUD_A, weightGrams: 500 });

    expect(oldin - (await balans(odam))).toBe(kutilganTiyin(HUDUD_A, 500));
  });

  it('HUDUDLARARO — qimmatroq tarif', async () => {
    /*
      Ikki tarif ADASHTIRILMASLIGI kerak. Hududlararo jo'natma
      arzon tarif bilan hisoblansa, har safar farq ilova hisobidan
      to'lanardi.
    */
    const odam = await boyOdam();
    const oldin = await balans(odam);

    await jonat(odam, { toRegion: HUDUD_B, weightGrams: 500 });

    const narx = oldin - (await balans(odam));

    expect(narx).toBe(kutilganTiyin(HUDUD_B, 500));
    expect(narx).toBeGreaterThan(kutilganTiyin(HUDUD_A, 500));
  });

  it("OG'IRROQ posilka qimmatroq turadi", async () => {
    /*
      Qo'shimcha kilogramm BOSHLANGAN kilogramm bo'yicha sanaladi:
      1200 gramm — bu 1 kg dan og'ir, ya'ni bitta qo'shimcha kg.
      Aks holda 1999 gramm bepul ketardi.
    */
    const yengil = kutilganTiyin(HUDUD_A, DELIVERY_TARIFF.includedWeightGrams);
    const ogir = kutilganTiyin(HUDUD_A, DELIVERY_TARIFF.includedWeightGrams + 1);

    expect(ogir).toBeGreaterThan(yengil);

    const odam = await boyOdam();
    const oldin = await balans(odam);

    await jonat(odam, { weightGrams: DELIVERY_TARIFF.includedWeightGrams + 1 });

    expect(oldin - (await balans(odam))).toBe(ogir);
  });

  it("CHEGARADAN og'ir posilka rad etiladi", async () => {
    /*
      Kuryer moshinasiga sig'maydigan yukni qabul qilib bo'lmaydi.
      Tekshiruvsiz odam to'lab qo'yardi, keyin kuryer kelib rad
      etardi va pulni qaytarish kerak bo'lardi.
    */
    const odam = await boyOdam();
    const oldin = await balans(odam);

    await expect(jonat(odam, { weightGrams: DELIVERY_TARIFF.maxWeightGrams + 1 })).rejects.toThrow(
      ValidationError,
    );

    expect(await balans(odam)).toBe(oldin);
    expect(await prisma.parcel.count({ where: { senderId: odam } })).toBe(0);
  });
});

describe.skipIf(!BAZA_BOR)("posilka jo'natish", () => {
  it("mablag' yetmasa — posilka ham, yozuv ham bo'lmaydi", async () => {
    const odam = await sinovOdam();
    await topUp(odam, { amount: 1_000, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

    await expect(jonat(odam)).rejects.toThrow(ConflictError);

    expect(await balans(odam)).toBe(1_000n * TIYIN_IN_SOM);
    expect(await prisma.parcel.count({ where: { senderId: odam } })).toBe(0);
  });

  it('BIR XIL kalit ikki marta — bitta posilka, pul bir marta', async () => {
    const odam = await boyOdam();
    const kalit = `k-${randomUUID()}`;
    const oldin = await balans(odam);

    const birinchi = await jonat(odam, { kalit });
    const ikkinchi = await jonat(odam, { kalit });

    expect(ikkinchi.id).toBe(birinchi.id);
    expect(oldin - (await balans(odam))).toBe(kutilganTiyin(HUDUD_A, 500));
    expect(await prisma.parcel.count({ where: { senderId: odam } })).toBe(1);
  });

  it("bekor qilinganda pul TO'LIQ qaytadi", async () => {
    const odam = await boyOdam();
    const oldin = await balans(odam);

    const posilka = await jonat(odam);

    expect(await balans(odam)).toBeLessThan(oldin);

    await cancelParcel(odam, posilka.id, { reason: 'Sinov' });

    expect(await balans(odam)).toBe(oldin);
  });

  it("IKKI MARTA bekor qilib bo'lmaydi", async () => {
    const odam = await boyOdam();
    const oldin = await balans(odam);

    const posilka = await jonat(odam);

    await cancelParcel(odam, posilka.id, { reason: 'Birinchi' });

    await expect(cancelParcel(odam, posilka.id, { reason: 'Ikkinchi' })).rejects.toThrow(ConflictError);

    expect(await balans(odam)).toBe(oldin);
  });
});
