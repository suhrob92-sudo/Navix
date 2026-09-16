import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { balans, chaqir, sinovOdam, sorov, tozala, type SinovOdam, type YolFunksiyasi } from '@/test/api-harness';
import { topUp } from '@/modules/wallet/wallet.service';

import { GET as parcelGet } from '@/app/api/v1/parcels/[id]/route';
import { POST as parcelCancel } from '@/app/api/v1/parcels/[id]/cancel/route';
import { GET as hotelGet } from '@/app/api/v1/hotels/bookings/[id]/route';
import { POST as hotelCancel } from '@/app/api/v1/hotels/bookings/[id]/cancel/route';
import { GET as ticketGet } from '@/app/api/v1/travel/tickets/[id]/route';
import { POST as ticketCancel } from '@/app/api/v1/travel/tickets/[id]/cancel/route';
import { GET as foodGet } from '@/app/api/v1/food/orders/[id]/route';
import { POST as foodCancel } from '@/app/api/v1/food/orders/[id]/cancel/route';
import { GET as marketGet } from '@/app/api/v1/market/orders/[id]/route';
import { POST as marketCancel } from '@/app/api/v1/market/orders/[id]/cancel/route';

import { createParcel } from '@/modules/parcel/parcel.service';
import { createBooking } from '@/modules/hotel/hotel.service';
import { createTicket } from '@/modules/travel/travel.service';
import { createFoodOrder } from '@/modules/food/food.service';
import { createMarketOrder } from '@/modules/market/market.service';

/**
 * BOSHQA ODAMNING buyurtmasiga tegib bo'lmasligi.
 *
 * ── Nima uchun xizmat sinovlari YETARLI EMAS ──────────────────────────
 * Xizmat sinovi funksiyani to'g'ridan chaqiradi va `userId` ni O'ZI
 * beradi — ya'ni u har doim to'g'ri egani uzatadi. Haqiqiy xavf esa
 * boshqa joyda: manzildagi ID ni almashtirib, o'zining token'i bilan
 * BEGONA buyurtmani so'rash.
 *
 * Bu — eng keng tarqalgan veb-teshik (IDOR). Undan foydalanish uchun
 * hech qanday maxsus bilim kerak emas: manzildagi raqamni o'zgartirish
 * yetarli. Shuning uchun u haqiqiy so'rov bilan tekshiriladi.
 *
 * Har yo'l uchun IKKI savol beriladi:
 *   1. Token'siz odam nima ko'radi?  -> 401 bo'lishi SHART.
 *   2. Boshqa foydalanuvchi nima ko'radi? -> 200 BO'LMASLIGI shart.
 */

const BAZA_BOR = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return true;
  } catch {
    return false;
  }
})();

/* ── Bazadagi tayyor ma'lumot: yo'q bo'lsa, tegishli holat o'tkaziladi ── */

const XONA = BAZA_BOR
  ? await prisma.hotelRoom.findFirst({
      where: { isActive: true, hotel: { isActive: true } },
      select: { id: true },
    })
  : null;

const REYS = BAZA_BOR
  ? await prisma.tripSchedule.findFirst({
      where: { isActive: true },
      select: { id: true, weekdays: true },
    })
  : null;

const RESTORAN = BAZA_BOR
  ? await prisma.restaurant.findFirst({
      where: { isActive: true, items: { some: { isAvailable: true } } },
      select: { id: true, items: { where: { isAvailable: true }, take: 1, select: { id: true } } },
    })
  : null;

/**
 * Bozor uchun mahsulot sinovning O'ZI yaratadi, bazadan tanlanmaydi.
 *
 * ── Nima uchun (haqiqiy xato) ─────────────────────────────────────────
 * Avval tayyor mahsulot tanlanardi. Lekin `market.service.int.test.ts`
 * ham AYNAN shu mahsulotni tanlaydi (ikkalasi ham "zaxirasi yetarli"
 * deb izlaydi) va ular parallel ishlaydi. Natijada zaxira ikki
 * tomondan kamayib, sinovlar goh o'tib, goh yiqilardi — sabab esa
 * tekshirilayotgan koddan emas, sinovlarning bir-biriga xalaqit
 * berishidan edi.
 *
 * O'z do'koni va o'z mahsuloti bilan bunday to'qnashuv umuman
 * bo'lmaydi.
 */
const TURKUM = BAZA_BOR ? await prisma.productCategory.findFirst({ select: { id: true } }) : null;

const MAHSULOT =
  BAZA_BOR && TURKUM !== null
    ? await (async () => {
        const belgi = randomUUID().slice(0, 8);

        const shop = await prisma.shop.create({
          data: {
            slug: `sinov-dokon-${belgi}`,
            name: `Sinov do'koni ${belgi}`,
            description: 'API egalik sinovi uchun',
            searchName: `sinov dokon ${belgi}`,
            deliveryFee: 0n,
            /* Eng kichik buyurtma NOL: shunda bitta dona ham yetarli. */
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
            /* Har sinov bittadan oladi — zaxira ortig'i bilan yetadi. */
            stock: 500,
          },
          select: { id: true, shopId: true },
        });

        return { id: product.id, shopId: shop.id };
      })()
    : null;

afterAll(async () => {
  if (!BAZA_BOR) return;

  await tozala();

  /*
    Sinov yaratgan do'kon va mahsulot — `tozala()` ular haqida bilmaydi.

    Buyurtma qatorlari allaqachon yo'q: buyurtma o'chirilganda ular
    ham kaskad bilan ketadi.
  */
  if (MAHSULOT) {
    await prisma.product.deleteMany({ where: { id: MAHSULOT.id } });
    await prisma.shop.deleteMany({ where: { id: MAHSULOT.shopId } });
  }

  await prisma.$disconnect();
});

/** Hamyoni to'ldirilgan foydalanuvchi — buyurtma uchun pul kerak. */
async function boyOdam(som = 3_000_000): Promise<SinovOdam> {
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

/** Reys qatnaydigan kelajakdagi sana. */
function qatnovSanasi(): string {
  for (let i = 5; i < 60; i += 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + i);

    const iso = d.getUTCDay() === 0 ? 7 : d.getUTCDay();

    if (REYS!.weekdays.includes(iso)) return d.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

function sana(kundanKeyin: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + kundanKeyin);

  return d.toISOString().slice(0, 10);
}

/** Bir sinov holati: kimdir nimadir yaratadi, keyin unga begona tegishga urinadi. */
interface Holat {
  nom: string;
  tayyor: boolean;
  /** Egasi uchun resurs yaratadi va uning ID sini qaytaradi. */
  yarat: (ega: SinovOdam) => Promise<string>;
  /**
   * Resursning HOZIRGI holati (`CONFIRMED`, `CANCELLED` ...).
   *
   * Javob kodining o'zi yetarli emasligi shu yerda hal bo'ladi —
   * sababi pastda, "BEGONA odam" sinovida yozilgan.
   */
  holati: (id: string) => Promise<string | null>;
  /** Shu resursga tegadigan yo'llar. */
  yollar: ReadonlyArray<{
    nom: string;
    method: string;
    path: string;
    handler: YolFunksiyasi<{ id: string }>;
    body?: unknown;
  }>;
}

let navbat = 200;

const HOLATLAR: readonly Holat[] = [
  {
    nom: 'posilka',
    tayyor: BAZA_BOR,
    yarat: async (ega) => {
      const parcel = await createParcel(ega.userId, {
        fromRegion: 'Toshkent shahri',
        fromAddress: "Amir Temur ko'chasi, 12-uy",
        toRegion: 'Toshkent shahri',
        toAddress: "Navoiy ko'chasi, 40-uy",
        recipientName: 'Qabul Qiluvchi',
        recipientPhone: '+998901112233',
        description: 'Hujjatlar papkasi',
        weightGrams: 500,
        idempotencyKey: `k-${randomUUID()}`,
      });

      return parcel.id;
    },
    /*
      Posilkada `status` ustuni yo'q: bekor qilinganligi `cancelledAt`
      to'ldirilishi bilan bilinadi. Shuning uchun holat shundan
      yasaladi — sinov modelga moslashadi, model sinovga emas.
    */
    holati: async (id) => {
      const row = await prisma.parcel.findUnique({ where: { id }, select: { cancelledAt: true } });

      if (!row) return null;

      return row.cancelledAt === null ? 'FAOL' : 'BEKOR';
    },
    yollar: [
      { nom: 'GET /parcels/[id]', method: 'GET', path: '/api/v1/parcels', handler: parcelGet },
      {
        nom: 'POST /parcels/[id]/cancel',
        method: 'POST',
        path: '/api/v1/parcels',
        handler: parcelCancel,
        body: {},
      },
    ],
  },
  {
    nom: 'mehmonxona bandlovi',
    tayyor: BAZA_BOR && XONA !== null,
    yarat: async (ega) => {
      navbat += 4;

      const booking = await createBooking(ega.userId, {
        roomId: XONA!.id,
        checkIn: sana(navbat),
        checkOut: sana(navbat + 2),
        guests: 1,
        guestName: 'Sinov Mehmon',
        guestPhone: '+998901112233',
        idempotencyKey: `k-${randomUUID()}`,
      });

      return booking.id;
    },
    holati: async (id) =>
      (await prisma.hotelBooking.findUnique({ where: { id }, select: { status: true } }))?.status ?? null,
    yollar: [
      { nom: 'GET /hotels/bookings/[id]', method: 'GET', path: '/api/v1/hotels/bookings', handler: hotelGet },
      {
        nom: 'POST /hotels/bookings/[id]/cancel',
        method: 'POST',
        path: '/api/v1/hotels/bookings',
        handler: hotelCancel,
        body: {},
      },
    ],
  },
  {
    nom: 'sayohat chiptasi',
    tayyor: BAZA_BOR && REYS !== null && REYS.weekdays.length > 0,
    yarat: async (ega) => {
      const ticket = await createTicket(ega.userId, {
        scheduleId: REYS!.id,
        departDate: qatnovSanasi(),
        seats: 1,
        passengerName: "Sinov Yo'lovchi",
        passengerPhone: '+998901112233',
        idempotencyKey: `k-${randomUUID()}`,
      });

      return ticket.id;
    },
    holati: async (id) =>
      (await prisma.tripBooking.findUnique({ where: { id }, select: { status: true } }))?.status ?? null,
    yollar: [
      { nom: 'GET /travel/tickets/[id]', method: 'GET', path: '/api/v1/travel/tickets', handler: ticketGet },
      {
        nom: 'POST /travel/tickets/[id]/cancel',
        method: 'POST',
        path: '/api/v1/travel/tickets',
        handler: ticketCancel,
        body: {},
      },
    ],
  },
  {
    nom: 'ovqat buyurtmasi',
    tayyor: BAZA_BOR && RESTORAN !== null && RESTORAN.items.length > 0,
    yarat: async (ega) => {
      const order = await createFoodOrder(ega.userId, {
        restaurantId: RESTORAN!.id,
        addressId: await manzil(ega.userId),
        items: [{ menuItemId: RESTORAN!.items[0]!.id, quantity: 3 }],
        idempotencyKey: `k-${randomUUID()}`,
      });

      return order.id;
    },
    holati: async (id) =>
      (await prisma.foodOrder.findUnique({ where: { id }, select: { status: true } }))?.status ?? null,
    yollar: [
      { nom: 'GET /food/orders/[id]', method: 'GET', path: '/api/v1/food/orders', handler: foodGet },
      {
        nom: 'POST /food/orders/[id]/cancel',
        method: 'POST',
        path: '/api/v1/food/orders',
        handler: foodCancel,
        body: {},
      },
    ],
  },
  {
    nom: 'bozor buyurtmasi',
    tayyor: BAZA_BOR && MAHSULOT !== null,
    yarat: async (ega) => {
      const order = await createMarketOrder(ega.userId, {
        shopId: MAHSULOT!.shopId,
        addressId: await manzil(ega.userId),
        items: [{ productId: MAHSULOT!.id, quantity: 1 }],
        idempotencyKey: `k-${randomUUID()}`,
      });

      return order.id;
    },
    holati: async (id) =>
      (await prisma.marketOrder.findUnique({ where: { id }, select: { status: true } }))?.status ?? null,
    yollar: [
      { nom: 'GET /market/orders/[id]', method: 'GET', path: '/api/v1/market/orders', handler: marketGet },
      {
        nom: 'POST /market/orders/[id]/cancel',
        method: 'POST',
        path: '/api/v1/market/orders',
        handler: marketCancel,
        body: {},
      },
    ],
  },
];

for (const holat of HOLATLAR) {
  describe.skipIf(!holat.tayyor)(holat.nom, () => {
    for (const yol of holat.yollar) {
      it(`${yol.nom} — TOKENSIZ so'rov 401 qaytaradi`, async () => {
        const ega = await boyOdam();
        const id = await holat.yarat(ega);

        const javob = await chaqir(yol.handler, sorov(yol.method, `${yol.path}/${id}`, { body: yol.body }), {
          id,
        });

        expect(javob.status).toBe(401);
      });

      it(`${yol.nom} — BEGONA odam ocholmaydi`, async () => {
        /*
          ── Eng muhim tekshiruv ─────────────────────────────────────
          Begona odamning O'Z token'i bor — ya'ni u tizimga kirgan,
          faqat buyurtma uniki emas. U manzildagi ID ni almashtirdi.

          ── Nima uchun javob kodining O'ZI yetarli emas ─────────────
          Bu sinov avval faqat holat kodini tekshirardi va SHU SABABLI
          haqiqiy teshikni o'tkazib yubordi.

          Sabab: bekor qilish funksiyasi oxirida javobni egasi bo'yicha
          qayta o'qiydi (`getBooking(userId, ...)`). Ya'ni egalik
          tekshiruvi yo'qolsa ham, oxirgi o'qish begonaga 404 qaytaradi
          — LEKIN bandlov o'sha payt allaqachon bekor qilingan va pul
          BEGONANING hamyoniga o'tkazilgan bo'ladi.

          Shuning uchun natija emas, OQIBAT tekshiriladi: buyurtma
          holati o'zgarmaganmi va pul joyidami.
        */
        const ega = await boyOdam();
        const id = await holat.yarat(ega);
        const begona = await boyOdam();

        const holatOldin = await holat.holati(id);
        const egaOldin = await balans(ega.userId);
        const begonaOldin = await balans(begona.userId);

        const javob = await chaqir(
          yol.handler,
          sorov(yol.method, `${yol.path}/${id}`, { token: begona.token, body: yol.body }),
          { id },
        );

        // 404 hatto 403 dan yaxshiroq: u buyurtma BORLIGINI ham oshkor qilmaydi.
        expect([403, 404]).toContain(javob.status);

        expect(await holat.holati(id), "buyurtma holati o'zgardi").toBe(holatOldin);
        expect(await balans(ega.userId), 'egasining puli kamaydi').toBe(egaOldin);
        expect(await balans(begona.userId), "begonaning puli ko'paydi").toBe(begonaOldin);
      });

      it(`${yol.nom} — EGASI o'zinikini ocha oladi`, async () => {
        /*
          Teskari tomondan tekshiruv: himoya juda qattiq bo'lib,
          egasini ham to'sib qo'ymasligi kerak. Busiz "hammaga 403"
          qaytaradigan kod ham sinovdan o'tardi.
        */
        const ega = await boyOdam();
        const id = await holat.yarat(ega);

        const javob = await chaqir(
          yol.handler,
          sorov(yol.method, `${yol.path}/${id}`, { token: ega.token, body: yol.body }),
          { id },
        );

        expect(javob.status).toBe(200);
      });
    }
  });
}
