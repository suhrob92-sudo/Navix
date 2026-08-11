import { randomUUID } from 'node:crypto';

import * as Sentry from '@sentry/nextjs';

import type { NextRequest, NextResponse } from 'next/server';
import type { Logger } from 'pino';
import { ZodError, type ZodType } from 'zod';

import { AppError, ErrorCode, RateLimitError, ValidationError, type FieldErrors } from '@/lib/api/errors';
import { apiError, type ApiErrorBody } from '@/lib/api/response';
import { isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * Har bir API route uchun umumiy "o'ram" (wrapper).
 *
 * U quyidagilarni avtomatik bajaradi:
 *  1. Har so'rovga `requestId` beradi (log va javobda bir xil bo'ladi);
 *  2. Har qanday xatolikni tutib, yagona formatda qaytaradi;
 *  3. Bajarilish vaqtini o'lchab log yozadi;
 *  4. Kutilmagan xatoliklarda ichki tafsilotlarni foydalanuvchiga chiqarmaydi
 *     (xavfsizlik — stack trace tashqariga chiqmasligi kerak).
 */

export interface RouteContext<TParams = Record<string, string>> {
  params: Promise<TParams>;
}

export interface HandlerContext<TParams = Record<string, string>> extends RouteContext<TParams> {
  requestId: string;
}

export type RouteHandler<TParams = Record<string, string>> = (
  request: NextRequest,
  context: HandlerContext<TParams>,
) => Promise<NextResponse> | NextResponse;

/** Zod xatoligini `{ maydon: [xabarlar] }` ko'rinishiga o'giradi. */
export function toFieldErrors(error: ZodError): FieldErrors {
  const result: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
    result[key] = [...(result[key] ?? []), issue.message];
  }

  return result;
}

function resolveRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') ?? randomUUID();
}

/** Uzun xato matnidan eng foydali qismini ajratadi (faqat dev rejimi uchun). */
export function toDeveloperHint(message: string, maxLength = 400): string {
  // Turbopack modul nomlari juda uzun va hech narsa anglatmaydi:
  // `__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib...`
  const cleaned = message.replace(/__TURBOPACK__[A-Za-z0-9_$]+__/g, '…').trim();

  // Sabab odatda OXIRIDA yoziladi. Masalan Prisma:
  //   "Invalid `prisma.x.findMany()` invocation: ...
  //    The table `public.service_providers` does not exist"
  // Shuning uchun boshidan emas, oxiridan kesamiz.
  return cleaned.length > maxLength ? `…${cleaned.slice(-maxLength)}` : cleaned;
}

export function withApiHandler<TParams = Record<string, string>>(
  handler: RouteHandler<TParams>,
): (request: NextRequest, context: RouteContext<TParams>) => Promise<NextResponse> {
  return async (request, context) => {
    const requestId = resolveRequestId(request);
    const startedAt = performance.now();
    const log = logger.child({ requestId, method: request.method, path: new URL(request.url).pathname });

    try {
      const response = await handler(request, { ...context, requestId });
      response.headers.set('x-request-id', requestId);

      log.info(
        { status: response.status, durationMs: Math.round(performance.now() - startedAt) },
        "So'rov bajarildi",
      );
      return response;
    } catch (error) {
      return handleRouteError(error, request, requestId, startedAt, log);
    }
  };
}

function handleRouteError(
  error: unknown,
  request: NextRequest,
  requestId: string,
  startedAt: number,
  log: Logger,
): NextResponse<ApiErrorBody> {
  const durationMs = Math.round(performance.now() - startedAt);

  if (error instanceof ZodError) {
    const validationError = new ValidationError(undefined, toFieldErrors(error));
    log.warn({ durationMs, details: validationError.details }, 'Validatsiya xatosi');

    return apiError({
      requestId,
      code: validationError.code,
      message: validationError.message,
      status: validationError.status,
      details: validationError.details,
    });
  }

  if (error instanceof AppError) {
    const headers =
      error instanceof RateLimitError ? { 'retry-after': String(error.retryAfterSeconds) } : undefined;

    log.warn({ durationMs, code: error.code, status: error.status }, error.message);

    return apiError({
      requestId,
      code: error.code,
      message: error.message,
      status: error.status,
      details: error.details,
      headers,
    });
  }

  // Kutilmagan xatolik: to'liq ma'lumot faqat log'ga.
  log.error({ err: error, durationMs }, 'Kutilmagan server xatosi');

  /**
   * Kutilmagan xato KUZATUV xizmatiga ham yuboriladi.
   *
   * ── Nima uchun bu ALOHIDA kerak edi ─────────────────────────────────
   * Bu o'ram barcha xatolarni tutadi va foydalanuvchiga toza javob
   * qaytaradi. Aynan shu sababli ular Next.js'ning o'z xato ilgagiga
   * (`onRequestError`) UMUMAN yetib bormasdi — ya'ni Sentry sozlangan
   * bo'lsa ham API xatolari ko'rinmasdi.
   *
   * Faqat KUTILMAGAN xatolar yuboriladi. "Parol noto'g'ri" yoki
   * "topilmadi" kabi javoblar odatiy ish oqimi: ular yuborilsa,
   * hisobot shovqinga to'lib ketardi va haqiqiy nosozliklar
   * ko'rinmay qolardi.
   */
  Sentry.captureException(error, {
    tags: { requestId },
    /**
     * So'rov TANASI yuborilmaydi.
     *
     * Unda parol, telefon raqami yoki yozishma bo'lishi mumkin.
     * Xatoni tushunish uchun esa manzil va usul yetarli.
     */
    extra: { method: request.method, path: new URL(request.url).pathname },
  });

  /**
   * Ishlab chiqish rejimida xato matni javobga ham qo'shiladi.
   *
   * Nima uchun: telefondan ishlaganda log faylini ochish qiyin. Ekranda
   * "Serverda kutilmagan xatolik" degan yozuv esa hech narsani aytmaydi —
   * jadval yo'qmi, ulanish uzilganmi, bilib bo'lmaydi.
   *
   * Production'da bu MUTLAQO chiqmaydi: xato matnida jadval nomlari va
   * ichki tuzilma haqida ma'lumot bo'ladi, u tashqariga chiqmasligi kerak.
   */
  const developerHint =
    !isProduction() && error instanceof Error ? { _dev: [toDeveloperHint(error.message)] } : undefined;

  return apiError({
    requestId,
    code: ErrorCode.INTERNAL_ERROR,
    message: "Serverda kutilmagan xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
    status: 500,
    details: developerHint,
  });
}

/** So'rov tanasini (JSON body) Zod sxemasi bo'yicha tekshiradi. */
export async function parseJsonBody<TSchema extends ZodType>(
  request: NextRequest,
  schema: TSchema,
): Promise<TSchema['_output']> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    throw new ValidationError("So'rov tanasi yaroqli JSON emas");
  }

  return schema.parse(raw);
}

/** Query parametrlarini (?page=2) Zod sxemasi bo'yicha tekshiradi. */
export function parseSearchParams<TSchema extends ZodType>(
  request: NextRequest,
  schema: TSchema,
): TSchema['_output'] {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return schema.parse(params);
}
