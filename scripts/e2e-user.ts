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

async function create(): Promise<void> {
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
  await topUp(user.id, { amount: 250_000, method: 'CARD', idempotencyKey: `e2e-${randomUUID()}` });

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

async function cleanup(userId: string): Promise<void> {
  const wallets = await prisma.wallet.findMany({ where: { userId }, select: { id: true } });

  await prisma.userRoleAssignment.deleteMany({ where: { userId } });
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
    if (buyruq === 'create') await create();
    else if (buyruq === 'cleanup' && argument) await cleanup(argument);
    else {
      console.error('Ishlatish: tsx scripts/e2e-user.ts create | cleanup <userId>');
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
