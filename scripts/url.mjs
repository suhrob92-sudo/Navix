/**
 * Ilova ochiladigan to'liq havolani chiqaradi.
 *
 * Nima uchun alohida skript: GitHub Codespaces'da ilova `localhost` da emas,
 * tashqi manzilda ochiladi. Uning to'liq nomini qo'lda yozib bo'lmaydi —
 * u Codespaces bergan muhit o'zgaruvchilaridan yig'iladi.
 *
 * Ishlatish: npm run url
 */

const PORT = process.env.PORT ?? '3000';

const codespaceName = process.env.CODESPACE_NAME;
const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

if (codespaceName && forwardingDomain) {
  console.info(`\n🌐 Ilova manzili (brauzerda oching):\n`);
  console.info(`   https://${codespaceName}-${PORT}.${forwardingDomain}\n`);
} else {
  console.info(`\n🌐 Ilova manzili:\n`);
  console.info(`   http://localhost:${PORT}\n`);
}
