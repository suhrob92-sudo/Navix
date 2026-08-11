import { z } from 'zod';

/**
 * Markazlashgan environment (muhit) o'zgaruvchilari.
 *
 * Ilova ishga tushishida barcha `.env` qiymatlari shu yerda tekshiriladi.
 * Agar biror majburiy qiymat yo'q yoki noto'g'ri bo'lsa — ilova darhol
 * xatolik bilan to'xtaydi. Bu "production'da yarim ishlaydigan" holatlarning
 * oldini oladi.
 */

const nodeEnvSchema = z.enum(['development', 'test', 'production']);

const serverSchema = z.object({
  NODE_ENV: nodeEnvSchema.default('development'),

  /** PostgreSQL ulanish satri (Prisma uchun). */
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL majburiy')
    .refine(
      (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
      'DATABASE_URL "postgresql://" bilan boshlanishi kerak',
    ),

  /**
   * Bazaga TO'G'RIDAN-TO'G'RI ulanish satri — faqat migratsiya uchun.
   *
   * Bulutdagi bazalarda (Neon, Supabase) ilova "pooled" manzildan,
   * migratsiya esa "direct" manzildan foydalanadi. Batafsil izoh
   * `prisma.config.ts` da. Lokal ishlashda kerak emas.
   */
  DIRECT_URL: z
    .string()
    .refine(
      (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
      'DIRECT_URL "postgresql://" bilan boshlanishi kerak',
    )
    .optional(),

  /** Redis ulanish satri (kesh, sessiya, rate limit uchun). */
  REDIS_URL: z
    .string()
    .min(1, 'REDIS_URL majburiy')
    .refine(
      (value) => value.startsWith('redis://') || value.startsWith('rediss://'),
      'REDIS_URL "redis://" bilan boshlanishi kerak',
    ),

  /** JWT access token imzolash kaliti. Kamida 32 belgi. */
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET kamida 32 belgidan iborat bo'lishi kerak"),

  /** JWT refresh token imzolash kaliti. Kamida 32 belgi. */
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET kamida 32 belgidan iborat bo'lishi kerak"),

  /** Access token amal qilish muddati (soniyalarda). Default: 15 daqiqa. */
  JWT_ACCESS_TTL: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 15),

  /** Refresh token amal qilish muddati (soniyalarda). Default: 30 kun. */
  JWT_REFRESH_TTL: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),

  /** Log darajasi. `silent` — log umuman yozilmaydi (testlar uchun). */
  LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // --- SMS va tasdiqlash kodi (OTP) ---------------------------------------

  /**
   * SMS yuborish provayderi.
   *  - `console` — kod terminalga chiqadi (faqat ishlab chiqish uchun);
   *  - `eskiz`   — Eskiz.uz xizmati orqali haqiqiy SMS yuboriladi.
   */
  SMS_PROVIDER: z.enum(['console', 'eskiz']).default('console'),

  /** Eskiz.uz hisobiga kirish uchun email. `SMS_PROVIDER=eskiz` bo'lsa majburiy. */
  ESKIZ_EMAIL: z.string().email().optional(),
  /** Eskiz.uz API paroli. */
  ESKIZ_SECRET: z.string().min(1).optional(),
  /** Eskiz.uz API manzili. */
  ESKIZ_BASE_URL: z.string().url().default('https://notify.eskiz.uz/api'),
  /** SMS'da ko'rinadigan jo'natuvchi nomi. */
  ESKIZ_SENDER: z.string().min(1).default('4546'),

  /** Tasdiqlash kodi amal qilish muddati (soniyalarda). Default: 5 daqiqa. */
  OTP_TTL: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 5),

  /** Kodni qayta yuborishdan oldin kutish vaqti (soniyalarda). Default: 60 soniya. */
  OTP_RESEND_COOLDOWN: z.coerce.number().int().positive().default(60),

  /** Bitta kodni necha marta noto'g'ri kiritish mumkin. */
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

  // --- Qo'ng'iroq (WebRTC) ------------------------------------------------

  /**
   * TURN serveri — qo'ng'iroqning "zaxira yo'li".
   *
   * ── Nima uchun kerak ───────────────────────────────────────────────
   * Ikki telefon odatda BEVOSITA ulanadi va bu bepul. Lekin mobil
   * operatorlarning ba'zi tarmoqlarida bevosita ulanish umuman
   * mumkin emas — o'rtada qattiq to'siq (NAT) turadi.
   *
   * Bunday holatda ovoz TURN serveri orqali o'tkaziladi. U trafikni
   * o'zidan o'tkazgani uchun PULLIK bo'ladi.
   *
   * IXTIYORIY: berilmasa qo'ng'iroq baribir ishlaydi — faqat qiyin
   * tarmoqlardagi ba'zi ulanishlar amalga oshmaydi.
   *
   * Maxfiy: bu qiymatlar `NEXT_PUBLIC_` EMAS. Ular faqat serverda
   * o'qiladi va tizimga kirgan foydalanuvchigagina beriladi — aks
   * holda ular bilan begonalar ham trafik sarflardi.
   */
  TURN_URL: z
    .string()
    .refine(
      (value) => value.startsWith('turn:') || value.startsWith('turns:'),
      'TURN_URL "turn:" yoki "turns:" bilan boshlanishi kerak',
    )
    .optional(),

  /** TURN serveriga kirish nomi. */
  TURN_USERNAME: z.string().min(1).optional(),

  /** TURN serveri paroli. */
  TURN_CREDENTIAL: z.string().min(1).optional(),

  // --- Push bildirishnomalar ----------------------------------------------

  /**
   * VAPID kalitlari — push yuborish uchun "imzo".
   *
   * ── Nima uchun kerak ───────────────────────────────────────────────
   * Push xabar brauzer ishlab chiqaruvchisining serveri (Google,
   * Mozilla) orqali o'tadi. U serverga "bu xabarni haqiqatan Navix
   * yubordi" deb isbotlash kerak — aks holda istalgan odam sizning
   * foydalanuvchilaringizga xabar yuborardi.
   *
   * VAPID aynan shu isbot: ochiq kalit brauzerga beriladi, maxfiy
   * kalit bilan har bir xabar imzolanadi.
   *
   * IXTIYORIY: berilmasa push umuman o'chadi va ilova bemalol
   * ishlayveradi — faqat ilova yopiq bo'lganda xabar kelmaydi.
   *
   * Kalit juftini yaratish:  npm run push:keys
   */
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),

  /**
   * Push xizmatiga ko'rsatiladigan aloqa manzili.
   *
   * Xabar yuborishda muammo chiqsa, brauzer ishlab chiqaruvchisi shu
   * manzilga murojaat qiladi. `mailto:` yoki sayt manzili bo'lishi
   * kerak.
   */
  VAPID_SUBJECT: z.string().min(1).default('mailto:support@navix.uz'),

  // --- Fayl saqlash (rasmlar) ---------------------------------------------

  /**
   * Vercel Blob kaliti — rasmlar shu yerda saqlanadi.
   *
   * ── Nima uchun fayllar SERVERDA saqlanmaydi ────────────────────────
   * Vercel'da ilova "serversiz" ishlaydi: har so'rov yangi, vaqtinchalik
   * muhitda bajariladi va diskka yozilgan narsa bir necha daqiqadan
   * keyin yo'qoladi. Ya'ni yuklangan rasm ertasi kuni ochilmasdi.
   *
   * IXTIYORIY: berilmasa fayllar MAHALLIY papkaga (`.uploads/`)
   * yoziladi. Bu faqat ishlab chiqish uchun — shunda kalitsiz ham
   * hamma narsani sinab ko'rish mumkin.
   *
   * Kalitni olish: Vercel → loyiha → Storage → Create → Blob.
   */
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
});

/**
 * Qo'shimcha tekshiruv: agar haqiqiy SMS provayderi tanlangan bo'lsa,
 * uning kalitlari ham berilgan bo'lishi shart. Aks holda foydalanuvchi
 * ro'yxatdan o'ta olmay qoladi va sababi noma'lum bo'lardi.
 */
const refinedServerSchema = serverSchema.superRefine((env, ctx) => {
  /**
   * TURN manzili berilgan bo'lsa, kalitlari ham bo'lishi shart.
   *
   * Yarim to'ldirilgan sozlama eng yomoni: qo'ng'iroq ishlayotgandek
   * ko'rinadi, lekin zaxira yo'l aslida ishlamaydi va buni faqat
   * haqiqiy foydalanuvchi sezadi.
   */
  if (env.TURN_URL) {
    if (!env.TURN_USERNAME) {
      ctx.addIssue({
        code: 'custom',
        path: ['TURN_USERNAME'],
        message: 'TURN_URL berilganda TURN_USERNAME majburiy',
      });
    }

    if (!env.TURN_CREDENTIAL) {
      ctx.addIssue({
        code: 'custom',
        path: ['TURN_CREDENTIAL'],
        message: 'TURN_URL berilganda TURN_CREDENTIAL majburiy',
      });
    }
  }

  /**
   * VAPID kalitlari — ikkalasi birga yoki umuman yo'q.
   *
   * Bittasi berilib, ikkinchisi unutilsa, push jimgina ishlamay
   * qolardi va sababini topish qiyin bo'lardi.
   */
  if (Boolean(env.VAPID_PUBLIC_KEY) !== Boolean(env.VAPID_PRIVATE_KEY)) {
    ctx.addIssue({
      code: 'custom',
      path: ['VAPID_PRIVATE_KEY'],
      message: "VAPID kalitlari IKKALASI birga berilishi kerak (yoki ikkalasi ham bo'lmasin)",
    });
  }

  if (env.SMS_PROVIDER !== 'eskiz') return;

  if (!env.ESKIZ_EMAIL) {
    ctx.addIssue({
      code: 'custom',
      path: ['ESKIZ_EMAIL'],
      message: "SMS_PROVIDER=eskiz bo'lganda ESKIZ_EMAIL majburiy",
    });
  }

  if (!env.ESKIZ_SECRET) {
    ctx.addIssue({
      code: 'custom',
      path: ['ESKIZ_SECRET'],
      message: "SMS_PROVIDER=eskiz bo'lganda ESKIZ_SECRET majburiy",
    });
  }
});

const clientSchema = z.object({
  /** Ilovaning tashqi manzili (absolute URL yasash uchun). */
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  /** Ilova nomi (brend). */
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('Navix'),

  /**
   * Sentry manzili (DSN) — xatolar shu yerga yuboriladi.
   *
   * ── Nima uchun `NEXT_PUBLIC_` ─────────────────────────────────────
   * Xatolar SERVERDA ham, BRAUZERDA ham yuz beradi. Brauzerdagi xato
   * yuborilishi uchun manzil brauzerga yetib borishi kerak.
   *
   * DSN — maxfiy kalit EMAS: u faqat "xatolarni shu loyihaga yoz"
   * degan manzil. U bilan hech narsani o'qib bo'lmaydi.
   *
   * IXTIYORIY: berilmasa xato kuzatuvi butunlay o'chadi va ilova
   * bemalol ishlayveradi.
   */
  NEXT_PUBLIC_SENTRY_DSN: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`).join('\n');
}

/**
 * Client (brauzer) tomonida ham xavfsiz o'qish mumkin bo'lgan qiymatlar.
 * `NEXT_PUBLIC_` prefiksi Next.js tomonidan build vaqtida almashtiriladi,
 * shuning uchun ular to'liq yoziladi.
 */
function parseClientEnv(): ClientEnv {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });

  if (!parsed.success) {
    throw new Error(`Client environment xato:\n${formatIssues(parsed.error)}`);
  }

  return parsed.data;
}

export const clientEnv: ClientEnv = parseClientEnv();

let cachedServerEnv: ServerEnv | null = null;

/**
 * Server tomonidagi maxfiy qiymatlar.
 *
 * Faqat server kodida chaqiring. Brauzerda chaqirilsa xatolik beradi —
 * bu maxfiy kalitlarning client bundle'ga tushib qolishidan himoya qiladi.
 */
export function serverEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() faqat server tomonida chaqirilishi mumkin');
  }

  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsed = refinedServerSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(`Server environment xato. ".env" faylini tekshiring:\n${formatIssues(parsed.error)}`);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';
export const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';
export const isTest = (): boolean => process.env.NODE_ENV === 'test';
