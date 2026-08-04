// ".env" faylini o'qiydi — bu skript Next.js'dan tashqarida ishlaydi.
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';
import { normalizeUzPhone } from '../src/lib/phone';

/**
 * Restoranni foydalanuvchiga biriktiradi va unga MERCHANT rolini beradi.
 *
 * ── Nima uchun skript ─────────────────────────────────────────────────
 * Restoran egasini tayinlash — biznes qarori: shartnoma imzolanadi,
 * hujjatlar tekshiriladi. Buni ilova ichidan "o'zim egaman" deb
 * bosib bo'lmasligi kerak.
 *
 * Keyinchalik bu amal admin panelga ko'chiriladi (ruxsat allaqachon
 * bor: `platform:role:manage`), lekin biriktirish baribir qo'lda
 * tasdiqlanadigan qadam bo'lib qoladi.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run restaurant:assign -- milliy-taomlar 901234567
 *   npm run restaurant:assign -- milliy-taomlar 901234567 remove
 */

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL topilmadi. ".env" faylini tekshiring.');
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function printUsage(): void {
  console.error('Ishlatish: npm run restaurant:assign -- <restoran-kodi> <telefon> [remove]');
  console.error('Namuna:    npm run restaurant:assign -- milliy-taomlar 901234567');
}

async function main(): Promise<void> {
  const [slug, rawPhone, action] = process.argv.slice(2);

  if (!slug || !rawPhone) {
    printUsage();
    process.exit(1);
  }

  const phone = normalizeUzPhone(rawPhone);

  if (!phone) {
    console.error(`❌ "${rawPhone}" — telefon raqami noto'g'ri. Namuna: 901234567`);
    process.exit(1);
  }

  const isRemoving = action === 'remove';
  const prisma = createClient();

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, name: true, ownerId: true },
    });

    if (!restaurant) {
      console.error(`❌ "${slug}" kodli restoran topilmadi.`);
      console.error("   Mavjud restoranlarni ko'rish uchun: npm run db:studio");
      process.exit(1);
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, firstName: true },
    });

    if (!user) {
      console.error(`❌ ${phone} raqamli foydalanuvchi topilmadi. Avval ilovada ro'yxatdan o'ting.`);
      process.exit(1);
    }

    if (isRemoving) {
      await prisma.restaurant.update({ where: { id: restaurant.id }, data: { ownerId: null } });
      console.info(`✅ "${restaurant.name}" restorani ${phone} dan olib tashlandi`);
    } else {
      await prisma.restaurant.update({ where: { id: restaurant.id }, data: { ownerId: user.id } });

      // MERCHANT roli — kabinetga kirish uchun.
      const role = await prisma.role.findUnique({ where: { name: 'MERCHANT' }, select: { id: true } });

      if (!role) {
        console.error('❌ MERCHANT roli bazada yo\'q. Avval "npm run db:seed" bajaring.');
        process.exit(1);
      }

      await prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });

      console.info(`✅ "${restaurant.name}" restorani ${phone} ga biriktirildi`);
      console.info('✅ MERCHANT roli berildi');
    }

    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: isRemoving ? 'merchant.restaurant.unassigned' : 'merchant.restaurant.assigned',
        resourceType: 'Restaurant',
        resourceId: restaurant.id,
        module: 'merchant',
        metadata: { slug, phone, via: 'cli' },
      },
    });

    if (!isRemoving) {
      console.info('');
      console.info('⚠️  Muhim: yangi rol faqat QAYTA KIRGANDAN keyin ishlaydi.');
      console.info('   Ilovadan chiqib, qaytadan kiring — keyin "Restoran kabineti" paydo bo\'ladi.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('❌ Bajarilmadi:', error);
  process.exit(1);
});
