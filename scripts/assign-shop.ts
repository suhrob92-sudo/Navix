// ".env" faylini o'qiydi — bu skript Next.js'dan tashqarida ishlaydi.
import 'dotenv/config';

import { connectDatabase, stripFlags } from './lib/db-target';
import { normalizeUzPhone } from '../src/lib/phone';

/**
 * Marketplace do'konini foydalanuvchiga biriktiradi va unga MERCHANT
 * rolini beradi.
 *
 * ── Nima uchun skript ─────────────────────────────────────────────────
 * Do'kon egasini tayinlash — biznes qarori: shartnoma imzolanadi,
 * hujjatlar tekshiriladi. Buni ilova ichidan "o'zim egaman" deb bosib
 * bo'lmasligi kerak.
 *
 * `assign-restaurant.ts` bilan bir xil mantiq — farqi faqat jadvalda.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run shop:assign -- texnomart 901234567
 *   npm run shop:assign -- texnomart 901234567 remove
 */

function printUsage(): void {
  console.error("Ishlatish: npm run shop:assign -- <do'kon-kodi> <telefon> [remove]");
  console.error('Namuna:    npm run shop:assign -- texnomart 901234567');
}

async function main(): Promise<void> {
  const [slug, rawPhone, action] = stripFlags(process.argv.slice(2));

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
  const { prisma } = connectDatabase(process.argv);

  try {
    const shop = await prisma.shop.findUnique({
      where: { slug },
      select: { id: true, name: true, ownerId: true },
    });

    if (!shop) {
      console.error(`❌ "${slug}" kodli do'kon topilmadi.`);
      console.error("   Mavjud do'konlarni ko'rish uchun: npm run db:studio");
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
      await prisma.shop.update({ where: { id: shop.id }, data: { ownerId: null } });
      console.info(`✅ "${shop.name}" do'koni ${phone} dan olib tashlandi`);
    } else {
      await prisma.shop.update({ where: { id: shop.id }, data: { ownerId: user.id } });

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

      console.info(`✅ "${shop.name}" do'koni ${phone} ga biriktirildi`);
      console.info('✅ MERCHANT roli berildi');
    }

    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: isRemoving ? 'seller.shop.unassigned' : 'seller.shop.assigned',
        resourceType: 'Shop',
        resourceId: shop.id,
        module: 'seller',
        metadata: { slug, phone, via: 'cli' },
      },
    });

    if (!isRemoving) {
      console.info('');
      console.info('⚠️  Muhim: yangi rol faqat QAYTA KIRGANDAN keyin ishlaydi.');
      console.info('   Ilovadan chiqib, qaytadan kiring — keyin "Sotuvchi kabineti" paydo bo\'ladi.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('❌ Bajarilmadi:', error);
  process.exit(1);
});
