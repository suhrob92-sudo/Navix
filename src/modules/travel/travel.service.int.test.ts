import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { ConflictError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { TIYIN_IN_SOM } from '@/lib/money';
import { cancelTicket, createTicket } from '@/modules/travel/travel.service';
import { topUp } from '@/modules/wallet/wallet.service';

/**
 * SAYOHAT CHIPTASI — pul va O'RINLAR sinovlari.
 *
 * ── Boshqa modullardan farqi: reys KUNGA bog'liq ──────────────────────
 * Do'konda mahsulot har kuni sotiladi. Reys esa faqat belgilangan
 * kunlarda qatnaydi (masalan dushanba, chorshanba, juma, yakshanba)
 * va o'rinlar HAR JO'NASH uchun alohida sanaladi.
 *
 * Ya'ni bitta reysda 140 o'rin bor, lekin bu "140 ta chipta" emas —
 * har kungi jo'nash uchun alohida 140 ta. Bu hisob chalkashsa, bir
 * kunda 140 dan ortiq odam chipta olib, avtobusga sig'masdi.
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

/** Faol reys — narxi, o'rinlari va qatnov kunlari bazadan. */
const REYS = BAZA_BOR
  ? await prisma.tripSchedule.findFirst({
      where: { isActive: true },
      select: { id: true, priceTiyin: true, totalSeats: true, weekdays: true },
    })
  : null;

const TAYYOR = BAZA_BOR && REYS !== null && REYS.weekdays.length > 0;

const yaratilganlar: string[] = [];

async function sinovOdam(): Promise<string> {
  const raqam = `+99833${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;

  const user = await prisma.user.create({
    data: { phone: raqam, firstName: 'Sinov', lastName: 'Sayohat' },
    select: { id: true },
  });

  yaratilganlar.push(user.id);

  return user.id;
}

async function balans(userId: string): Promise<bigint> {
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });

  return wallet?.balance ?? 0n;
}

/** Bir necha chiptani qoplaydigan hamyon. */
async function boyOdam(): Promise<string> {
  const odam = await sinovOdam();
  const kerak = Number((REYS!.priceTiyin * 4n) / TIYIN_IN_SOM) + 100_000;

  await topUp(odam, { amount: kerak, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

  return odam;
}

/**
 * Reys QATNAYDIGAN kelajakdagi sana.
 *
 * Kunni qo'lda yozib bo'lmaydi: har reysning o'z qatnov kunlari bor
 * va sinov ishga tushgan kunga qarab mos sana boshqacha bo'ladi.
 * Shuning uchun keyingi 30 kundan mos keladigani izlanadi.
 *
 * `offset` — birinchi mos kundan keyingi nechanchisini olish. Har
 * sinov o'z sanasini oladi, aks holda ular bir-birining o'rinlarini
 * band qilib, sabab koddan emas, sinovlardan bo'lardi.
 */
function qatnovSanasi(offset: number): string {
  const mos: string[] = [];

  for (let i = 2; i < 60 && mos.length <= offset; i += 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + i);

    // ISO hafta kuni: dushanba 1 ... yakshanba 7.
    const iso = d.getUTCDay() === 0 ? 7 : d.getUTCDay();

    if (REYS!.weekdays.includes(iso)) mos.push(d.toISOString().slice(0, 10));
  }

  return mos[offset] ?? mos[0]!;
}

async function chiptaOl(userId: string, departDate: string, seats = 1, kalit?: string) {
  return createTicket(userId, {
    scheduleId: REYS!.id,
    departDate,
    seats,
    passengerName: "Sinov Yo'lovchi",
    passengerPhone: '+998901112233',
    idempotencyKey: kalit ?? `k-${randomUUID()}`,
  });
}

afterAll(async () => {
  if (!BAZA_BOR || yaratilganlar.length === 0) return;

  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: yaratilganlar } },
    select: { id: true },
  });

  await prisma.tripBooking.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.walletTransaction.deleteMany({ where: { walletId: { in: wallets.map((w) => w.id) } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.notification.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: yaratilganlar } } });
  await prisma.user.deleteMany({ where: { id: { in: yaratilganlar } } });

  await prisma.$disconnect();
});

describe.skipIf(!TAYYOR)('chipta olish', () => {
  it("hamyondan AYNAN o'rinlar soniga ko'paytirilgan narx yechiladi", async () => {
    const odam = await boyOdam();
    const oldin = await balans(odam);

    await chiptaOl(odam, qatnovSanasi(0), 2);

    expect(oldin - (await balans(odam))).toBe(REYS!.priceTiyin * 2n);
  });

  it("mablag' yetmasa — chipta ham, yozuv ham bo'lmaydi", async () => {
    const odam = await sinovOdam();
    await topUp(odam, { amount: 1_000, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

    await expect(chiptaOl(odam, qatnovSanasi(1))).rejects.toThrow(ConflictError);

    expect(await balans(odam)).toBe(1_000n * TIYIN_IN_SOM);
    expect(await prisma.tripBooking.count({ where: { userId: odam } })).toBe(0);
  });

  it('BIR XIL kalit ikki marta — bitta chipta, pul bir marta', async () => {
    const odam = await boyOdam();
    const kun = qatnovSanasi(2);
    const kalit = `k-${randomUUID()}`;
    const oldin = await balans(odam);

    const birinchi = await chiptaOl(odam, kun, 1, kalit);
    const ikkinchi = await chiptaOl(odam, kun, 1, kalit);

    expect(ikkinchi.id).toBe(birinchi.id);
    expect(oldin - (await balans(odam))).toBe(REYS!.priceTiyin);
    expect(await prisma.tripBooking.count({ where: { userId: odam } })).toBe(1);
  });

  it('reys QATNAMAYDIGAN kunga chipta berilmaydi', async () => {
    /*
      Reys faqat belgilangan kunlarda qatnaydi. Tekshiruvsiz odam
      avtobus yurmaydigan kunga chipta olib, bekatga bekorga
      borardi — va bu pul qaytarish bilan tuzalmaydigan zarar.
    */
    const qatnamaydigan = (() => {
      for (let i = 2; i < 60; i += 1) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + i);
        const iso = d.getUTCDay() === 0 ? 7 : d.getUTCDay();

        if (!REYS!.weekdays.includes(iso)) return d.toISOString().slice(0, 10);
      }

      return null;
    })();

    // Reys HAR KUNI qatnasa, bu holatni yasab bo'lmaydi.
    if (qatnamaydigan === null) {
      expect(REYS!.weekdays.length).toBe(7);

      return;
    }

    const odam = await boyOdam();
    const oldin = await balans(odam);

    await expect(chiptaOl(odam, qatnamaydigan)).rejects.toThrow(ConflictError);

    expect(await balans(odam)).toBe(oldin);
  });

  it("bekor qilinganda pul TO'LIQ qaytadi", async () => {
    const odam = await boyOdam();
    const oldin = await balans(odam);

    const chipta = await chiptaOl(odam, qatnovSanasi(3), 2);

    expect(await balans(odam)).toBeLessThan(oldin);

    await cancelTicket(odam, chipta.id, { reason: 'Sinov' });

    expect(await balans(odam)).toBe(oldin);
  });

  it("IKKI MARTA bekor qilib bo'lmaydi", async () => {
    const odam = await boyOdam();
    const oldin = await balans(odam);

    const chipta = await chiptaOl(odam, qatnovSanasi(4));

    await cancelTicket(odam, chipta.id, { reason: 'Birinchi' });

    await expect(cancelTicket(odam, chipta.id, { reason: 'Ikkinchi' })).rejects.toThrow(ConflictError);

    expect(await balans(odam)).toBe(oldin);
  });
});
