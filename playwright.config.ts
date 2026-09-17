import { defineConfig, devices } from '@playwright/test';

/**
 * E2E (uchdan-uchgacha) sinovlar sozlamasi.
 *
 * ── Nima uchun Vitest'dan ALOHIDA ─────────────────────────────────────
 * Vitest sinovlari bazaga ulanadi, lekin BRAUZER ochmaydi va serverni
 * ishga tushirmaydi. Ular sekundlar ichida tugaydi va har bir
 * o'zgarishdan keyin ishlatiladi.
 *
 * E2E esa haqiqiy serverni ko'taradi va haqiqiy brauzer ochadi. U
 * sekinroq va og'irroq, shuning uchun `npm test` ichiga qo'shilmadi:
 * aks holda har bir kichik o'zgarishdan keyin brauzer kutib turish
 * kerak bo'lardi.
 *
 *   npm test        — tez sinovlar (brauzersiz)
 *   npm run test:e2e — brauzerdagi sinovlar
 *
 * ── Nima uchun faqat Chromium ─────────────────────────────────────────
 * Uch brauzerda ishlatish uch barobar vaqt oladi va uch barobar joy
 * egallaydi. Foydalanuvchilarning aksariyati Chromium asosidagi
 * brauzerda (Chrome, Edge, Samsung Internet), shuning uchun avval
 * shu. Kerak bo'lsa keyin qo'shiladi.
 */

const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Brauzer manzili — ODATDA kerak emas.
 *
 * Playwright brauzerni o'zi topadi (`npx playwright install chromium`
 * bajarilgandan keyin). Lekin ba'zi muhitlarda brauzer allaqachon
 * boshqa joyda o'rnatilgan bo'ladi va yuklab olish taqiqlangan —
 * o'shanda manzilni shu o'zgaruvchi orqali berish mumkin:
 *
 *   E2E_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
 *
 * Manzil kodga YOZILMAYDI: u har muhitda boshqacha va qattiq
 * yozilsa, boshqa kompyuterda sinov sababsiz ishlamasdi.
 */
const BRAUZER = process.env.E2E_CHROMIUM;
const brauzerSozlamasi = BRAUZER ? { launchOptions: { executablePath: BRAUZER } } : {};

export default defineConfig({
  testDir: './e2e',

  /*
    Sinovlar bir-birining ortidan ishlaydi.

    Ular BITTA bazani baham ko'radi va foydalanuvchi yaratadi.
    Parallel ishlatilsa, biri ikkinchisining ma'lumotini ko'rib
    qolishi mumkin edi — va sabab koddan emas, sinovlardan bo'lardi.
  */
  fullyParallel: false,
  workers: 1,

  /* Sinov osilib qolsa, butun jarayonni to'xtatib turmasin. */
  timeout: 60_000,
  expect: { timeout: 10_000 },

  /* Xato bo'lganda nima bo'lganini ko'rish uchun. */
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...brauzerSozlamasi },
    },
    {
      /*
        Telefon o'lchami — ALOHIDA loyiha sifatida.

        Ilova birinchi navbatda telefonda ishlatiladi. Kompyuter
        ekranida to'g'ri ko'ringan tugma telefonda ekrandan chiqib
        ketishi mumkin, shuning uchun muhim yo'l ikkala o'lchamda
        ham tekshiriladi.
      */
      name: 'telefon',
      use: { ...devices['Pixel 7'], ...brauzerSozlamasi },
    },
  ],

  /*
    Serverni Playwright O'ZI ko'taradi.

    Foydalanuvchi telefonda ishlaydi: ikkita terminal ochib, birida
    server, ikkinchisida sinov ishlatish noqulay. Bitta buyruq
    yetarli bo'lishi kerak.

    `reuseExistingServer` — server allaqachon ishlab tursa, qayta
    ko'tarilmaydi (dasturchi `npm run dev` bilan ishlayotgan bo'lsa).
  */
  webServer: {
    command: 'npm run dev',
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
