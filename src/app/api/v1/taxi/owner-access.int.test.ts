import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { Role } from '@/config/rbac';
import { balans, chaqir, sinovOdam, sorov, tozala, type SinovOdam } from '@/test/api-harness';
import { acceptRide, advanceRide, createRide, setDriverOnline } from '@/modules/taxi/taxi.service';
import { topUp } from '@/modules/wallet/wallet.service';

import { GET as rideGet } from '@/app/api/v1/taxi/rides/[id]/route';
import { POST as rideCancel } from '@/app/api/v1/taxi/rides/[id]/cancel/route';
import { POST as rideRate } from '@/app/api/v1/taxi/rides/[id]/rate/route';
import { POST as rideShare } from '@/app/api/v1/taxi/rides/[id]/share/route';
import { POST as rideChat } from '@/app/api/v1/taxi/rides/[id]/chat/route';
import { POST as rideAlert } from '@/app/api/v1/taxi/rides/[id]/alert/route';
import { POST as driverAccept } from '@/app/api/v1/taxi/driver/rides/[id]/accept/route';
import { POST as driverCancel } from '@/app/api/v1/taxi/driver/rides/[id]/cancel/route';
import { POST as driverComplete } from '@/app/api/v1/taxi/driver/rides/[id]/complete/route';
import { POST as driverStep } from '@/app/api/v1/taxi/driver/rides/[id]/step/route';

/**
 * TAKSI — kim nimaga tegishi mumkinligi.
 *
 * ── Taksining boshqa modullardan farqi: IKKI EGA ──────────────────────
 * Posilkada bitta ega bor — jo'natuvchi. Taksida esa safar ikki odamga
 * tegishli: yo'lovchi va haydovchi. Va ularning huquqlari BIR XIL EMAS:
 *
 *   - safarni bekor qilish, baholash, ulashish -> faqat YO'LOVCHI
 *   - qabul qilish, bosqichni surish, yakunlash -> faqat HAYDOVCHI
 *   - suhbat va xavfsizlik signali            -> IKKALASI ham
 *
 * Shuning uchun "egasimi?" degan savol yetarli emas: "QAYSI egasi?"
 * deb so'rash kerak. Xato qilish oson, oqibati esa og'ir — pul
 * bevosita haydovchiga o'tadigan yagona modul shu.
 */

const BAZA_BOR = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return true;
  } catch {
    return false;
  }
})();

const QAYERDAN = { latitude: 41.3111, longitude: 69.2797 };
const QAYERGA = { latitude: 41.3275, longitude: 69.2817 };
const TARIF = 'ECONOM' as const;

/** Sinov yaratgan suhbatlar — foydalanuvchi o'chganda ular qolib ketadi. */
const suhbatlar: string[] = [];

afterAll(async () => {
  if (!BAZA_BOR) return;

  await tozala();

  if (suhbatlar.length > 0) {
    await prisma.conversation.deleteMany({ where: { id: { in: suhbatlar } } });
  }

  await prisma.$disconnect();
});

/** Hamyoni to'ldirilgan yo'lovchi. */
async function yolovchi(): Promise<SinovOdam> {
  const odam = await sinovOdam();

  await topUp(odam.userId, { amount: 500_000, method: 'CARD', idempotencyKey: `seed-${randomUUID()}` });

  return odam;
}

/**
 * Onlayn haydovchi.
 *
 * Token'da `DRIVER` roli bor — haydovchi yo'llari `requirePermission`
 * bilan himoyalangan va oddiy foydalanuvchi ularga umuman kira olmaydi.
 */
async function haydovchi(): Promise<SinovOdam> {
  const odam = await sinovOdam({ roles: [Role.DRIVER] });

  await prisma.taxiDriver.create({
    data: {
      userId: odam.userId,
      carModel: 'Cobalt',
      carColor: 'Oq',
      /*
        Raqam BAZADA yagona bo'lishi shart. Kichik tasodifiy oraliq
        (masalan 900 ta variant) parallel ishlaydigan sinovlarda
        vaqti-vaqti bilan takrorlanib, sinovni sababsiz yiqitardi.
      */
      plateNumber: `SIN${randomUUID().slice(0, 12).toUpperCase()}`,
      tariff: TARIF,
    },
  });

  await setDriverOnline(odam.userId, { isOnline: true });

  return odam;
}

/** Yo'lovchi buyurtma bergan safar. */
async function safar(rider: SinovOdam): Promise<string> {
  const ride = await createRide(rider.userId, {
    tariff: TARIF,
    fromLat: QAYERDAN.latitude,
    fromLng: QAYERDAN.longitude,
    fromAddress: "Amir Temur ko'chasi, 1",
    toLat: QAYERGA.latitude,
    toLng: QAYERGA.longitude,
    toAddress: "Navoiy ko'chasi, 40",
    idempotencyKey: `k-${randomUUID()}`,
  });

  return ride.id;
}

/**
 * Safarni YAKUNLASH mumkin bo'lgan holatga olib keladi.
 *
 * ── Nima uchun kerak (sinovning o'zidagi kamchilik edi) ───────────────
 * Avval begona haydovchi safarni endigina qabul qilingan holatda
 * yakunlashga urinardi va 409 olardi — "bu safar hali boshlanmagan".
 * Ya'ni egalik tekshiruvi olib tashlansa ham sinov yiqilardi, lekin
 * BOSHQA sabab bilan: pul harakatiga umuman yetib borilmasdi.
 *
 * Endi safar haqiqatan boshlanadi. Shunda egalik tekshiruvi
 * yo'qolsa, begona haydovchi ROSTDAN haq olib qoladi — va sinov
 * aynan shuni ushlaydi.
 */
async function safarniBoshla(driver: SinovOdam, rideId: string): Promise<void> {
  await advanceRide(driver.userId, rideId, 'ARRIVED');
  await advanceRide(driver.userId, rideId, 'START');
}

/** Safarning hozirgi holati va tayinlangan haydovchisi. */
async function safarHolati(rideId: string) {
  return prisma.taxiRide.findUnique({
    where: { id: rideId },
    select: { status: true, driverId: true, rating: true, shareToken: true },
  });
}

describe.skipIf(!BAZA_BOR)("yo'lovchi yo'llari — faqat SAFAR EGASI", () => {
  /*
    Bu yo'llarda haydovchining ham ishi yo'q: safarni bekor qilish,
    baholash va ulashish — yo'lovchining huquqi.
  */

  it("GET /rides/[id] — begona yo'lovchi ocholmaydi", async () => {
    const ega = await yolovchi();
    const rideId = await safar(ega);
    const begona = await yolovchi();

    const javob = await chaqir(rideGet, sorov('GET', `/api/v1/taxi/rides/${rideId}`, { token: begona.token }), {
      id: rideId,
    });

    expect(javob.status).toBe(404);
  });

  it('POST /rides/[id]/cancel — begona bekor qilolmaydi va pul joyida qoladi', async () => {
    const ega = await yolovchi();
    const rideId = await safar(ega);
    const begona = await yolovchi();

    const holatOldin = await safarHolati(rideId);
    const egaOldin = await balans(ega.userId);

    const javob = await chaqir(
      rideCancel,
      sorov('POST', `/api/v1/taxi/rides/${rideId}/cancel`, { token: begona.token, body: {} }),
      { id: rideId },
    );

    expect(javob.status).toBe(404);
    expect((await safarHolati(rideId))?.status, "safar holati o'zgardi").toBe(holatOldin?.status);
    expect(await balans(ega.userId), "egasining puli o'zgardi").toBe(egaOldin);
  });

  it("POST /rides/[id]/rate — begona baho qo'yolmaydi", async () => {
    /*
      Baho haydovchining reytingiga qo'shiladi. Begona odam baho
      qo'ya olsa, raqobatchi haydovchini bir necha akkaunt bilan
      pastga tushirardi.
    */
    const ega = await yolovchi();
    const rideId = await safar(ega);
    const begona = await yolovchi();

    const javob = await chaqir(
      rideRate,
      sorov('POST', `/api/v1/taxi/rides/${rideId}/rate`, { token: begona.token, body: { rating: 1 } }),
      { id: rideId },
    );

    expect(javob.status).toBe(404);
    expect((await safarHolati(rideId))?.rating, 'baho yozilib qoldi').toBeNull();
  });

  it('POST /rides/[id]/share — begona ulasha olmaydi', async () => {
    /*
      Ulashish kaliti safarni TOKENSIZ ko'rish imkonini beradi.
      Begona odam uni yarata olsa, o'zi uchun doimiy kuzatuv
      oynasini ochib olardi.
    */
    const ega = await yolovchi();
    const rideId = await safar(ega);
    const begona = await yolovchi();

    const javob = await chaqir(
      rideShare,
      sorov('POST', `/api/v1/taxi/rides/${rideId}/share`, { token: begona.token, body: {} }),
      { id: rideId },
    );

    expect(javob.status).toBe(404);
    expect((await safarHolati(rideId))?.shareToken, 'ulashish kaliti yaratilib qoldi').toBeNull();
  });
});

describe.skipIf(!BAZA_BOR)("haydovchi yo'llari — faqat TAYINLANGAN haydovchi", () => {
  it('accept — oddiy foydalanuvchi umuman kira olmaydi (403)', async () => {
    /*
      Bu yo'l `requirePermission` bilan himoyalangan: "kirgan"
      bo'lish yetarli emas, HAYDOVCHI roli kerak.

      404 emas, 403 kutiladi: bu safar topilmadi degani emas,
      "sizda bu huquq yo'q" degani.
    */
    const ega = await yolovchi();
    const rideId = await safar(ega);
    const oddiy = await yolovchi();

    const javob = await chaqir(
      driverAccept,
      sorov('POST', `/api/v1/taxi/driver/rides/${rideId}/accept`, { token: oddiy.token, body: {} }),
      { id: rideId },
    );

    expect(javob.status).toBe(403);
    expect((await safarHolati(rideId))?.driverId, 'haydovchi tayinlanib qoldi').toBeNull();
  });

  it("accept — safarni IKKINCHI haydovchi olib bo'lmaydi", async () => {
    /*
      ── Eng muhim qoida ─────────────────────────────────────────────
      Ikki haydovchi bir safarga yo'l olsa, biri bekorga yurgan
      bo'ladi va yo'lovchi qaysi mashinaga chiqishni bilmaydi.

      Tekshiruv so'rovning O'ZIDA: `driverId: null` sharti bilan
      yangilanadi, ya'ni ikkinchi so'rov nol qator topadi.
    */
    const ega = await yolovchi();
    const rideId = await safar(ega);

    const birinchi = await haydovchi();
    await acceptRide(birinchi.userId, rideId);

    const tayinlangan = (await safarHolati(rideId))?.driverId;

    const ikkinchi = await haydovchi();

    const javob = await chaqir(
      driverAccept,
      sorov('POST', `/api/v1/taxi/driver/rides/${rideId}/accept`, { token: ikkinchi.token, body: {} }),
      { id: rideId },
    );

    expect(javob.status).toBe(409);
    expect((await safarHolati(rideId))?.driverId, 'haydovchi almashib qoldi').toBe(tayinlangan);
  });

  it('complete — BEGONA haydovchi yakunlay olmaydi va haq olmaydi', async () => {
    /*
      ── Pul nuqtai nazaridan eng xavfli holat ───────────────────────
      Safar yakunlanganda haq HAYDOVCHINING hamyoniga o'tadi.
      Begona haydovchi yakunlay olsa, u boshqaning ishi uchun pul
      olardi — va yo'lovchidan pul yechilardi.

      Shuning uchun javob kodi yetarli emas: begona haydovchining
      puli oshmaganini ham tekshiramiz.
    */
    const ega = await yolovchi();
    const rideId = await safar(ega);

    const oz = await haydovchi();
    await acceptRide(oz.userId, rideId);
    await safarniBoshla(oz, rideId);

    const begona = await haydovchi();

    const holatOldin = await safarHolati(rideId);
    const begonaOldin = await balans(begona.userId);
    const egaOldin = await balans(ega.userId);

    const javob = await chaqir(
      driverComplete,
      sorov('POST', `/api/v1/taxi/driver/rides/${rideId}/complete`, { token: begona.token, body: {} }),
      { id: rideId },
    );

    /*
      Aniq kod (404 yoki 409) bu yerda muhim emas — yakunlash IKKI
      joyda haydovchi bo'yicha cheklangan (o'qishda ham, yozishda
      ham), shuning uchun qaysi biri ushlashiga qarab kod o'zgaradi.
      Muhimi — 200 EMAS va hech narsa o'zgarmagan.
    */
    expect(javob.status).not.toBe(200);
    expect((await safarHolati(rideId))?.status, "safar holati o'zgardi").toBe(holatOldin?.status);
    expect(await balans(begona.userId), 'begona haydovchi haq oldi').toBe(begonaOldin);
    expect(await balans(ega.userId), "yo'lovchidan pul yechildi").toBe(egaOldin);
  });

  it('cancel — BEGONA haydovchi bekor qilolmaydi', async () => {
    const ega = await yolovchi();
    const rideId = await safar(ega);

    const oz = await haydovchi();
    await acceptRide(oz.userId, rideId);

    const begona = await haydovchi();
    const holatOldin = await safarHolati(rideId);

    const javob = await chaqir(
      driverCancel,
      sorov('POST', `/api/v1/taxi/driver/rides/${rideId}/cancel`, { token: begona.token, body: {} }),
      { id: rideId },
    );

    expect(javob.status).toBe(404);
    expect((await safarHolati(rideId))?.status, "safar holati o'zgardi").toBe(holatOldin?.status);
    expect((await safarHolati(rideId))?.driverId, 'haydovchi olib tashlandi').toBe(holatOldin?.driverId);
  });

  it('step — BEGONA haydovchi bosqichni surolmaydi', async () => {
    /*
      "Yetib keldim" bosqichi yo'lovchiga xabar yuboradi. Begona
      haydovchi uni sursa, yo'lovchi ko'chaga chiqib, hech kimni
      topmasdi.
    */
    const ega = await yolovchi();
    const rideId = await safar(ega);

    const oz = await haydovchi();
    await acceptRide(oz.userId, rideId);

    const begona = await haydovchi();
    const holatOldin = await safarHolati(rideId);

    const javob = await chaqir(
      driverStep,
      sorov('POST', `/api/v1/taxi/driver/rides/${rideId}/step`, {
        token: begona.token,
        body: { step: 'ARRIVED' },
      }),
      { id: rideId },
    );

    expect(javob.status).not.toBe(200);
    expect((await safarHolati(rideId))?.status, "safar holati o'zgardi").toBe(holatOldin?.status);
  });
});

describe.skipIf(!BAZA_BOR)("ikki tomonga ochiq yo'llar", () => {
  /*
    Bu yo'llarda himoya juda QATTIQ bo'lib qolmasligi kerak:
    haydovchi ham, yo'lovchi ham kira olishi shart. Aks holda
    safar davomida ular bir-biri bilan bog'lana olmasdi.
  */

  it("chat — yo'lovchi ham, tayinlangan haydovchi ham ocha oladi", async () => {
    const ega = await yolovchi();
    const rideId = await safar(ega);

    const oz = await haydovchi();
    await acceptRide(oz.userId, rideId);

    const yolovchiJavob = await chaqir(
      rideChat,
      sorov('POST', `/api/v1/taxi/rides/${rideId}/chat`, { token: ega.token, body: {} }),
      { id: rideId },
    );

    const haydovchiJavob = await chaqir(
      rideChat,
      sorov('POST', `/api/v1/taxi/rides/${rideId}/chat`, { token: oz.token, body: {} }),
      { id: rideId },
    );

    /*
      Tozalash ro'yxati TEKSHIRUVDAN OLDIN to'ldiriladi.

      ── Nima uchun (haqiqiy xato) ───────────────────────────────────
      Avval bu satrlar `expect` dan KEYIN turardi. Tekshiruv yiqilsa
      esa ulargacha yetib borilmasdi va yaratilgan suhbat bazada
      qolib ketardi. Aynan shunday bir qator mutatsiya sinovidan
      keyin topildi: tozalash hisobi hech qachon tekshiruv ortida
      turmasligi kerak.
    */
    for (const javob of [yolovchiJavob, haydovchiJavob]) {
      const id = (javob.body.data as { conversationId?: string } | undefined)?.conversationId;

      if (id) suhbatlar.push(id);
    }

    expect([200, 201]).toContain(yolovchiJavob.status);
    expect([200, 201]).toContain(haydovchiJavob.status);
  });

  it('chat — BEGONA odam ocholmaydi', async () => {
    const ega = await yolovchi();
    const rideId = await safar(ega);

    const oz = await haydovchi();
    await acceptRide(oz.userId, rideId);

    const begona = await yolovchi();

    const javob = await chaqir(
      rideChat,
      sorov('POST', `/api/v1/taxi/rides/${rideId}/chat`, { token: begona.token, body: {} }),
      { id: rideId },
    );

    expect(javob.status).toBe(404);
  });

  it('alert — tayinlangan HAYDOVCHI ham signal bera oladi', async () => {
    /*
      ── Nima uchun bu sinov bor (mutatsiya ochib berdi) ─────────────
      Avval faqat "begona berolmaydi" tekshirilardi. Signal shartini
      `rider YOKI driver` dan faqat `rider` ga toraytirib ko'rdim —
      va hech bir sinov yiqilmadi. Ya'ni haydovchini butunlay
      to'sib qo'yish sezilmasdan o'tib ketardi.

      Xavf haqiqiy: xavf ostida qolgan haydovchi yordam chaqira
      olmasdi.
    */
    const ega = await yolovchi();
    const rideId = await safar(ega);

    const oz = await haydovchi();
    await acceptRide(oz.userId, rideId);

    const javob = await chaqir(
      rideAlert,
      sorov('POST', `/api/v1/taxi/rides/${rideId}/alert`, { token: oz.token, body: {} }),
      { id: rideId },
    );

    expect([200, 201]).toContain(javob.status);
  });

  it('alert — BEGONA odam xavfsizlik signalini berolmaydi', async () => {
    /*
      Signal qo'llab-quvvatlash xizmatiga boradi. Begona odam uni
      bera olsa, yolg'on chaqiruvlar bilan xizmatni ko'mib
      tashlardi va haqiqiy signal ko'zdan qochardi.
    */
    const ega = await yolovchi();
    const rideId = await safar(ega);

    const oz = await haydovchi();
    await acceptRide(oz.userId, rideId);

    const begona = await yolovchi();

    const javob = await chaqir(
      rideAlert,
      sorov('POST', `/api/v1/taxi/rides/${rideId}/alert`, { token: begona.token, body: {} }),
      { id: rideId },
    );

    expect(javob.status).toBe(404);
  });
});
