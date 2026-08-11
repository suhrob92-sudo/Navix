import { createHash } from 'node:crypto';

import { Prisma } from '@/generated/prisma/client';
import { NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  cleanErrorMessage,
  cleanPath,
  ERROR_LIMITS,
  isIgnoredError,
  normalizeMessage,
  type ErrorLogView,
  type ErrorSourceName,
} from '@/modules/error-log/error-log.types';
import type { ErrorLogQuery } from '@/modules/error-log/error-log.schemas';

/**
 * Xatolar jurnali.
 *
 * ── Modulning ASOSIY qoidasi: HECH QACHON XATO TASHLAMASLIK ───────────
 * Bu modul xatolarni yozadi. Agar u o'zi xato tashlasa, asosiy amal
 * (foydalanuvchining to'lovi, xabari) ham to'xtardi — ya'ni kuzatuv
 * vositasi ilovani buzardi.
 *
 * Shuning uchun yozish funksiyasidagi barcha xatolar tutiladi va
 * faqat log'ga chiqadi.
 */

/** Eski yozuvlar shuncha kundan keyin o'chiriladi. */
const RETENTION_DAYS = 30;

/**
 * Tozalash SHU EHTIMOLLIK bilan ishga tushadi (1%).
 *
 * ── Nima uchun fon jarayoni emas ──────────────────────────────────────
 * Serversiz muhitda doim ishlaydigan fon jarayoni yo'q. Har yozuvda
 * tozalash esa ortiqcha so'rov bo'lardi.
 *
 * Tasodifiy ishga tushirish ikkalasini yechadi: jadval hech qachon
 * cheksiz o'smaydi, qo'shimcha yuk esa deyarli sezilmaydi.
 */
const CLEANUP_CHANCE = 0.01;

export interface RecordErrorInput {
  source: ErrorSourceName;
  kind: string;
  message: string;
  path: string;
  method?: string | null;
  stack?: string | null;
}

/**
 * Bir xil xatolarni birlashtiruvchi barmoq izi.
 *
 * Turi, TOZALANGAN matni va manzilidan hisoblanadi — ya'ni bir
 * sahifadagi bir xil xato har doim bitta qatorga tushadi.
 */
function buildFingerprint(source: string, kind: string, message: string, path: string): string {
  return createHash('sha256')
    .update(`${source}|${kind}|${normalizeMessage(message)}|${path}`)
    .digest('hex')
    .slice(0, 64);
}

/** Hozir ishlab turgan versiya (Vercel commit belgisi). */
function resolveVersion(): string | null {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA;

  return sha ? sha.slice(0, 7) : null;
}

/** Eski yozuvlarni o'chiradi. */
async function cleanupOldErrors(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1_000);

  const removed = await prisma.errorLog.deleteMany({ where: { lastSeenAt: { lt: cutoff } } });

  if (removed.count > 0) {
    logger.info({ removed: removed.count }, "Eski xato yozuvlari o'chirildi");
  }
}

/**
 * Xatoni yozadi (yoki mavjud yozuvning sonini oshiradi).
 *
 * Hech qachon xato tashlamaydi.
 */
export async function recordError(input: RecordErrorInput): Promise<void> {
  try {
    if (isIgnoredError(input.message)) return;

    const path = cleanPath(input.path);
    const kind = (input.kind || 'Error').slice(0, ERROR_LIMITS.kind);
    const message = input.message.slice(0, ERROR_LIMITS.message) || "Noma'lum xatolik";

    const fingerprint = buildFingerprint(input.source, kind, message, path);

    /**
     * `upsert` — bitta so'rovda "bor bo'lsa oshir, bo'lmasa yarat".
     *
     * Ikki bosqichli tekshiruv (avval o'qib, keyin yozish) bu yerda
     * ishlamasdi: bir vaqtda kelgan ikkita bir xil xato ikkita qator
     * yaratib qo'yardi.
     */
    await prisma.errorLog.upsert({
      where: { fingerprint },
      create: {
        fingerprint,
        source: input.source,
        kind,
        message,
        path,
        method: input.method?.slice(0, 10) ?? null,
        stack: input.stack?.slice(0, ERROR_LIMITS.stack) ?? null,
        version: resolveVersion(),
      },
      update: {
        count: { increment: 1 },
        lastSeenAt: new Date(),
        /**
         * Yopilgan xato QAYTA OCHILADI.
         *
         * "Tuzatdim" deb belgilangan xato yana chiqsa — demak
         * tuzatilmagan. Uni jimgina yopiq qoldirish eng yomon
         * holat bo'lardi: muammo bor, lekin ko'rinmaydi.
         */
        isResolved: false,
        version: resolveVersion(),
      },
    });

    if (Math.random() < CLEANUP_CHANCE) {
      await cleanupOldErrors();
    }
  } catch (error) {
    // Kuzatuv vositasi ilovani hech qachon buzmasligi kerak.
    logger.warn({ err: error }, "Xatoni jurnalga yozib bo'lmadi");
  }
}

/** `Error` obyektidan yozuv yasaydi. */
export async function recordServerError(error: unknown, path: string, method?: string | null): Promise<void> {
  const isError = error instanceof Error;

  await recordError({
    source: 'SERVER',
    kind: isError ? error.name : typeof error,
    /**
     * Matn TOZALANADI: Prisma xatosi modul nomlari va fayl
     * yo'llari bilan bir necha ekran to'la bo'ladi, sabab esa
     * eng oxirida yoziladi.
     */
    message: cleanErrorMessage(isError ? error.message : String(error)),
    path,
    method: method ?? null,
    stack: isError ? (error.stack ?? null) : null,
  });
}

// ─────────────────────────────────────────────────────────────────────
// Admin panel uchun
// ─────────────────────────────────────────────────────────────────────

const ERROR_SELECT = {
  id: true,
  source: true,
  kind: true,
  message: true,
  path: true,
  method: true,
  stack: true,
  count: true,
  isResolved: true,
  version: true,
  firstSeenAt: true,
  lastSeenAt: true,
} as const;

type ErrorRow = Prisma.ErrorLogGetPayload<{ select: typeof ERROR_SELECT }>;

function toErrorView(row: ErrorRow): ErrorLogView {
  return {
    id: row.id,
    source: row.source as ErrorSourceName,
    kind: row.kind,
    message: row.message,
    path: row.path,
    method: row.method,
    stack: row.stack,
    count: row.count,
    isResolved: row.isResolved,
    version: row.version,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
  };
}

export async function listErrors(
  query: ErrorLogQuery,
): Promise<{ errors: ErrorLogView[]; total: number; openCount: number }> {
  const where: Prisma.ErrorLogWhereInput = {
    ...(query.status === 'OPEN' ? { isResolved: false } : {}),
    ...(query.status === 'RESOLVED' ? { isResolved: true } : {}),
    ...(query.source === 'ALL' ? {} : { source: query.source }),
  };

  const [rows, total, openCount] = await Promise.all([
    prisma.errorLog.findMany({
      where,
      select: ERROR_SELECT,
      // Eng yangi xato birinchi — indeks ham shu tartibda.
      orderBy: { lastSeenAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.errorLog.count({ where }),
    prisma.errorLog.count({ where: { isResolved: false } }),
  ]);

  return { errors: rows.map(toErrorView), total, openCount };
}

/** Xatoni "ko'rib chiqilgan" deb belgilaydi (yoki qaytaradi). */
export async function setErrorResolved(errorId: string, isResolved: boolean): Promise<void> {
  const row = await prisma.errorLog.findUnique({ where: { id: errorId }, select: { id: true } });

  if (!row) {
    throw new NotFoundError('Xato');
  }

  await prisma.errorLog.update({ where: { id: errorId }, data: { isResolved } });
}

/**
 * Yopilgan xatolarni o'chiradi.
 *
 * ── Nima uchun faqat YOPILGANLARI ─────────────────────────────────────
 * "Hammasini tozalash" tugmasi ochiq xatolarni ham o'chirardi va
 * tuzatilmagan muammo ko'zdan yo'qolardi. Yopilgani esa allaqachon
 * ko'rib chiqilgan.
 */
export async function clearResolvedErrors(): Promise<number> {
  const removed = await prisma.errorLog.deleteMany({ where: { isResolved: true } });

  return removed.count;
}
