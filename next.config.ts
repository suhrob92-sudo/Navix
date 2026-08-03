import type { NextConfig } from 'next';

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
  // Kamera, mikrofon va joylashuvga standart holatda ruxsat bermaydi.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  // Faqat HTTPS orqali ulanishni majburlaydi (1 yil).
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
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
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
