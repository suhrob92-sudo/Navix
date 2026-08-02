import pino, { type Logger } from 'pino';

/**
 * Markazlashgan logger (jurnal yozuvchi).
 *
 * Development'da o'qishga qulay rangli chiqish, production'da esa
 * mashina o'qiy oladigan JSON format ishlatiladi (Datadog, Loki, CloudWatch
 * kabi tizimlar shuni kutadi).
 *
 * Maxfiy maydonlar (parol, token, karta raqami) avtomatik yashiriladi.
 */

const REDACTED_PATHS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cardNumber',
  'cvv',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  'req.headers.authorization',
  'req.headers.cookie',
];

function createLogger(): Logger {
  const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info');
  const isDev = process.env.NODE_ENV === 'development';

  return pino({
    level,
    redact: { paths: REDACTED_PATHS, censor: '[YASHIRILGAN]' },
    base: { app: process.env.NEXT_PUBLIC_APP_NAME ?? 'navix' },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,app' },
          },
        }
      : {}),
  });
}

/**
 * Next.js dev rejimida modullar qayta yuklanadi. Global'da saqlash orqali
 * har safar yangi logger yaratilishining oldini olamiz.
 */
const globalForLogger = globalThis as unknown as { navixLogger?: Logger };

export const logger: Logger = globalForLogger.navixLogger ?? createLogger();

if (process.env.NODE_ENV !== 'production') {
  globalForLogger.navixLogger = logger;
}

/**
 * Modul nomi bilan belgilangan "bola" logger yaratadi.
 * Masalan: `const log = createModuleLogger('taxi')`
 */
export function createModuleLogger(moduleName: string): Logger {
  return logger.child({ module: moduleName });
}
