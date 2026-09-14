import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { TIYIN_IN_SOM } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { createPayment, refundPayment } from '@/modules/payment/payment.service';
import { topUp } from '@/modules/wallet/wallet.service';

/**
 * XIZMAT TO'LOVLARI — pul harakati sinovlari.
 *
 * ── Nima uchun bu fayl bor ────────────────────────────────────────────
 * Auditda o'lchandi: to'lov moduli qoplamasi 5.5%, shoxlanishlar
 * bo'yicha 0%. Ya'ni "mablag' yetarlimi", "summa chegarada turibdimi",
 * "takroriy so'rov" kabi QARORLARNING birortasi ham sinalmagan edi.
 *
 * Aynan shu yerda sekin internetda eng qimmat xato tug'iladi: ilova
 * "xatolik" deb ko'rsatadi, odam qaytadan to'laydi va pul IKKI MARTA
 * ketadi.
 *
 * Nima uchun soxta baza emasligi `wallet.service.int.test.ts` da
 * batafsil yozilgan: tekshirilayotgan himoyalarning o'zi bazada.
 */

/** Baza ochiqmi. */
const BAZA_BOR = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return true;
  } catch {
    return false;
  }
})();

/**
 * Provayder bazadan olinadi, qo'lda yasalmaydi.
 *
 * Har provayderning o'z chegarasi va hisob raqami shakli bor. Ularni
 * sinovda qo'lda yozsak, ertaga reyestr o'zgarganda sinov haqiqatdan
 * uzilib qolardi va buni hech kim payqamasdi.
 */
const PROVAYDER = BAZA_BOR
  ? await prisma.serviceProvider.findFirst({
      where: { isActive: true, accountRegex: '^\\d{9}$' },
      select: { id: true, minAmount: true, maxAmount: true, name: true },
    })
  : null;

const TAYYOR = BAZA_BOR && PROVAYDER !== null;

/** Shu sinovda yaratilganlar. */
const yaratilganlar: string[] = [];

async function sinovOdam(): Promise<{ id: string; phone: string }> {
  const raqam = `+99891${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;

  const user = await prisma.user.create({
    data: { phone: raqam, firstName: 'Sinov', lastName: "To'lov" },
    select: { id: true, phone: true },
  });

  yaratilganlar.push(user.id);

  return user;
}

async function balans(userId: string): Promise<bigint> {
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });

  return wallet?.balance ?? 0n;
}

async function pulQoy(userId: string, som: number): Promise<void> {
  await topUp(userId, { amount: som, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });
}

/** Provayder shakliga mos hisob raqami — 9 ta raqam. */
function hisobRaqami(): string {
  return String(Math.floor(100_000_000 + Math.random() * 899_999_999));
}

afterAll(async () => {
  if (!BAZA_BOR || yaratilganlar.length === 0) return;

  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: yaratilganlar } },
    select: { id: true },
  });

  await prisma.servicePayment.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.savedAccount.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.walletTransaction.deleteMany({ where: { walletId: { in: wallets.map((w) => w.id) } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.notification.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: yaratilganlar } } });
  await prisma.user.deleteMany({ where: { id: { in: yaratilganlar } } });

  await prisma.$disconnect();
});

describe.skipIf(!TAYYOR)("xizmat to'lovi", () => {
  it('hamyondan AYNAN summa yechiladi', async () => {
    const odam = await sinovOdam();
    await pulQoy(odam.id, 100_000);

    await createPayment(odam.id, {
      providerId: PROVAYDER!.id,
      accountNumber: hisobRaqami(),
      amount: 25_000,
      saveAccount: false,
      idempotencyKey: `k-${randomUUID()}`,
    });

    expect(await balans(odam.id)).toBe(75_000n * TIYIN_IN_SOM);
  });

  it("mablag' yetmasa — to'lov ham, yozuv ham bo'lmaydi", async () => {
    /*
      Faqat "xato qaytdi" yetarli emas: yarim bajarilgan to'lov
      (yozuv bor, pul yo'q yoki aksincha) eng yomon holat bo'lardi.
      Shuning uchun YOZUV ham sanaladi.
    */
    const odam = await sinovOdam();
    await pulQoy(odam.id, 5_000);

    await expect(
      createPayment(odam.id, {
        providerId: PROVAYDER!.id,
        accountNumber: hisobRaqami(),
        amount: 50_000,
        saveAccount: false,
        idempotencyKey: `k-${randomUUID()}`,
      }),
    ).rejects.toThrow(ConflictError);

    expect(await balans(odam.id)).toBe(5_000n * TIYIN_IN_SOM);
    expect(await prisma.servicePayment.count({ where: { userId: odam.id } })).toBe(0);
  });

  it('BIR XIL kalit ikki marta — pul BIR MARTA ketadi', async () => {
    /*
      ── Nima uchun bu eng muhim sinov ────────────────────────────────
      Sekin internetda javob yo'qoladi, ilova "xatolik" deydi va odam
      qaytadan bosadi. Kalit bir xil bo'lgani uchun tizim eski
      to'lovni qaytarishi SHART — aks holda gaz puli ikki marta
      yechilardi.
    */
    const odam = await sinovOdam();
    await pulQoy(odam.id, 100_000);
    const kalit = `k-${randomUUID()}`;
    const hisob = hisobRaqami();

    const birinchi = await createPayment(odam.id, {
      providerId: PROVAYDER!.id,
      accountNumber: hisob,
      amount: 30_000,
      saveAccount: false,
      idempotencyKey: kalit,
    });

    const ikkinchi = await createPayment(odam.id, {
      providerId: PROVAYDER!.id,
      accountNumber: hisob,
      amount: 30_000,
      saveAccount: false,
      idempotencyKey: kalit,
    });

    expect(ikkinchi.id).toBe(birinchi.id);
    expect(await balans(odam.id)).toBe(70_000n * TIYIN_IN_SOM);
    expect(await prisma.servicePayment.count({ where: { userId: odam.id } })).toBe(1);
  });

  it('provayder chegarasidan PAST summa rad etiladi', async () => {
    const odam = await sinovOdam();
    await pulQoy(odam.id, 100_000);

    const pastSom = Number(PROVAYDER!.minAmount / TIYIN_IN_SOM) - 1;

    await expect(
      createPayment(odam.id, {
        providerId: PROVAYDER!.id,
        accountNumber: hisobRaqami(),
        amount: Math.max(1, pastSom),
        saveAccount: false,
        idempotencyKey: `k-${randomUUID()}`,
      }),
    ).rejects.toThrow(ValidationError);

    expect(await balans(odam.id)).toBe(100_000n * TIYIN_IN_SOM);
  });

  it("noto'g'ri shakldagi hisob raqami rad etiladi", async () => {
    /*
      Hisob raqami shakli provayderdan olinadi. Tekshiruvsiz pul
      mavjud bo'lmagan hisobga ketardi va uni qaytarish qiyin.
    */
    const odam = await sinovOdam();
    await pulQoy(odam.id, 100_000);

    await expect(
      createPayment(odam.id, {
        providerId: PROVAYDER!.id,
        accountNumber: '12',
        amount: 20_000,
        saveAccount: false,
        idempotencyKey: `k-${randomUUID()}`,
      }),
    ).rejects.toThrow(ValidationError);

    expect(await balans(odam.id)).toBe(100_000n * TIYIN_IN_SOM);
  });

  it("mavjud bo'lmagan xizmat rad etiladi", async () => {
    const odam = await sinovOdam();
    await pulQoy(odam.id, 100_000);

    await expect(
      createPayment(odam.id, {
        providerId: randomUUID(),
        accountNumber: hisobRaqami(),
        amount: 20_000,
        saveAccount: false,
        idempotencyKey: `k-${randomUUID()}`,
      }),
    ).rejects.toThrow(NotFoundError);

    expect(await balans(odam.id)).toBe(100_000n * TIYIN_IN_SOM);
  });
});

describe.skipIf(!TAYYOR)("to'lovni qaytarish", () => {
  it("pul hamyonga TO'LIQ qaytadi", async () => {
    const odam = await sinovOdam();
    await pulQoy(odam.id, 80_000);

    const payment = await createPayment(odam.id, {
      providerId: PROVAYDER!.id,
      accountNumber: hisobRaqami(),
      amount: 30_000,
      saveAccount: false,
      idempotencyKey: `k-${randomUUID()}`,
    });

    expect(await balans(odam.id)).toBe(50_000n * TIYIN_IN_SOM);

    await refundPayment(odam.id, payment.id, 'Sinov uchun qaytarildi');

    expect(await balans(odam.id)).toBe(80_000n * TIYIN_IN_SOM);
  });

  it("IKKI MARTA qaytarib bo'lmaydi", async () => {
    /*
      Ikkinchi qaytarish o'tib ketsa, foydalanuvchi to'lamagan pulini
      olardi — ya'ni pul yo'qdan bor bo'lardi.
    */
    const odam = await sinovOdam();
    await pulQoy(odam.id, 60_000);

    const payment = await createPayment(odam.id, {
      providerId: PROVAYDER!.id,
      accountNumber: hisobRaqami(),
      amount: 20_000,
      saveAccount: false,
      idempotencyKey: `k-${randomUUID()}`,
    });

    await refundPayment(odam.id, payment.id, 'Birinchi qaytarish');

    await expect(refundPayment(odam.id, payment.id, 'Ikkinchi qaytarish')).rejects.toThrow(ConflictError);

    expect(await balans(odam.id)).toBe(60_000n * TIYIN_IN_SOM);
  });
});
