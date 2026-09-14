import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { TIYIN_IN_SOM } from '@/lib/money';
import { chargeWallet, getOrCreateWallet, topUp } from '@/modules/wallet/wallet.service';

/**
 * QATOR QULFI — HAQIQIY bir vaqtdalik sinovi.
 *
 * ── Nima uchun alohida fayl ───────────────────────────────────────────
 * Oldingi urinishim yolg'on ishonch bergan edi. `wallet.service.int.test.ts`
 * da "bir vaqtda kelgan ikki so'rov" degan sinov bor edi va u
 * `Promise.allSettled([transfer(...), transfer(...)])` bilan yozilgandi.
 *
 * Uni o'lchab ko'rdim: `SELECT ... FOR UPDATE` ni ataylab olib
 * tashlaganimda ham sinov O'TAVERDI. Sabab — ikkita `transfer()`
 * chaqiruvi tranzaksiya ochilgunga qadar bir necha marta `await`
 * qiladi va amalda ular NAVBAT bilan bajariladi. Ya'ni sinov
 * bir vaqtdalikni umuman yaratmasdi.
 *
 * ── Bu yerdagi yechim: BARIYER ────────────────────────────────────────
 * Ikkala tranzaksiya ham ochiladi, keyin ikkalasi bir joyda
 * UCHRASHADI va faqat shundan keyin qulf so'raydi. Shunda ular
 * haqiqatan bir vaqtda kurashadi.
 *
 * Endi sinov chindan o'lchaydi: qulf olib tashlansa — YIQILADI.
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

async function sinovOdam(): Promise<string> {
  const raqam = `+99893${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;

  const user = await prisma.user.create({
    data: { phone: raqam, firstName: 'Sinov', lastName: 'Qulf' },
    select: { id: true },
  });

  yaratilganlar.push(user.id);

  return user.id;
}

async function balans(userId: string): Promise<bigint> {
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });

  return wallet?.balance ?? 0n;
}

/**
 * Bariyer — `n` ta ishtirokchi shu yerda uchrashadi.
 *
 * Har biri kelganda sanoq oshadi. Oxirgisi kelganda eshik ochiladi va
 * HAMMASI bir vaqtda davom etadi. Aynan shu narsa sinovni haqiqiy
 * poygaga aylantiradi.
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

afterAll(async () => {
  if (!BAZA_BOR || yaratilganlar.length === 0) return;

  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: yaratilganlar } },
    select: { id: true },
  });

  await prisma.walletTransaction.deleteMany({ where: { walletId: { in: wallets.map((w) => w.id) } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.notification.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: yaratilganlar } } });
  await prisma.user.deleteMany({ where: { id: { in: yaratilganlar } } });

  await prisma.$disconnect();
});

describe.skipIf(!BAZA_BOR)('qator qulfi', () => {
  it("bir vaqtda kelgan IKKI yechish — faqat bittasi o'tadi", async () => {
    /*
      ── Bu fayldagi ASOSIY sinov ─────────────────────────────────────
      Hamyonda 50 000 so'm bor. Ikkita so'rov AYNAN bir vaqtda
      50 000 so'mni yechmoqchi.

      Qulf bo'lmasa: ikkalasi ham eski balansni o'qiydi, ikkalasi ham
      "yetarli" deb ko'radi va ikkalasi ham yechadi. Natijada hamyondan
      100 000 so'm chiqib ketadi va balans MANFIY bo'ladi. Bu — pul
      tizimidagi eng qimmat xato.

      Qulf bo'lsa: ikkinchisi birinchisini kutadi, keyin YANGI
      balansni o'qiydi va "mablag' yetarli emas" deb rad etadi.
    */
    const odam = await sinovOdam();
    await topUp(odam, { amount: 50_000, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

    const wallet = await getOrCreateWallet(odam);
    const uchrashuv = bariyer(2);

    async function yechish() {
      return prisma.$transaction(async (tx) => {
        /*
          Bo'sh so'rov — tranzaksiya HAQIQATAN ochilishi uchun.
          Usiz `$transaction` faqat qog'ozda ochilgan bo'lardi va
          bariyer hech narsani sinxronlamasdi.
        */
        await tx.$queryRaw`SELECT 1`;

        // Ikkalasi shu yerda uchrashadi — endi poyga boshlanadi.
        await uchrashuv();

        return chargeWallet(tx, {
          userId: odam,
          walletId: wallet.id,
          amountTiyin: 50_000n * TIYIN_IN_SOM,
          description: 'Qulf sinovi',
          sourceModule: 'sinov',
          sourceId: randomUUID(),
          idempotencyKey: `k-${randomUUID()}`,
        });
      });
    }

    const natijalar = await Promise.allSettled([yechish(), yechish()]);
    const otdi = natijalar.filter((r) => r.status === 'fulfilled').length;

    expect(otdi).toBe(1);

    /*
      Eng muhim tekshiruv: balans NOL, manfiy emas.

      Agar qulf ishlamasa, bu yerda -50 000 so'm chiqardi — ya'ni
      ilova mavjud bo'lmagan pulni berib yuborgan bo'lardi.
    */
    const qolgan = await balans(odam);

    expect(qolgan).toBe(0n);
    expect(qolgan >= 0n).toBe(true);
  });

  it('bir vaqtda kelgan OLTI yechish — jami balansdan oshmaydi', async () => {
    /*
      Ikkita so'rov tasodifan to'g'ri ishlashi mumkin. Oltita bo'lsa,
      tasodifga o'rin qolmaydi: hamyonda 60 000 bor, har biri
      20 000 so'raydi. Demak ATIGI uchtasi o'tishi kerak.
    */
    const odam = await sinovOdam();
    await topUp(odam, { amount: 60_000, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

    const wallet = await getOrCreateWallet(odam);
    const uchrashuv = bariyer(6);

    const natijalar = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT 1`;
          await uchrashuv();

          return chargeWallet(tx, {
            userId: odam,
            walletId: wallet.id,
            amountTiyin: 20_000n * TIYIN_IN_SOM,
            description: 'Qulf sinovi',
            sourceModule: 'sinov',
            sourceId: randomUUID(),
            idempotencyKey: `k-${randomUUID()}`,
          });
        }),
      ),
    );

    const otdi = natijalar.filter((r) => r.status === 'fulfilled').length;

    expect(otdi).toBe(3);
    expect(await balans(odam)).toBe(0n);
  });

  it("yechilgan summalar YIG'INDISI boshlang'ich balansga teng", async () => {
    /*
      Boshqa tomondan tekshiruv: har bir muvaffaqiyatli yechishdan
      keyingi balans yozuvi ketma-ket kamayib borishi kerak.
      Ikkita yozuvda bir xil `balanceAfter` bo'lsa — demak ikkalasi
      bir xil eski qiymatdan hisoblagan, ya'ni qulf ishlamagan.
    */
    const odam = await sinovOdam();
    await topUp(odam, { amount: 40_000, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

    const wallet = await getOrCreateWallet(odam);
    const uchrashuv = bariyer(4);

    await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT 1`;
          await uchrashuv();

          return chargeWallet(tx, {
            userId: odam,
            walletId: wallet.id,
            amountTiyin: 10_000n * TIYIN_IN_SOM,
            description: 'Qulf sinovi',
            sourceModule: 'sinov',
            sourceId: randomUUID(),
            idempotencyKey: `k-${randomUUID()}`,
          });
        }),
      ),
    );

    const yozuvlar = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id, sourceModule: 'sinov' },
      select: { balanceAfter: true },
      orderBy: { createdAt: 'asc' },
    });

    const qiymatlar = yozuvlar.map((y) => y.balanceAfter.toString());

    // Takrorlanish YO'Q — har yozuv o'z navbatida hisoblangan.
    expect(new Set(qiymatlar).size).toBe(qiymatlar.length);
    expect(await balans(odam)).toBe(0n);
  });
});
