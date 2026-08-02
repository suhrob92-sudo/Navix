/**
 * Ilova ochiladigan to'liq havolani chiqaradi.
 *
 * Nima uchun alohida skript: GitHub Codespaces'da ilova `localhost` da emas,
 * tashqi manzilda ochiladi. Uning to'liq nomini qo'lda yozib bo'lmaydi.
 *
 * Havola YARATMAYDI, faqat mavjudini ko'rsatadi. Yangi havola ochish uchun
 * `npm run share` ishlatiladi.
 *
 * Ishlatish: npm run url
 */

import { getRunningTunnelUrl } from './lib/tunnel.mjs';

const PORT = process.env.PORT ?? '3000';

const codespaceName = process.env.CODESPACE_NAME;
const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

// Ommaviy tunnel ochiq bo'lsa — aynan u ishlaydi, avval shuni ko'rsatamiz.
const tunnelUrl = getRunningTunnelUrl();

if (tunnelUrl) {
  console.info('\n🌐 Ilova manzili (brauzerda oching):\n');
  console.info(`   ${tunnelUrl}\n`);
} else if (codespaceName && forwardingDomain) {
  console.info('\n🌐 Ilova manzili (brauzerda oching):\n');
  console.info(`   https://${codespaceName}-${PORT}.${forwardingDomain}\n`);
  console.info('   Agar 404 chiqsa — port hali ochilmagan:  npm run share\n');
} else {
  console.info('\n🌐 Ilova manzili:\n');
  console.info(`   http://localhost:${PORT}\n`);
}
