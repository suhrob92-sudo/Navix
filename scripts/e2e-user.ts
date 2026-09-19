/**
 * E2E sinovlari uchun foydalanuvchi yaratadi va o'chiradi.
 *
 * ── Nima uchun ALOHIDA skript ─────────────────────────────────────────
 * Playwright sinov fayllarini o'z transformi bilan o'qiydi va Prisma'ning
 * generatsiya qilingan klienti u yerda ishlamaydi (`import.meta` xatosi).
 * Shuning uchun bazaga tegadigan ish alohida jarayonda, `tsx` orqali
 * bajariladi — u loyihada allaqachon ishlatiladi.
 *
 * ── Nima uchun foydalanuvchi bazaga TO'G'RIDAN yoziladi ───────────────
 * Ro'yxatdan o'tish oqimi SMS kodini talab qiladi va kod faqat server
 * logida bo'ladi. Uni logdan qidirish sinovni mo'rt qiladi: log
 * formati o'zgarsa, sinov sababsiz yiqilardi.
 *
 * Sinovning maqsadi — KIRISHDAN keyingi yo'lni tekshirish, ro'yxatdan
 * o'tishning o'zini emas (u alohida qamrab olingan).
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   tsx scripts/e2e-user.ts create            -> JSON: { userId, phone, password }
 *   tsx scripts/e2e-user.ts cleanup <userId>  -> o'chiradi
 */

// ".env" faylini o'qiydi — bu skript Next.js'dan tashqarida ishlaydi.
import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/modules/auth/password.service';
import { topUp } from '@/modules/wallet/wallet.service';

/** Sinov foydalanuvchilarini ajratib turadigan belgi. */
const FAMILIYA = 'E2E';

/**
 * Hamyonga qo'yiladigan summa — SO'MDA.
 *
 * Ba'zi sinovlar qimmatroq narsani sotib oladi (mehmonxona bandlovi
 * bir kechada 190 000 so'mdan boshlanadi), shuning uchun summa
 * buyruq satridan berilishi mumkin:
 *
 *   tsx scripts/e2e-user.ts create 1000000
 */
const STANDART_SUMMA = 250_000;

async function create(sumSom: number): Promise<void> {
  const phone = `+99893${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;
  const password = `Sinov-${randomUUID().slice(0, 8)}!`;

  const user = await prisma.user.create({
    data: {
      phone,
      firstName: 'Sinov',
      lastName: FAMILIYA,
      passwordHash: await hashPassword(password),
      /*
        Holat FAOL qilib belgilanadi.

        Kirish `status` ni tekshiradi (`phoneVerified` ni emas):
        yangi foydalanuvchi `PENDING_VERIFICATION` bo'ladi va login
        401 qaytarib, tasdiqlash sahifasiga yuboradi. Buni E2E
        sinovi birinchi ishga tushganda ko'rsatdi.
      */
      status: 'ACTIVE',
      phoneVerified: new Date(),
    },
    select: { id: true },
  });

  /*
    CUSTOMER roli — haqiqiy ro'yxatdan o'tish ham aynan shuni beradi
    (`auth.service.ts`, SMS kodi tasdiqlangan payt).

    Busiz foydalanuvchida `ORDER_CREATE` ruxsati bo'lmaydi va
    buyurtma berishda 403 chiqadi. Sinov birinchi ishga tushganda
    aynan shunday bo'ldi: ilova to'g'ri ishlayotgan edi, seed esa
    haqiqiy foydalanuvchiga o'xshamagan edi.
  */
  const customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' }, select: { id: true } });

  if (!customerRole) {
    throw new Error('CUSTOMER roli bazada yo\'q. Avval "npm run db:seed" bajaring.');
  }

  await prisma.userRoleAssignment.create({ data: { userId: user.id, roleId: customerRole.id } });

  /* Hamyonda pul bo'lsin: balans ekranda ko'rinishini tekshiramiz. */
  await topUp(user.id, { amount: sumSom, method: 'CARD', idempotencyKey: `e2e-${randomUUID()}` });

  /*
    Yetkazish manzili.

    Busiz savatda "Buyurtma berish uchun avval manzil qo'shing" chiqadi
    va tugma ishlamaydi — ya'ni buyurtma yo'lini umuman sinab
    bo'lmasdi.
  */
  await prisma.address.create({
    data: {
      userId: user.id,
      label: 'Uy',
      city: 'Toshkent',
      street: "Amir Temur ko'chasi, 12-uy",
      latitude: 41.3111,
      longitude: 69.2797,
      isDefault: true,
    },
  });

  console.log(JSON.stringify({ userId: user.id, phone, password }));
}

/**
 * Sinov restorani — SUTKA BO'YI ochiq.
 *
 * ── Nima uchun tayyor restoran ishlatilmaydi ──────────────────────────
 * Tayyor restoranlarning ish vaqti bor va "Buyurtma berish" tugmasi
 * yopiq paytda o'chiriladi — bu to'g'ri xulq. Lekin sinov o'sha
 * tugmani bosadi va kechqurun 23:00 dan keyin yiqilardi.
 *
 * Aynan shunday bo'ldi: sinov kunduzi o'tdi, kechqurun yiqildi.
 * Ilova to'g'ri edi, sinov esa soatga bog'liq edi.
 *
 * O'z restorani bilan bunday bog'liqlik umuman yo'q.
 */
async function createRestaurant(): Promise<void> {
  const belgi = randomUUID().slice(0, 8);

  const restaurant = await prisma.restaurant.create({
    data: {
      slug: `sinov-restoran-${belgi}`,
      name: `Sinov Oshxona ${belgi}`,
      description: "E2E sinovi uchun — sutka bo'yi ochiq",
      cuisine: 'Milliy',
      searchName: `sinov oshxona ${belgi}`,
      deliveryFee: 10_000_00n,
      minOrder: 0n,
      deliveryMinutes: 30,
      color: '#f97316',
      /* Haftaning HAR kuni, 00:00 dan 23:59 gacha. */
      hours: {
        /* Hafta kuni 0 dan 6 gacha — bazada shunday cheklov bor. */
        create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: 0, closesAt: 1439 })),
      },
    },
    select: { id: true, slug: true },
  });

  const category = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name: 'Issiq taomlar' },
    select: { id: true },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: category.id,
      name: 'Sinov taomi',
      searchName: 'sinov taomi',
      price: 45_000_00n,
    },
  });

  console.log(JSON.stringify({ restaurantId: restaurant.id, slug: restaurant.slug }));
}

async function cleanupRestaurant(restaurantId: string): Promise<void> {
  /* Menyu, turkum va ish vaqti kaskad bilan ketadi. */
  await prisma.restaurant.deleteMany({ where: { id: restaurantId } });

  console.log(JSON.stringify({ deleted: restaurantId }));
}

async function cleanup(userId: string): Promise<void> {
  const wallets = await prisma.wallet.findMany({ where: { userId }, select: { id: true } });

  await prisma.userRoleAssignment.deleteMany({ where: { userId } });
  await prisma.tripBooking.deleteMany({ where: { userId } });
  await prisma.hotelBooking.deleteMany({ where: { userId } });
  await prisma.foodOrder.deleteMany({ where: { userId } });
  await prisma.marketOrder.deleteMany({ where: { userId } });
  await prisma.address.deleteMany({ where: { userId } });
  await prisma.walletTransaction.deleteMany({ where: { walletId: { in: wallets.map((w) => w.id) } } });
  await prisma.wallet.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.auditLog.deleteMany({ where: { actorId: userId } });
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });

  console.log(JSON.stringify({ deleted: userId }));
}

/*
  Yuqori darajadagi `await` ishlatilmaydi: `tsx` bu faylni CJS
  formatida o'qiydi va u yerda qo'llab-quvvatlanmaydi.
*/
async function main(): Promise<void> {
  const [buyruq, argument] = process.argv.slice(2);

  try {
    if (buyruq === 'create') await create(argument ? Number(argument) : STANDART_SUMMA);
    else if (buyruq === 'restaurant') await createRestaurant();
    else if (buyruq === 'cleanup-restaurant' && argument) await cleanupRestaurant(argument);
    else if (buyruq === 'cleanup' && argument) await cleanup(argument);
    else {
      console.error(
        'Ishlatish: tsx scripts/e2e-user.ts create [summa] | cleanup <userId> | restaurant | cleanup-restaurant <id>',
      );
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
