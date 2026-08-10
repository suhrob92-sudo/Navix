import webpush from 'web-push';

/**
 * Push uchun VAPID kalit juftini yaratadi.
 *
 * ── Nima uchun skript ─────────────────────────────────────────────────
 * Kalitlar oddiy matn emas — ular P-256 egri chizig'idagi juftlik va
 * ularni qo'lda yozib bo'lmaydi. Internetdagi generatorlardan olish esa
 * xavfli: maxfiy kalit begona saytda hosil bo'ladi.
 *
 * Bu skript kalitlarni SIZNING qurilmangizda yaratadi va hech qayerga
 * yubormaydi.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run push:keys
 *
 * Chiqqan ikki qatorni ".env" (va Vercel sozlamalari) ga yozing.
 */

const keys = webpush.generateVAPIDKeys();

console.info('');
console.info('🔑 VAPID kalitlari yaratildi.\n');
console.info('   Quyidagi ikki qatorni ".env" fayliga qo\'shing:\n');
console.info(`VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.info(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.info('');
console.info("⚠️  MAXFIY kalitni hech kimga bermang va git'ga qo'shmang.");
console.info('   Ochiq kalit esa brauzerga beriladi — u maxfiy emas.');
console.info('');
console.info('   Production uchun: xuddi shu qiymatlarni Vercel');
console.info('   "Environment Variables" bo\'limiga ham kiriting.');
console.info('');
