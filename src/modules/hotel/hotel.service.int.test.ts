import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { ConflictError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { TIYIN_IN_SOM } from '@/lib/money';
import { cancelBooking, createBooking } from '@/modules/hotel/hotel.service';
import { topUp } from '@/modules/wallet/wallet.service';

/**
 * MEHMONXONA BANDLOVI — pul va XONA BANDLIGI sinovlari.
 *
 * ── Boshqa modullardan farqi: SANA oralig'i ───────────────────────────
 * Do'konda mahsulot sanoqli, mehmonxonada esa xona SANAGA bog'liq:
 * bitta xona 10-12 sentabrga band bo'lsa, 11-13 ga band qilib
 * bo'lmaydi, lekin 12-14 ga bemalol.
 *
 * Bu — eng oson buziladigan qoida. Buzilsa ikki oila bitta xonaga
 * kelib qoladi va buni faqat ular kelgandan keyin bilamiz.
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

/** Faol mehmonxonaning faol xonasi — narxi va sig'imi bazadan. */
const XONA = BAZA_BOR
  ? await prisma.hotelRoom.findFirst({
      where: { isActive: true, capacity: { gte: 2 }, hotel: { isActive: true } },
      select: { id: true, pricePerNight: true, capacity: true, totalRooms: true },
    })
  : null;

const TAYYOR = BAZA_BOR && XONA !== null;

const yaratilganlar: string[] = [];

async function sinovOdam(): Promise<string> {
  const raqam = `+99897${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;

  const user = await prisma.user.create({
    data: { phone: raqam, firstName: 'Sinov', lastName: 'Mehmon' },
    select: { id: true },
  });

  yaratilganlar.push(user.id);

  return user.id;
}

async function balans(userId: string): Promise<bigint> {
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });

  return wallet?.balance ?? 0n;
}

/** Bandlovni bemalol qoplaydigan hamyon. */
async function boyOdam(): Promise<string> {
  const odam = await sinovOdam();
  const kerak = Number((XONA!.pricePerNight * 4n) / TIYIN_IN_SOM) + 100_000;

  await topUp(odam, { amount: kerak, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

  return odam;
}

/**
 * Kelajakdagi sana — `YYYY-MM-DD`.
 *
 * Har sinov O'Z oralig'ini oladi: aks holda ular bir-birining
 * bandlovi bilan to'qnashardi va sabab koddan emas, sinovlarning
 * bir-biriga xalaqit berishidan bo'lardi.
 */
function sana(kundanKeyin: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + kundanKeyin);

  return d.toISOString().slice(0, 10);
}

/** Har sinov uchun band bo'lmagan oraliq. */
let navbat = 30;
function oraliq(kecha = 2): { checkIn: string; checkOut: string } {
  navbat += 10;

  return { checkIn: sana(navbat), checkOut: sana(navbat + kecha) };
}

async function bandQil(userId: string, kunlar: { checkIn: string; checkOut: string }, kalit?: string) {
  return createBooking(userId, {
    roomId: XONA!.id,
    checkIn: kunlar.checkIn,
    checkOut: kunlar.checkOut,
    guests: 1,
    guestName: 'Sinov Mehmon',
    guestPhone: '+998901112233',
    idempotencyKey: kalit ?? `k-${randomUUID()}`,
  });
}

afterAll(async () => {
  if (!BAZA_BOR || yaratilganlar.length === 0) return;

  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: yaratilganlar } },
    select: { id: true },
  });

  await prisma.hotelBooking.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.walletTransaction.deleteMany({ where: { walletId: { in: wallets.map((w) => w.id) } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.notification.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: yaratilganlar } } });
  await prisma.user.deleteMany({ where: { id: { in: yaratilganlar } } });

  await prisma.$disconnect();
});

describe.skipIf(!TAYYOR)('mehmonxona bandlovi', () => {
  it("hamyondan AYNAN kechalar soniga ko'paytirilgan narx yechiladi", async () => {
    /*
      Narx sinovda yozilmaydi — xonadan olinadi va kechaga
      ko'paytiriladi. Bitta kecha ortiqcha yoki kam hisoblansa,
      farq darhol ko'rinadi.
    */
    const odam = await boyOdam();
    const kunlar = oraliq(2);
    const oldin = await balans(odam);

    await bandQil(odam, kunlar);

    expect(oldin - (await balans(odam))).toBe(XONA!.pricePerNight * 2n);
  });

  it("mablag' yetmasa — bandlov ham, yozuv ham bo'lmaydi", async () => {
    const odam = await sinovOdam();
    await topUp(odam, { amount: 1_000, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

    await expect(bandQil(odam, oraliq())).rejects.toThrow(ConflictError);

    expect(await balans(odam)).toBe(1_000n * TIYIN_IN_SOM);
    expect(await prisma.hotelBooking.count({ where: { userId: odam } })).toBe(0);
  });

  it('BIR XIL kalit ikki marta — bitta bandlov, pul bir marta', async () => {
    const odam = await boyOdam();
    const kunlar = oraliq();
    const kalit = `k-${randomUUID()}`;
    const oldin = await balans(odam);

    const birinchi = await bandQil(odam, kunlar, kalit);
    const ikkinchi = await bandQil(odam, kunlar, kalit);

    expect(ikkinchi.id).toBe(birinchi.id);
    expect(oldin - (await balans(odam))).toBe(XONA!.pricePerNight * 2n);
    expect(await prisma.hotelBooking.count({ where: { userId: odam } })).toBe(1);
  });

  it("bekor qilinganda pul qaytadi va sana BO'SHAYDI", async () => {
    /*
      Pul qaytishi yetarli emas: agar sana bo'shamasa, xona
      bo'sh turgani holda boshqa hech kim band qila olmasdi.
    */
    const odam = await boyOdam();
    const kunlar = oraliq();
    const oldin = await balans(odam);

    const bandlov = await bandQil(odam, kunlar);

    await cancelBooking(odam, bandlov.id, { reason: 'Sinov' });

    expect(await balans(odam)).toBe(oldin);

    // O'sha sanaga qayta band qilish endi MUMKIN.
    const boshqa = await boyOdam();

    await expect(bandQil(boshqa, kunlar)).resolves.toBeTruthy();
  });

  it("IKKI MARTA bekor qilib bo'lmaydi", async () => {
    const odam = await boyOdam();
    const oldin = await balans(odam);

    const bandlov = await bandQil(odam, oraliq());

    await cancelBooking(odam, bandlov.id, { reason: 'Birinchi' });

    await expect(cancelBooking(odam, bandlov.id, { reason: 'Ikkinchi' })).rejects.toThrow(ConflictError);

    expect(await balans(odam)).toBe(oldin);
  });
});

describe.skipIf(!TAYYOR)('xona bandligi', () => {
  it("BAND sanaga qayta band qilib bo'lmaydi", async () => {
    /*
      ── Eng muhim qoida ──────────────────────────────────────────────
      Mehmonxonada shu turdagi xonalar soni cheklangan (`totalRooms`).
      Hammasi band bo'lsa, keyingi bandlov rad etilishi SHART.

      Buzilsa: ikki oila bir kunda kelib, biriga joy yo'q bo'ladi.
      Bu — pul qaytarish bilan tuzatib bo'lmaydigan zarar.
    */
    const kunlar = oraliq(2);

    // Xonadagi barcha o'rinlarni band qilamiz.
    for (let i = 0; i < XONA!.totalRooms; i += 1) {
      await bandQil(await boyOdam(), kunlar);
    }

    // Keyingisi rad etilishi kerak.
    const kechikkan = await boyOdam();
    const oldin = await balans(kechikkan);

    await expect(bandQil(kechikkan, kunlar)).rejects.toThrow(ConflictError);

    expect(await balans(kechikkan)).toBe(oldin);
  });

  it("QO'SHNI sanaga band qilish MUMKIN", async () => {
    /*
      Teskari tomondan tekshiruv: tekshiruv juda qattiq bo'lib,
      to'qnashmaydigan sanani ham rad etmasligi kerak.

      10-12 band bo'lsa, 12-14 bemalol: chiqish kuni yangi
      kirish kuni bilan bir xil bo'lishi normal.
    */
    const birinchi = oraliq(2);
    await bandQil(await boyOdam(), birinchi);

    const qoshni = { checkIn: birinchi.checkOut, checkOut: sana(navbat + 4) };

    await expect(bandQil(await boyOdam(), qoshni)).resolves.toBeTruthy();
  });
});
