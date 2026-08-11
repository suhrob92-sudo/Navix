import * as Sentry from '@sentry/nextjs';

/**
 * Server ishga tushganda BIR MARTA bajariladi.
 *
 * ── Nima uchun `import` shu yerda, faylning boshida emas ──────────────
 * Next.js kodni ikki xil muhitda ishlatadi: oddiy Node.js va cheklangan
 * "edge". Ularning sozlamalari boshqacha va bir-biriga to'g'ri
 * kelmaydi.
 *
 * Fayl boshida import qilinsa, edge muhiti Node uchun yozilgan
 * sozlamani ham yuklashga urinardi va build xato bilan tugardi.
 * Shuning uchun kerakli fayl KERAK BO'LGANDA yuklanadi.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

/**
 * Serverda ushlanmagan xato yuz berganda chaqiriladi.
 *
 * ── Nima uchun bu ALOHIDA kerak ───────────────────────────────────────
 * Bizning API'larimiz xatolarni o'zi tutadi (`withApiHandler`) va
 * foydalanuvchiga toza javob qaytaradi. Lekin sahifa chizilayotganda
 * yoki o'ram ishga tushgunga qadar chiqqan xato u yerga umuman
 * yetib bormaydi.
 *
 * Bu ilgak aynan o'sha xatolarni ushlaydi — ya'ni "sahifa oq bo'lib
 * qoldi" degan eng yomon holatning sababi endi ko'rinadi.
 */
export const onRequestError = Sentry.captureRequestError;
