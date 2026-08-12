import fs from 'node:fs';
import path from 'node:path';

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
 *   npm run push:keys          — kalitlarni yaratib EKRANDA ko'rsatadi
 *   npm run push:keys -- --save — to'g'ridan-to'g'ri fayllarga yozadi
 *
 * ── Nima uchun "--save" kerak ─────────────────────────────────────────
 * Kalit ~90 belgidan iborat va telefonda uni ekrandan belgilab, ikkita
 * faylga ko'chirish — xatoga chaqiriq. Bitta belgi tushib qolsa, push
 * ishlamaydi va sababi hech qayerda ko'rinmaydi.
 *
 * "--save" bilan kalit ekranga UMUMAN chiqmaydi: u yaratilgan joyidan
 * to'g'ri faylga tushadi.
 */

const ROOT = process.cwd();
const TARGETS = ['.env', '.env.production'];

const shouldSave = process.argv.includes('--save');

/**
 * Faylda VAPID kaliti allaqachon bormi.
 *
 * ── Nima uchun bu tekshiruv MUHIM ─────────────────────────────────────
 * Kalitlar almashtirilsa, telefonlardagi BARCHA eski obunalar
 * yaroqsiz bo'lib qoladi: brauzer obunani aynan ochiq kalitga bog'lab
 * saqlaydi. Ya'ni "kalitni yangilayman" degan bir buyruq bilan
 * hamma foydalanuvchi bildirishnomasiz qolardi va buni hech kim
 * darhol sezmasdi.
 *
 * Shuning uchun mavjud kalit ustiga hech qachon yozilmaydi.
 */
function hasKeys(content) {
  return /^VAPID_PUBLIC_KEY=/m.test(content);
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

const keys = webpush.generateVAPIDKeys();

const block = [
  '',
  '# Push bildirishnomalar uchun — "npm run push:keys -- --save" yozgan.',
  '# MAXFIY kalitni hech kimga bermang.',
  `VAPID_PUBLIC_KEY="${keys.publicKey}"`,
  `VAPID_PRIVATE_KEY="${keys.privateKey}"`,
  '',
].join('\n');

if (!shouldSave) {
  console.info('');
  console.info('🔑 VAPID kalitlari yaratildi.\n');
  console.info('   Quyidagi ikki qatorni ".env" fayliga qo\'shing:\n');
  console.info(`VAPID_PUBLIC_KEY="${keys.publicKey}"`);
  console.info(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
  console.info('');
  console.info("⚠️  MAXFIY kalitni hech kimga bermang va git'ga qo'shmang.");
  console.info('   Ochiq kalit esa brauzerga beriladi — u maxfiy emas.');
  console.info('');
  console.info('   Telefonda ko\'chirib yozish noqulay bo\'lsa:\n');
  console.info('      npm run push:keys -- --save\n');
  console.info('   U kalitni ekranga chiqarmasdan fayllarga o\'zi yozadi.');
  console.info('');

  process.exit(0);
}

// ── Fayllarga yozish ──────────────────────────────────────────────────

const written = [];
const skipped = [];
const missing = [];

for (const name of TARGETS) {
  const file = path.join(ROOT, name);
  const content = readIfExists(file);

  if (content === null) {
    missing.push(name);
    continue;
  }

  if (hasKeys(content)) {
    skipped.push(name);
    continue;
  }

  /**
   * Fayl oxiriga qo'shiladi — mavjud sozlamalar teginilmaydi.
   *
   * Qator ajratgichi ham qo'shiladi: fayl oxirgi qatorsiz tugagan
   * bo'lsa, yangi qiymat eskisining yoniga yopishib qolardi.
   */
  fs.appendFileSync(file, (content.endsWith('\n') ? '' : '\n') + block);

  /**
   * Faylni FAQAT egasi o'qiy oladigan qilamiz.
   *
   * `appendFileSync` ning `mode` xossasi faqat YANGI fayl yaratilganda
   * ishlaydi — mavjud faylda u hech narsa qilmaydi. Endi esa faylda
   * maxfiy kalit turibdi, ya'ni ruxsatni o'zimiz qisishimiz kerak.
   */
  fs.chmodSync(file, 0o600);

  written.push(name);
}

console.info('');

if (written.length > 0) {
  console.info(`✅ VAPID kalitlari yozildi: ${written.join(', ')}`);
  console.info('   Kalit ekranga chiqarilmadi — u faqat faylda.');
}

if (skipped.length > 0) {
  console.info(`\nℹ️  Kalit allaqachon bor, tegilmadi: ${skipped.join(', ')}`);
  console.info('   Uni almashtirsangiz, telefonlardagi eski obunalar');
  console.info('   ishlamay qoladi — shuning uchun ustiga yozilmadi.');
}

if (missing.length > 0) {
  console.info(`\n⚠️  Fayl topilmadi: ${missing.join(', ')}`);

  if (missing.includes('.env.production')) {
    console.info('   Production sozlamalarini yozish:  npm run env:setup');
  }
}

if (written.includes('.env.production')) {
  console.info('\n👉 Endi kalitlarni bulutga yuboring:\n');
  console.info('      npm run deploy:push-env\n');
}

console.info('');
