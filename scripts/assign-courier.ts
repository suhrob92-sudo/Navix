// ".env" faylini o'qiydi — bu skript Next.js'dan tashqarida ishlaydi.
import 'dotenv/config';

import { connectDatabase, stripFlags } from './lib/db-target';
import { normalizeUzPhone } from '../src/lib/phone';

/**
 * Foydalanuvchiga KURYER rolini beradi.
 *
 * ── Nima uchun skript ─────────────────────────────────────────────────
 * Kuryer mijozlarning manzili va telefon raqamiga kirish huquqini
 * oladi. Bunday huquqni ilova ichidan "o'zim kuryerman" deb bosib
 * olish mumkin bo'lmasligi kerak — hujjat tekshiriladi va shartnoma
 * imzolanadi.
 *
 * Do'kon va restoran biriktirishdan farqi: kuryerga hech narsa
 * biriktirilmaydi. U umumiy ro'yxatdan ish oladi, ya'ni faqat ROL
 * beriladi.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run courier:assign -- 901234567
 *   npm run courier:assign -- 901234567 remove
 */

function printUsage(): void {
  console.error('Ishlatish: npm run courier:assign -- <telefon> [remove]');
  console.error('Namuna:    npm run courier:assign -- 901234567');
}

async function main(): Promise<void> {
  const [rawPhone, action] = stripFlags(process.argv.slice(2));

  if (!rawPhone) {
    printUsage();
    process.exit(1);
  }

  const phone = normalizeUzPhone(rawPhone);

  if (!phone) {
    console.error(`❌ "${rawPhone}" — telefon raqami noto'g'ri. Namuna: 901234567`);
    process.exit(1);
  }

  const isRemoving = action === 'remove';
  const { prisma } = connectDatabase(process.argv);

  try {
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, firstName: true },
    });

    if (!user) {
      console.error(`❌ ${phone} raqamli foydalanuvchi topilmadi. Avval ilovada ro'yxatdan o'ting.`);
      process.exit(1);
    }

    const role = await prisma.role.findUnique({ where: { name: 'COURIER' }, select: { id: true } });

    if (!role) {
      console.error('❌ COURIER roli bazada yo\'q. Avval "npm run db:seed" bajaring.');
      process.exit(1);
    }

    if (isRemoving) {
      await prisma.userRoleAssignment.deleteMany({ where: { userId: user.id, roleId: role.id } });
      console.info(`✅ ${phone} dan kuryer roli olib tashlandi`);
    } else {
      await prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });

      console.info(`✅ ${phone} ga KURYER roli berildi`);
    }

    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: isRemoving ? 'courier.unassigned' : 'courier.assigned',
        resourceType: 'User',
        resourceId: user.id,
        module: 'delivery',
        metadata: { phone, via: 'cli' },
      },
    });

    if (!isRemoving) {
      console.info('');
      console.info('⚠️  Muhim: yangi rol faqat QAYTA KIRGANDAN keyin ishlaydi.');
      console.info('   Ilovadan chiqib, qaytadan kiring — keyin "Kuryer kabineti" paydo bo\'ladi.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('❌ Bajarilmadi:', error);
  process.exit(1);
});
