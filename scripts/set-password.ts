// ".env" faylini o'qiydi — bu skript Next.js'dan tashqarida ishlaydi.
import 'dotenv/config';

import { AuditAction } from '../src/lib/audit';
import { passwordSchema } from '../src/modules/auth/auth.schemas';
import { hashPassword } from '../src/modules/auth/password.service';
import { normalizeUzPhone } from '../src/lib/phone';
import { connectDatabase, stripFlags } from './lib/db-target';

/**
 * Foydalanuvchiga yangi parol o'rnatadi.
 *
 * ── Nima uchun bu skript kerak ────────────────────────────────────────
 * Parolni odatdagi yo'l bilan tiklash uchun SMS kodi kerak. Ishlab
 * chiqishda esa haqiqiy SMS yuborilmaydi — kod faqat server logiga
 * tushadi va uni topish har doim ham oson emas (server boshqa oynada
 * ishlayotgan bo'lishi mumkin).
 *
 * Natijada dasturchi o'z hisobiga kira olmay qolardi. Bu skript aynan
 * shu holat uchun.
 *
 * ── Nima uchun bu XAVFSIZ ─────────────────────────────────────────────
 * Skript BAZAGA to'g'ridan-to'g'ri ulanadi. Ya'ni uni faqat baza
 * ma'lumotlariga ega odam ishlata oladi — tashqaridan, ilova orqali
 * bu yo'lni ishlatib bo'lmaydi.
 *
 * Parol o'zgarishi bilan BARCHA sessiyalar bekor qilinadi: agar hisob
 * begona qo'lga tushgan bo'lsa, parolni almashtirish uni chiqarib
 * yuborishi kerak. Aks holda o'g'ri kirgan holida qolaverardi.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run password:set -- 901234567 YangiParol123
 *   npm run password:set -- 901234567 YangiParol123 --prod
 */

function printUsage(): void {
  console.error('Ishlatish: npm run password:set -- <telefon> <yangi-parol> [--prod]');
  console.error('Namuna:    npm run password:set -- 910994540 YangiParol123');
  console.error('');
  console.error("Parol talabi: kamida 8 belgi, harf va raqam bo'lishi shart.");
}

async function main(): Promise<void> {
  const [rawPhone, newPassword] = stripFlags(process.argv.slice(2));

  if (!rawPhone || !newPassword) {
    printUsage();
    process.exit(1);
  }

  const phone = normalizeUzPhone(rawPhone);

  if (!phone) {
    console.error(`❌ "${rawPhone}" — telefon raqami noto'g'ri. Namuna: 901234567`);
    process.exit(1);
  }

  /**
   * Parol ILOVADAGI bilan BIR XIL qoidada tekshiriladi.
   *
   * Aks holda skript bilan qo'yilgan parol ilovada "juda oddiy" deb
   * rad etilishi mumkin edi — odam esa nima uchunligini tushunmasdi.
   */
  const checked = passwordSchema.safeParse(newPassword);

  if (!checked.success) {
    console.error(`❌ Parol yaroqsiz: ${checked.error.issues[0]?.message}`);
    process.exit(1);
  }

  const { prisma } = connectDatabase(process.argv);

  try {
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, firstName: true, lastName: true, status: true },
    });

    if (!user) {
      console.error(`❌ ${phone} raqamli foydalanuvchi topilmadi.`);
      process.exit(1);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        /**
         * Raqam tasdiqlangan deb belgilanadi.
         *
         * Parolni o'rnatgan odam bazaga kira oladi — ya'ni raqam
         * egasidan ham ko'proq huquqqa ega. Tasdiqlanmagan holatda
         * qoldirilsa, kirishda yana SMS so'ralib, muammo qaytadan
         * boshlanardi.
         */
        phoneVerified: new Date(),
        status: user.status === 'PENDING_VERIFICATION' ? 'ACTIVE' : user.status,
      },
    });

    /**
     * Barcha sessiyalar bekor qilinadi.
     *
     * Parol almashtirishning ma'nosi — eski kirishlarni to'xtatish.
     * Sessiyalar qolsa, parol o'zgargani bilan hech narsa o'zgarmasdi.
     */
    const revoked = await prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    /**
     * Amal audit jurnaliga tushadi.
     *
     * Parol o'zgarishi — jiddiy xavfsizlik hodisasi. U kim tomonidan
     * va qanday qilinganini keyin aniqlash mumkin bo'lishi kerak.
     */
    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: AuditAction.USER_PASSWORD_SET_BY_CLI,
        resourceType: 'User',
        resourceId: user.id,
        module: 'auth',
        metadata: { via: 'cli' },
      },
    });

    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || phone;

    console.info('');
    console.info(`✅ ${name} — parol o'rnatildi`);
    console.info(`   Bekor qilingan sessiyalar: ${revoked.count}`);
    console.info('');
    console.info('   Endi shu raqam va yangi parol bilan kiring.');
    console.info('');
    // Parolning O'ZI ataylab chiqarilmaydi: terminal tarixida qolib ketmasin.
    console.info('⚠️  Parolni hech kimga yubormang — u faqat sizda qolsin.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('❌ Bajarilmadi:', error);
  process.exit(1);
});
