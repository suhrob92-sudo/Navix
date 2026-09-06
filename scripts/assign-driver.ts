// ".env" faylini o'qiydi — bu skript Next.js'dan tashqarida ishlaydi.
import 'dotenv/config';

import { connectDatabase, stripFlags } from './lib/db-target';
import { normalizeUzPhone } from '../src/lib/phone';

/**
 * Foydalanuvchiga HAYDOVCHI rolini beradi.
 *
 * ── Nima uchun skript, ilova ichidagi tugma emas ──────────────────────
 * Haydovchi begona odamni mashinasiga o'tqazadi va uni shahar bo'ylab
 * olib ketadi. Bunday huquqni "o'zim haydovchiman" deb bosib olish
 * mumkin bo'lmasligi kerak.
 *
 * Haqiqiy hayotda bu bosqichda hujjat tekshiriladi: haydovchilik
 * guvohnomasi, mashina texnik pasporti, sug'urta. Shundan keyingina
 * rol beriladi — kuryerdagi bilan bir xil qoida.
 *
 * ── Tartib MUHIM ──────────────────────────────────────────────────────
 * Avval ROL, keyin PROFIL. Ya'ni:
 *
 *   1. hujjat tekshiriladi → shu skript ishlatiladi;
 *   2. haydovchi kabinetga kiradi va mashina ma'lumotini to'ldiradi;
 *   3. "Onlayn" tugmasini bosib, buyurtma qabul qila boshlaydi.
 *
 * Teskarisi bo'lsa, hujjatsiz odam mashina ma'lumotini kiritib,
 * kutib turardi va bu yolg'on umid bo'lardi.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run driver:assign -- 901234567
 *   npm run driver:assign -- 901234567 remove
 */

function printUsage(): void {
  console.error('Ishlatish: npm run driver:assign -- <telefon> [remove]');
  console.error('Namuna:    npm run driver:assign -- 901234567');
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

    const role = await prisma.role.findUnique({ where: { name: 'DRIVER' }, select: { id: true } });

    if (!role) {
      console.error('❌ DRIVER roli bazada yo\'q. Avval "npm run db:seed" bajaring.');
      process.exit(1);
    }

    if (isRemoving) {
      await prisma.userRoleAssignment.deleteMany({ where: { userId: user.id, roleId: role.id } });

      /*
        Rol olib tashlanganda haydovchi OFLAYN qilinadi.

        Aks holda u "onlayn" bo'lib qolardi va yaqin atrofdagi
        buyurtmalarni hisoblashda ko'rinardi — holbuki u endi
        hech nimani qabul qila olmaydi.
      */
      await prisma.taxiDriver.updateMany({
        where: { userId: user.id },
        data: { isOnline: false, lastLat: null, lastLng: null, locationAt: null },
      });

      console.info(`✅ ${phone} dan haydovchi roli olib tashlandi`);
    } else {
      await prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });

      console.info(`✅ ${phone} ga HAYDOVCHI roli berildi`);
    }

    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: isRemoving ? 'taxi.driver.unassigned' : 'taxi.driver.assigned',
        resourceType: 'User',
        resourceId: user.id,
        module: 'taxi',
        metadata: { phone, via: 'cli' },
      },
    });

    if (!isRemoving) {
      console.info('');
      console.info('⚠️  Muhim: yangi rol faqat QAYTA KIRGANDAN keyin ishlaydi.');
      console.info('   Ilovadan chiqib, qaytadan kiring — keyin "Haydovchi kabineti" paydo bo\'ladi.');
      console.info('   Kabinetda avval mashina ma\'lumotini to\'ldirish so\'raladi.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('❌ Bajarilmadi:', error);
  process.exit(1);
});
