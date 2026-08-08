// ".env" faylini o'qiydi — bu skript Next.js'dan tashqarida ishlaydi.
import 'dotenv/config';

import { connectDatabase, stripFlags } from './lib/db-target';
import { normalizeUzPhone } from '../src/lib/phone';

/**
 * Kompaniyani egasiga biriktiradi va EMPLOYER rolini beradi.
 *
 * ── Nima uchun skript, ilova ichidan emas ─────────────────────────────
 * Ish beruvchi kabineti nomzodlarning TELEFON RAQAMLARINI ochadi. Bu
 * huquqni "o'zim ish beruvchiman" deb tugma bosib olish mumkin
 * bo'lmasligi kerak — kompaniya haqiqiyligi tekshiriladi va
 * shartnoma imzolanadi.
 *
 * Restoran va do'kon biriktirish bilan bir xil mantiq.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run company:assign -- texnomart 901234567
 *   npm run company:assign -- texnomart 901234567 remove
 */

function printUsage(): void {
  console.error('Ishlatish: npm run company:assign -- <kompaniya-kodi> <telefon> [remove]');
  console.error('Namuna:    npm run company:assign -- texnomart 901234567');
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
    const company = await prisma.company.findUnique({
      where: { slug },
      select: { id: true, name: true, ownerId: true },
    });

    if (!company) {
      console.error(`❌ "${slug}" kodli kompaniya topilmadi.`);
      console.error("   Mavjud kompaniyalarni ko'rish uchun: npm run db:studio");
      process.exit(1);
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (!user) {
      console.error(`❌ ${phone} raqamli foydalanuvchi topilmadi. Avval ilovada ro'yxatdan o'ting.`);
      process.exit(1);
    }

    if (isRemoving) {
      await prisma.company.update({ where: { id: company.id }, data: { ownerId: null } });
      console.info(`✅ "${company.name}" kompaniyasi ${phone} dan olib tashlandi`);

      /**
       * Rol OLIB TASHLANMAYDI, agar odamda boshqa kompaniya qolsa.
       *
       * Aks holda ikkita kompaniyasi bor odamdan bittasini olganda,
       * u ikkinchisini ham ko'rmay qolardi.
       */
      const remaining = await prisma.company.count({ where: { ownerId: user.id } });

      if (remaining === 0) {
        const role = await prisma.role.findUnique({ where: { name: 'EMPLOYER' }, select: { id: true } });

        if (role) {
          await prisma.userRoleAssignment.deleteMany({ where: { userId: user.id, roleId: role.id } });
          console.info('✅ EMPLOYER roli olib tashlandi (boshqa kompaniyasi qolmadi)');
        }
      } else {
        console.info(`ℹ️  EMPLOYER roli qoldirildi — yana ${remaining} ta kompaniyasi bor`);
      }
    } else {
      await prisma.company.update({ where: { id: company.id }, data: { ownerId: user.id } });

      const role = await prisma.role.findUnique({ where: { name: 'EMPLOYER' }, select: { id: true } });

      if (!role) {
        console.error('❌ EMPLOYER roli bazada yo\'q. Avval "npm run db:seed" bajaring.');
        process.exit(1);
      }

      await prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });

      console.info(`✅ "${company.name}" kompaniyasi ${phone} ga biriktirildi`);
      console.info('✅ EMPLOYER roli berildi');
    }

    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: isRemoving ? 'employer.unassigned' : 'employer.assigned',
        resourceType: 'Company',
        resourceId: company.id,
        module: 'employer',
        metadata: { slug, phone, via: 'cli' },
      },
    });

    if (!isRemoving) {
      console.info('');
      console.info('⚠️  Muhim: yangi rol faqat QAYTA KIRGANDAN keyin ishlaydi.');
      console.info('   Ilovadan chiqib, qaytadan kiring — keyin /employer sahifasi ochiladi.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('❌ Bajarilmadi:', error);
  process.exit(1);
});
