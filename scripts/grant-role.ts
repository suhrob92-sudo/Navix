// ".env" faylini o'qiydi — bu skript Next.js'dan tashqarida ishlaydi.
import 'dotenv/config';

import { RoleName } from '../src/generated/prisma/client';
import { connectDatabase, stripFlags } from './lib/db-target';
import { normalizeUzPhone } from '../src/lib/phone';

/**
 * Foydalanuvchiga rol beradi yoki olib tashlaydi.
 *
 * ── Nima uchun bu skript kerak ────────────────────────────────────────
 * "Tovuq va tuxum" muammosi: admin panelda rol berish mumkin, lekin
 * admin panelga kirish uchun allaqachon ADMIN roli kerak. Ya'ni
 * BIRINCHI adminni interfeys orqali yaratib bo'lmaydi.
 *
 * Shuning uchun birinchi admin serverdan, terminal orqali beriladi.
 * Bu ataylab shunday: bazaga kira oladigan odamgina admin tayinlay
 * oladi, ya'ni tashqaridan bu yo'lni ishlatib bo'lmaydi.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run role:grant -- 901234567              → ADMIN qiladi
 *   npm run role:grant -- 901234567 SUPER_ADMIN  → bosh admin qiladi
 *   npm run role:grant -- 901234567 ADMIN remove → rolni olib tashlaydi
 */

const DEFAULT_ROLE: RoleName = 'ADMIN';

function printUsage(): void {
  console.error('Ishlatish: npm run role:grant -- <telefon> [ROL] [remove]');
  console.error('Namuna:    npm run role:grant -- 901234567 ADMIN');
  console.error(`Rollar:    ${Object.values(RoleName).join(', ')}`);
}

async function main(): Promise<void> {
  const [rawPhone, rawRole, action] = stripFlags(process.argv.slice(2));

  if (!rawPhone) {
    printUsage();
    process.exit(1);
  }

  const phone = normalizeUzPhone(rawPhone);

  if (!phone) {
    console.error(`❌ "${rawPhone}" — telefon raqami noto'g'ri. Namuna: 901234567`);
    process.exit(1);
  }

  const roleName = (rawRole ?? DEFAULT_ROLE).toUpperCase() as RoleName;

  if (!Object.values(RoleName).includes(roleName)) {
    console.error(`❌ "${roleName}" degan rol yo'q.`);
    printUsage();
    process.exit(1);
  }

  const isRemoving = action === 'remove';
  const { prisma } = connectDatabase(process.argv);

  try {
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, firstName: true, lastName: true, status: true },
    });

    if (!user) {
      console.error(`❌ ${phone} raqamli foydalanuvchi topilmadi. Avval ilovada ro'yxatdan o'ting.`);
      process.exit(1);
    }

    // Rollar bazada ham saqlanadi — avval `npm run db:seed` bajarilgan bo'lishi kerak.
    const role = await prisma.role.findUnique({ where: { name: roleName }, select: { id: true } });

    if (!role) {
      console.error(`❌ "${roleName}" roli bazada yo'q. Avval "npm run db:seed" buyrug'ini bajaring.`);
      process.exit(1);
    }

    if (isRemoving) {
      await prisma.userRoleAssignment.deleteMany({ where: { userId: user.id, roleId: role.id } });
      console.info(`✅ ${phone} — "${roleName}" roli olib tashlandi`);
    } else {
      await prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
      console.info(`✅ ${phone} — "${roleName}" roli berildi`);
    }

    // Amal audit jurnaliga ham tushadi: rol o'zgarishi eng jiddiy
    // xavfsizlik hodisasi, u albatta yozilishi kerak.
    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: isRemoving ? 'admin.role.revoked' : 'admin.role.granted',
        resourceType: 'User',
        resourceId: user.id,
        module: 'admin',
        metadata: { role: roleName, via: 'cli' },
      },
    });

    console.info('');
    console.info('⚠️  Muhim: yangi rol faqat QAYTA KIRGANDAN keyin ishlaydi.');
    console.info('   Rollar kirish tokeni (JWT) ichida saqlanadi, token esa 15 daqiqa yashaydi.');
    console.info('   Ilovadan chiqib, qaytadan kiring.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('❌ Bajarilmadi:', error);
  process.exit(1);
});
