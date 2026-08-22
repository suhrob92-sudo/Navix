import type { NextConfig } from 'next';

import { ENFORCED_CSP, REPORT_ONLY_CSP } from './src/config/csp';
import { protectedPathPatterns } from './src/config/protected-routes';

/**
 * Xavfsizlik sarlavhalari (security headers).
 * Bular brauzerga "bu saytga qanday munosabatda bo'lish" kerakligini aytadi
 * va keng tarqalgan hujumlardan (clickjacking, MIME sniffing) himoya qiladi.
 */
const securityHeaders = [
  // Sahifani boshqa saytning <iframe> ichiga joylashni taqiqlaydi.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Brauzer fayl turini o'zi "taxmin qilishi" ni taqiqlaydi.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Boshqa saytga o'tganda to'liq manzilni yubormaydi.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  /**
   * Qurilma imkoniyatlari.
   *
   * ── `(self)` nimani anglatadi ──────────────────────────────────────
   * Faqat Navix sahifasi so'ray oladi. Sahifaga joylashtirilgan begona
   * <iframe> lar so'ray olmaydi — ya'ni reklama yoki tashqi vidjet
   * mikrofonga tegisha olmaydi.
   *
   * Foydalanuvchidan ruxsat baribir brauzer o'zi so'raydi: bu sarlavha
   * ruxsat BERMAYDI, u faqat so'rash huquqini beradi.
   *
   * Mikrofon — ovozli, kamera — video qo'ng'iroq uchun.
   */
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
  // Faqat HTTPS orqali ulanishni majburlaydi (1 yil).
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  /**
   * Xavfsiz qism — MAJBURIY.
   *
   * Izohi `src/config/csp.ts` da. Qisqasi: bu qoidalar loyihada
   * ishlatilmaydigan narsalarni to'sadi, shuning uchun hech narsani
   * buzmaydi.
   */
  { key: 'Content-Security-Policy', value: ENFORCED_CSP },
  /**
   * Qattiq qism — faqat KUZATUV.
   *
   * Brauzer hech narsani to'smaydi, faqat mos kelmagan joylar haqida
   * xabar yuboradi. Xabarlar /admin/errors ga tushadi.
   */
  { key: 'Content-Security-Policy-Report-Only', value: REPORT_ONLY_CSP },
];

const nextConfig: NextConfig = {
  /**
   * "standalone" rejimi Docker image'ni kichik qilish uchun kerakli fayllarni
   * alohida yig'adi. Lekin bu rejimda `next start` ishlamaydi, shuning uchun
   * uni faqat Docker build'da yoqamiz (Dockerfile'da BUILD_STANDALONE=1).
   */
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,

  reactStrictMode: true,

  /**
   * Ishlab chiqish rejimida qaysi domenlardan kirishga ruxsat berilgan.
   *
   * ── Nima uchun kerak ─────────────────────────────────────────────────
   * Next.js 16 dev serveri `localhost` dan BOSHQA domendan kelgan
   * so'rovlarga `/_next/static/*` fayllarini bermaydi — `403` qaytaradi.
   * Bu himoya chorasi: aks holda istalgan sayt sizning dev serveringiz
   * kodini o'qib olishi mumkin edi.
   *
   * Ammo biz ilovani ataylab tashqi manzil orqali ochamiz (telefondan
   * sinash uchun). Natijada brauzer HTML'ni oladi-yu, JavaScript'ni
   * ololmaydi. Sahifa ko'rinadi, lekin HECH BIR TUGMA ISHLAMAYDI —
   * React umuman ishga tushmaydi.
   *
   * Quyidagi domenlar aynan shu ikki yo'lga tegishli:
   *   - `*.app.github.dev`      — GitHub Codespaces porti
   *   - `*.trycloudflare.com`   — Cloudflare tunneli (npm run share)
   *
   * Bu sozlama FAQAT dev rejimida ta'sir qiladi, production'da emas.
   */
  allowedDevOrigins: ['*.app.github.dev', '*.github.dev', '*.trycloudflare.com'],

  /**
   * Ishlab chiqish rejimidagi Next.js belgisi (kichik "N" doirasi) o'chirilgan.
   *
   * Nima uchun: u ekranning pastki burchagida turadi va telefonda pastki
   * menyu tugmalarini to'sib qo'yadi. Loyiha asosan telefondan sinaladi,
   * shuning uchun menyu muhimroq. Bu belgi production'da baribir ko'rinmaydi.
   */
  devIndicators: false,

  // Build vaqtida TypeScript xatolarini yashirmaymiz — sifat nazorati.
  typescript: { ignoreBuildErrors: false },

  // Server komponentlarida ishlatiladigan, client bundle'ga qo'shilmasligi kerak paketlar.
  serverExternalPackages: ['@prisma/adapter-pg', 'ioredis', 'pino', 'pino-pretty'],

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },

      /**
       * Kirish talab qiladigan sahifalarning HTML'i KESHLANMAYDI.
       *
       * ── Nima uchun ────────────────────────────────────────────────────
       * Bu sahifalar "qobiq": serverda skelet chiziladi, ma'lumot esa
       * brauzerdagi JavaScript orqali keladi.
       *
       * Yangi versiya chiqarilganda JavaScript fayllarining nomi
       * o'zgaradi. Brauzerda ESKI HTML qolsa, u endi mavjud bo'lmagan
       * fayllarni so'raydi (404) — JavaScript ishga tushmaydi va
       * foydalanuvchi ABADIY skeletni ko'radi.
       *
       * Bu xato production'da haqiqatan yuz berdi: sahifa "qotib
       * qolgandek" ko'rindi, jurnalda esa birorta API so'rovi yo'q edi —
       * chunki so'rov qiladigan JavaScript umuman ishga tushmagan.
       *
       * `no-store` — brauzer ham, CDN ham saqlamaydi. Qobiq bir necha
       * kilobayt, shuning uchun narxi arzimas; zarari esa katta edi.
       *
       * `private` — bu sahifalar SHAXSIY: umumiy keshda (masalan
       * korporativ proksida) saqlanib, boshqa odamga ko'rinmasligi kerak.
       */
      ...protectedPathPatterns().map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' }],
      })),
    ];
  },
};

export default nextConfig;
