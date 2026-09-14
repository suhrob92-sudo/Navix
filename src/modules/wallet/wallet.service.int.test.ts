import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { afterAll, describe, expect, it } from 'vitest';

import { WalletStatus } from '@/generated/prisma/enums';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { TIYIN_IN_SOM } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import {
  chargeWallet,
  creditEarning,
  getOrCreateWallet,
  getWalletSummary,
  refundWallet,
  topUp,
  transfer,
} from '@/modules/wallet/wallet.service';

/**
 * HAMYON — pul harakati sinovlari.
 *
 * ── Nima uchun bu fayl bor ────────────────────────────────────────────
 * Auditda o'lchandi: hamyon moduli qoplamasi 8%, to'lovlarniki 5.5%.
 * Ya'ni pul yechadigan, qaytaradigan va o'tkazadigan kodni HECH NARSA
 * qo'riqlamasdi. Kod yaxshi yozilgan, lekin ertaga kimdir bitta
 * shartni o'zgartirsa, xato jim ravishda o'tib ketardi — va uni
 * foydalanuvchining puli bilan bilib olardik.
 *
 * ── Nima uchun SOXTA baza (mock) EMAS ─────────────────────────────────
 * Bu yerda tekshirilayotgan narsalarning eng muhimlari AYNAN BAZADA
 * yashaydi:
 *
 *   · `FOR UPDATE` qatorni qulflashi — ikki marta yechilishning oldini
 *     oladi;
 *   · `idempotencyKey` ustidagi yagona indeks — takroriy so'rovni
 *     bazaning o'zi rad etadi.
 *
 * Soxta baza yozsak, Postgres'ni qaytadan yozgan bo'lardik va sinov
 * o'zimiz yozgan soxta mantiqni tekshirardi — ya'ni hech narsani.
 *
 * Shuning uchun bu INTEGRATSION sinov: haqiqiy bazaga ulanadi.
 *
 * ── Baza bo'lmasa ─────────────────────────────────────────────────────
 * Sinovlar O'TKAZIB YUBORILADI, yiqilmaydi. Aks holda bazasiz muhitda
 * (masalan toza CI) butun to'plam qizarardi va odamlar sinovga
 * ishonishni to'xtatardi.
 *
 *   Bazani ishga tushirish:  service postgresql start
 */

/** Baza ochiqmi — bir marta tekshiriladi. */
const BAZA_BOR = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return true;
  } catch {
    return false;
  }
})();

if (!BAZA_BOR) {
  console.warn("\n  [hamyon] Baza topilmadi - pul sinovlari o'tkazib yuborildi.\n");
}

/** Shu sinovda yaratilgan foydalanuvchilar — oxirida tozalanadi. */
const yaratilganlar: string[] = [];

/**
 * Sinov foydalanuvchisi.
 *
 * Raqam TASODIFIY: sinovlar parallel ishlasa ham bir-biriga
 * tegmasligi kerak. Raqam maydoni 20 belgigacha, shuning uchun
 * qisqa tasodifiy son olinadi.
 */
async function sinovOdam(): Promise<{ id: string; phone: string }> {
  const raqam = `+99890${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;

  const user = await prisma.user.create({
    data: { phone: raqam, firstName: 'Sinov', lastName: 'Hamyon' },
    select: { id: true, phone: true },
  });

  yaratilganlar.push(user.id);

  return user;
}

/** Balansni TIYINDA o'qiydi — hisobot emas, xom qiymat. */
async function balans(userId: string): Promise<bigint> {
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });

  return wallet?.balance ?? 0n;
}

/** Hamyonga boshlang'ich pul qo'yadi. */
async function pulQoy(userId: string, som: number): Promise<void> {
  await topUp(userId, { amount: som, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });
}

afterAll(async () => {
  if (!BAZA_BOR || yaratilganlar.length === 0) return;

  /*
    Tozalash TARTIB bilan: avval bog'liq yozuvlar, keyin foydalanuvchi.
    Teskari tartibda tashqi kalit xatosi chiqardi.
  */
  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: yaratilganlar } },
    select: { id: true },
  });
  const walletIds = wallets.map((w) => w.id);

  await prisma.walletTransaction.deleteMany({ where: { walletId: { in: walletIds } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.notification.deleteMany({ where: { userId: { in: yaratilganlar } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: yaratilganlar } } });
  await prisma.user.deleteMany({ where: { id: { in: yaratilganlar } } });

  await prisma.$disconnect();
});

describe.skipIf(!BAZA_BOR)("to'ldirish", () => {
  it('balans AYNAN summaga oshadi', async () => {
    const odam = await sinovOdam();

    await topUp(odam.id, { amount: 50_000, method: 'CARD', idempotencyKey: `k-${randomUUID()}` });

    /*
      Tiyinda solishtiriladi: so'mda tekshirsak, yaxlitlash xatosi
      ko'rinmay qolardi. 50 000 so'm = 5 000 000 tiyin.
    */
    expect(await balans(odam.id)).toBe(50_000n * TIYIN_IN_SOM);
  });

  it("BIR XIL kalit ikki marta — pul BIR MARTA qo'shiladi", async () => {
    const odam = await sinovOdam();
    const kalit = `k-${randomUUID()}`;

    const birinchi = await topUp(odam.id, { amount: 30_000, method: 'PAYME', idempotencyKey: kalit });
    const ikkinchi = await topUp(odam.id, { amount: 30_000, method: 'PAYME', idempotencyKey: kalit });

    // Javob bir xil yozuvni ko'rsatadi — mijoz uchun natija o'zgarmaydi.
    expect(ikkinchi.id).toBe(birinchi.id);
    expect(await balans(odam.id)).toBe(30_000n * TIYIN_IN_SOM);
  });

  it('IKKI odam BIR XIL kalit yuborsa - bir-biriga xalaqit bermaydi', async () => {
    /*
      ── Nima uchun bu muhim ──────────────────────────────────────────
      Kalitni mijoz O'ZI tanlaydi. Ikki odam bir xil kalit yuborishi
      mumkin - masalan ikkalasi ham "toldirish-1" deb yozsa.

      Agar kalit butun baza bo'ylab yagona bo'lsa, ikkinchisining puli
      qo'shilmasdan "muvaffaqiyatli" javob qaytardi va u O'ZGANING
      yozuvini - summasi va BALANSI bilan - ko'rardi.

      Kod buni kalitni foydalanuvchi bilan BIRGA saqlash orqali hal
      qiladi: `client:<userId>:<kalit>`. Sinov shu himoya turganini
      tasdiqlaydi.
    */
    const birov = await sinovOdam();
    const boshqa = await sinovOdam();
    const kalit = `k-${randomUUID()}`;

    const a = await topUp(birov.id, { amount: 20_000, method: 'CARD', idempotencyKey: kalit });
    const b = await topUp(boshqa.id, { amount: 35_000, method: 'CARD', idempotencyKey: kalit });

    // Ikki BOSHQA yozuv - biri ikkinchisini qaytarmadi.
    expect(b.id).not.toBe(a.id);
    expect(await balans(birov.id)).toBe(20_000n * TIYIN_IN_SOM);
    expect(await balans(boshqa.id)).toBe(35_000n * TIYIN_IN_SOM);
  });

  it('BIR XIL kalit BOSHQA amal uchun - rad etiladi', async () => {
    /*
      Odam to'ldirishda ishlatgan kalitni o'tkazmada qayta yuborsa,
      tizim eski TO'LDIRISH yozuvini topadi. Uni "o'tkazma bajarildi"
      deb qaytarish YOLG'ON bo'lardi: pul hech qayerga ketmagan,
      lekin odam ketgan deb o'ylardi.
    */
    const yuboruvchi = await sinovOdam();
    const oluvchi = await sinovOdam();
    const kalit = `k-${randomUUID()}`;

    await topUp(yuboruvchi.id, { amount: 50_000, method: 'CARD', idempotencyKey: kalit });

    await expect(
      transfer(yuboruvchi.id, { phone: oluvchi.phone, amount: 10_000, idempotencyKey: kalit }),
    ).rejects.toThrow(ConflictError);

    expect(await balans(yuboruvchi.id)).toBe(50_000n * TIYIN_IN_SOM);
    expect(await balans(oluvchi.id)).toBe(0n);
  });

  it("MUZLATILGAN hamyonga pul qo'shib bo'lmaydi", async () => {
    const odam = await sinovOdam();
    await getOrCreateWallet(odam.id);
    await prisma.wallet.update({ where: { userId: odam.id }, data: { status: WalletStatus.FROZEN } });

    await expect(
      topUp(odam.id, { amount: 10_000, method: 'CARD', idempotencyKey: `k-${randomUUID()}` }),
    ).rejects.toThrow(ConflictError);

    expect(await balans(odam.id)).toBe(0n);
  });
});

describe.skipIf(!BAZA_BOR)("o'tkazma", () => {
  it("pul bir hamyondan ikkinchisiga TO'LIQ o'tadi", async () => {
    const yuboruvchi = await sinovOdam();
    const oluvchi = await sinovOdam();
    await pulQoy(yuboruvchi.id, 100_000);

    await transfer(yuboruvchi.id, {
      phone: oluvchi.phone,
      amount: 40_000,
      idempotencyKey: `k-${randomUUID()}`,
    });

    expect(await balans(yuboruvchi.id)).toBe(60_000n * TIYIN_IN_SOM);
    expect(await balans(oluvchi.id)).toBe(40_000n * TIYIN_IN_SOM);
  });

  it("JAMI pul o'zgarmaydi — yaratilmaydi ham, yo'qolmaydi ham", async () => {
    /*
      Eng muhim moliyaviy qoida. Agar ikki yozuv orasida bitta
      yaxlitlash yoki belgi xatosi bo'lsa, jami o'zgarardi va buni
      faqat hisobot vaqtida — kech bo'lganda — payqardik.
    */
    const a = await sinovOdam();
    const b = await sinovOdam();
    await pulQoy(a.id, 77_777);

    const jamiOldin = (await balans(a.id)) + (await balans(b.id));

    await transfer(a.id, { phone: b.phone, amount: 33_333, idempotencyKey: `k-${randomUUID()}` });

    const jamiKeyin = (await balans(a.id)) + (await balans(b.id));

    expect(jamiKeyin).toBe(jamiOldin);
  });

  it("mablag' yetmasa — rad etiladi va HECH NARSA o'zgarmaydi", async () => {
    const yuboruvchi = await sinovOdam();
    const oluvchi = await sinovOdam();
    await pulQoy(yuboruvchi.id, 10_000);

    await expect(
      transfer(yuboruvchi.id, {
        phone: oluvchi.phone,
        amount: 50_000,
        idempotencyKey: `k-${randomUUID()}`,
      }),
    ).rejects.toThrow(ConflictError);

    expect(await balans(yuboruvchi.id)).toBe(10_000n * TIYIN_IN_SOM);
    expect(await balans(oluvchi.id)).toBe(0n);
  });

  it("O'ZIGA o'tkazib bo'lmaydi", async () => {
    const odam = await sinovOdam();
    await pulQoy(odam.id, 20_000);

    await expect(
      transfer(odam.id, { phone: odam.phone, amount: 5_000, idempotencyKey: `k-${randomUUID()}` }),
    ).rejects.toThrow(ValidationError);

    expect(await balans(odam.id)).toBe(20_000n * TIYIN_IN_SOM);
  });

  it("mavjud bo'lmagan raqam — tushunarli xato", async () => {
    const odam = await sinovOdam();
    await pulQoy(odam.id, 20_000);

    await expect(
      transfer(odam.id, {
        phone: '+998900000001',
        amount: 5_000,
        idempotencyKey: `k-${randomUUID()}`,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("BIR XIL kalit ikki marta — pul BIR MARTA o'tadi", async () => {
    const a = await sinovOdam();
    const b = await sinovOdam();
    await pulQoy(a.id, 60_000);
    const kalit = `k-${randomUUID()}`;

    const birinchi = await transfer(a.id, { phone: b.phone, amount: 25_000, idempotencyKey: kalit });
    const ikkinchi = await transfer(a.id, { phone: b.phone, amount: 25_000, idempotencyKey: kalit });

    expect(ikkinchi.id).toBe(birinchi.id);
    expect(await balans(a.id)).toBe(35_000n * TIYIN_IN_SOM);
    expect(await balans(b.id)).toBe(25_000n * TIYIN_IN_SOM);
  });
});

describe.skipIf(!BAZA_BOR)("ketma-ket kelgan ikki so'rov", () => {
  it("butun balansni IKKI MARTA yechib bo'lmaydi", async () => {
    /*
      Ikkita so'rov BUTUN balansni so'raydi va kalitlari HAR XIL —
      ya'ni idempotentlik bu yerda yordam bermaydi. Faqat balans
      tekshiruvi to'xtatishi kerak.

      ── OCHIQ E'TIROF: bu sinov QULFNI ISBOTLAMAYDI ───────────────────
      Kodda `SELECT ... FOR UPDATE` bor va u to'g'ri yechim: ikkita
      so'rov HAQIQATAN bir vaqtda kelganda faqat bittasi o'tishi
      uchun.

      Men buni o'lchab ko'rdim: `FOR UPDATE` ni ataylab olib
      tashlaganimda ham bu sinov O'TAVERDI. Sababi — Prisma
      tranzaksiyalari bu yerda navbat bilan bajarilmoqda, ya'ni
      sinov haqiqiy bir vaqtdalikni umuman yaratmayapti.

      Shuning uchun sinov nomi ham, izohi ham to'g'rilandi: u
      KETMA-KET kelgan ikkinchi so'rov rad etilishini tekshiradi.
      Bu ham kerakli xususiyat, lekin qulf himoyasi emas.

      Qulf endi ALOHIDA faylda isbotlangan:
      `wallet.lock.int.test.ts`. U bariyer ishlatadi — ikkala
      tranzaksiya ochilib, bir joyda uchrashadi va faqat shundan
      keyin qulf so'raydi. O'sha sinov `FOR UPDATE` olib tashlanganda
      YIQILADI (o'lchab tekshirilgan).
    */
    const yuboruvchi = await sinovOdam();
    const oluvchi = await sinovOdam();
    await pulQoy(yuboruvchi.id, 50_000);

    const natijalar = await Promise.allSettled([
      transfer(yuboruvchi.id, {
        phone: oluvchi.phone,
        amount: 50_000,
        idempotencyKey: `k-${randomUUID()}`,
      }),
      transfer(yuboruvchi.id, {
        phone: oluvchi.phone,
        amount: 50_000,
        idempotencyKey: `k-${randomUUID()}`,
      }),
    ]);

    const otdi = natijalar.filter((r) => r.status === 'fulfilled').length;

    expect(otdi).toBe(1);
    expect(await balans(yuboruvchi.id)).toBe(0n);
    expect(await balans(oluvchi.id)).toBe(50_000n * TIYIN_IN_SOM);
  });

  it('qulf kodi JOYIDA turganini tekshiradi', () => {
    /*
      Yuqoridagi sinov qulfni isbotlay olmagani uchun, hech bo'lmasa
      uning KODDAN YO'QOLMASLIGINI qo'riqlaymiz. Kimdir uni olib
      tashlasa, sinov darhol aytadi.

      Bu "qulf ishlayapti" degani EMAS — faqat "qulf hali ham
      yozilgan" degani. Farqni bilib turish muhim.
    */
    const manba = readFileSync('src/modules/wallet/wallet.service.ts', 'utf8');

    expect(manba).toMatch(/SELECT[\s\S]*?FROM wallets[\s\S]*?FOR UPDATE/);
  });
});

describe.skipIf(!BAZA_BOR)('xizmat uchun yechish va qaytarish', () => {
  it('yechish balansni kamaytiradi', async () => {
    const odam = await sinovOdam();
    await pulQoy(odam.id, 80_000);
    const wallet = await getOrCreateWallet(odam.id);

    await prisma.$transaction((tx) =>
      chargeWallet(tx, {
        userId: odam.id,
        walletId: wallet.id,
        amountTiyin: 30_000n * TIYIN_IN_SOM,
        description: 'Sinov xizmati',
        sourceModule: 'sinov',
        sourceId: randomUUID(),
        idempotencyKey: `k-${randomUUID()}`,
      }),
    );

    expect(await balans(odam.id)).toBe(50_000n * TIYIN_IN_SOM);
  });

  it("mablag' yetmasa yechilmaydi", async () => {
    const odam = await sinovOdam();
    await pulQoy(odam.id, 10_000);
    const wallet = await getOrCreateWallet(odam.id);

    await expect(
      prisma.$transaction((tx) =>
        chargeWallet(tx, {
          userId: odam.id,
          walletId: wallet.id,
          amountTiyin: 90_000n * TIYIN_IN_SOM,
          description: 'Sinov xizmati',
          sourceModule: 'sinov',
          sourceId: randomUUID(),
          idempotencyKey: `k-${randomUUID()}`,
        }),
      ),
    ).rejects.toThrow(ConflictError);

    expect(await balans(odam.id)).toBe(10_000n * TIYIN_IN_SOM);
  });

  it('NOL yoki MANFIY summa rad etiladi', async () => {
    /*
      Manfiy summa yechish = pul QO'SHISH bo'lardi. Bu tekshiruvsiz
      qolsa, mijoz o'ziga cheksiz pul yozdira olardi.
    */
    const odam = await sinovOdam();
    await pulQoy(odam.id, 10_000);
    const wallet = await getOrCreateWallet(odam.id);

    for (const summa of [0n, -5_000n * TIYIN_IN_SOM]) {
      await expect(
        prisma.$transaction((tx) =>
          chargeWallet(tx, {
            userId: odam.id,
            walletId: wallet.id,
            amountTiyin: summa,
            description: 'Sinov',
            sourceModule: 'sinov',
            sourceId: randomUUID(),
            idempotencyKey: `k-${randomUUID()}`,
          }),
        ),
      ).rejects.toThrow(ValidationError);
    }

    expect(await balans(odam.id)).toBe(10_000n * TIYIN_IN_SOM);
  });

  it("qaytarish yechilgan pulni TO'LIQ tiklaydi", async () => {
    const odam = await sinovOdam();
    await pulQoy(odam.id, 60_000);
    const wallet = await getOrCreateWallet(odam.id);
    const summa = 25_000n * TIYIN_IN_SOM;
    const manba = randomUUID();

    await prisma.$transaction((tx) =>
      chargeWallet(tx, {
        userId: odam.id,
        walletId: wallet.id,
        amountTiyin: summa,
        description: 'Sinov xizmati',
        sourceModule: 'sinov',
        sourceId: manba,
        idempotencyKey: `charge-${manba}`,
      }),
    );

    await prisma.$transaction((tx) =>
      refundWallet(tx, {
        walletId: wallet.id,
        amountTiyin: summa,
        description: 'Sinov qaytarildi',
        sourceModule: 'sinov',
        sourceId: manba,
        idempotencyKey: `refund-${manba}`,
      }),
    );

    expect(await balans(odam.id)).toBe(60_000n * TIYIN_IN_SOM);
  });

  it('MUZLATILGAN hamyonga pul QAYTARILADI', async () => {
    /*
      Muzlatish — pulni SARFLASHNI to'xtatadi, egalikni emas.
      Qaytarilayotgan pul foydalanuvchinikidir; uni ushlab qolish
      o'zlashtirish bo'lardi.
    */
    const odam = await sinovOdam();
    await pulQoy(odam.id, 40_000);
    const wallet = await getOrCreateWallet(odam.id);
    await prisma.wallet.update({ where: { id: wallet.id }, data: { status: WalletStatus.FROZEN } });

    await prisma.$transaction((tx) =>
      refundWallet(tx, {
        walletId: wallet.id,
        amountTiyin: 15_000n * TIYIN_IN_SOM,
        description: 'Sinov qaytarildi',
        sourceModule: 'sinov',
        sourceId: randomUUID(),
        idempotencyKey: `k-${randomUUID()}`,
      }),
    );

    expect(await balans(odam.id)).toBe(55_000n * TIYIN_IN_SOM);
  });

  it('daromad MUZLATILGAN hamyonga ham yoziladi', async () => {
    const odam = await sinovOdam();
    const wallet = await getOrCreateWallet(odam.id);
    await prisma.wallet.update({ where: { id: wallet.id }, data: { status: WalletStatus.FROZEN } });

    await prisma.$transaction((tx) =>
      creditEarning(tx, {
        walletId: wallet.id,
        amountTiyin: 12_000n * TIYIN_IN_SOM,
        description: 'Safar haqi',
        sourceModule: 'sinov',
        sourceId: randomUUID(),
        idempotencyKey: `k-${randomUUID()}`,
      }),
    );

    expect(await balans(odam.id)).toBe(12_000n * TIYIN_IN_SOM);
  });
});

describe.skipIf(!BAZA_BOR)('hisobot', () => {
  it('balans va oxirgi amallar mos keladi', async () => {
    const odam = await sinovOdam();
    await pulQoy(odam.id, 45_000);

    const summary = await getWalletSummary(odam.id);

    expect(BigInt(summary.balance)).toBe(45_000n * TIYIN_IN_SOM);
    expect(BigInt(summary.available)).toBe(45_000n * TIYIN_IN_SOM);
    expect(summary.recentTransactions.length).toBeGreaterThan(0);
  });
});
