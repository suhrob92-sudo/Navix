import { NextResponse } from 'next/server';

import type { ErrorCodeValue, FieldErrors } from '@/lib/api/errors';

/**
 * Barcha API javoblari uchun yagona format (envelope).
 *
 * Nima uchun: frontend har bir modul uchun alohida "parser" yozmasligi kerak.
 * Har doim `success` maydoni bo'ladi — shunga qarab natija yoki xatolik o'qiladi.
 */

export interface ApiMeta {
  /** So'rovni kuzatish uchun ID — log'larda ham shu ID chiqadi. */
  requestId: string;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
  meta: ApiMeta & { pagination?: PaginationMeta };
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: ErrorCodeValue;
    message: string;
    details?: FieldErrors;
  };
  meta: ApiMeta;
}

export type ApiBody<T> = ApiSuccessBody<T> | ApiErrorBody;

function buildMeta(requestId: string): ApiMeta {
  return { requestId, timestamp: new Date().toISOString() };
}

/** Muvaffaqiyatli javob qaytaradi. */
export function apiSuccess<T>(
  data: T,
  options: { requestId: string; status?: number; pagination?: PaginationMeta; headers?: HeadersInit } = {
    requestId: 'unknown',
  },
): NextResponse<ApiSuccessBody<T>> {
  const { requestId, status = 200, pagination, headers } = options;

  return NextResponse.json(
    {
      success: true as const,
      data,
      meta: pagination ? { ...buildMeta(requestId), pagination } : buildMeta(requestId),
    },
    { status, headers },
  );
}

/** Xatolik javobini qaytaradi. */
export function apiError(options: {
  requestId: string;
  code: ErrorCodeValue;
  message: string;
  status: number;
  details?: FieldErrors;
  headers?: HeadersInit;
}): NextResponse<ApiErrorBody> {
  const { requestId, code, message, status, details, headers } = options;

  return NextResponse.json(
    {
      success: false as const,
      error: details ? { code, message, details } : { code, message },
      meta: buildMeta(requestId),
    },
    { status, headers },
  );
}

/** Sahifalash (pagination) meta ma'lumotini hisoblaydi. */
export function buildPagination(page: number, pageSize: number, total: number): PaginationMeta {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}
