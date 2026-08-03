import type { ApiBody } from '@/lib/api/response';
import type { ErrorCodeValue, FieldErrors } from '@/lib/api/errors';

/**
 * Brauzer tomonidan API'ga murojaat qilish uchun klient.
 *
 * Nima uchun kerak: har bir sahifada `fetch` ni qo'lda yozish o'rniga
 * bitta joyda yozamiz. Shunda xatoliklar bir xil ishlanadi va cookie
 * sozlamalari unutilmaydi.
 */

/** API qaytargan xatolikni ifodalovchi sinf. */
export class ApiClientError extends Error {
  public readonly code: ErrorCodeValue;
  public readonly status: number;
  public readonly details?: FieldErrors;

  constructor(status: number, code: ErrorCodeValue, message: string, details?: FieldErrors) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Maydon bo'yicha birinchi xatolik matnini qaytaradi. */
  fieldError(field: string): string | undefined {
    return this.details?.[field]?.[0];
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Access token — himoyalangan endpointlar uchun. */
  accessToken?: string | null;
}

/**
 * API'ga so'rov yuboradi va yagona formatdagi javobni ochib beradi.
 *
 * @throws {ApiClientError} server xatolik qaytarsa
 */
export async function apiRequest<TData>(path: string, options: RequestOptions = {}): Promise<TData> {
  const { body, accessToken, headers, ...init } = options;

  const response = await fetch(path, {
    ...init,
    // Refresh token cookie'si yuborilishi uchun majburiy.
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  let payload: ApiBody<TData>;

  try {
    payload = (await response.json()) as ApiBody<TData>;
  } catch {
    throw new ApiClientError(
      response.status,
      'INTERNAL_ERROR',
      "Server javobini o'qib bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.",
    );
  }

  if (!payload.success) {
    throw new ApiClientError(response.status, payload.error.code, payload.error.message, payload.error.details);
  }

  return payload.data;
}

/** Tarmoq uzilishi kabi kutilmagan xatoliklarni ham o'zbekcha xabarga aylantiradi. */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    /**
     * Ishlab chiqish rejimida server xatoning haqiqiy sababini `_dev`
     * maydonida yuboradi (`src/lib/api/handler.ts`). Uni ekranda
     * ko'rsatamiz — aks holda telefondan tashxis qo'yib bo'lmaydi.
     *
     * Production'da server bu maydonni umuman yubormaydi.
     */
    const developerHint = error.details?._dev?.[0];

    return developerHint ? `${error.message}\n\n[dev] ${developerHint}` : error.message;
  }

  if (error instanceof TypeError) {
    return "Internetga ulanishda muammo. Aloqani tekshirib, qayta urinib ko'ring.";
  }

  return "Kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.";
}
