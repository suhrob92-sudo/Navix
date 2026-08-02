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

  /** Log darajasi. */
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const clientSchema = z.object({
  /** Ilovaning tashqi manzili (absolute URL yasash uchun). */
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  /** Ilova nomi (brend). */
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('Navix'),
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

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(`Server environment xato. ".env" faylini tekshiring:\n${formatIssues(parsed.error)}`);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';
export const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';
export const isTest = (): boolean => process.env.NODE_ENV === 'test';
