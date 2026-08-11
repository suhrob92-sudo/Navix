import type { Instrumentation } from 'next';

/**
 * Serverda ushlanmagan xato yuz berganda chaqiriladi.
 *
 * ── Nima uchun bu ALOHIDA kerak ───────────────────────────────────────
 * Bizning API'larimiz xatolarni o'zi tutadi (`withApiHandler`) va
 * foydalanuvchiga toza javob qaytaradi. Lekin SAHIFA chizilayotganda
 * yoki o'ram ishga tushgunga qadar chiqqan xato u yerga umuman yetib
 * bormaydi.
 *
 * Bu ilgak aynan o'sha xatolarni ushlaydi — ya'ni "sahifa oq bo'lib
 * qoldi" degan eng yomon holatning sababi endi ko'rinadi.
 *
 * ── Nima uchun import ICHKARIDA ───────────────────────────────────────
 * Bu fayl "edge" muhitida ham yuklanadi, u yerda esa baza kutubxonasi
 * yo'q. Fayl boshida import qilinsa, build xato bilan tugardi.
 * Shuning uchun jurnal moduli KERAK BO'LGANDA yuklanadi.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { recordServerError } = await import('@/modules/error-log/error-log.service');

  await recordServerError(error, request.path, request.method);
};
