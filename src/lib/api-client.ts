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
  /** So'rov shuncha millisekunddan keyin to'xtatiladi. */
  timeoutMs?: number;
}

/**
 * So'rov eng ko'pi bilan shuncha kutadi.
 *
 * ── Nima uchun kerak (HAQIQIY XATO) ───────────────────────────────────
 * Muddatsiz `fetch` ABADIY kutishi mumkin: server qotib qolsa yoki
 * tarmoq jimgina uzilsa, javob ham, xato ham kelmaydi.
 *
 * Ilova esa o'sha javobni kutib turadi va foydalanuvchi abadiy
 * skeletni ko'radi — sahifa "qotib qolgandek" bo'ladi.
 *
 * 20 soniya — sekin mobil internet uchun ham yetarli zaxira, lekin
 * odam "buzilibdi" deb o'ylashidan oldin javob beradi.
 */
const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * API'ga so'rov yuboradi va yagona formatdagi javobni ochib beradi.
 *
 * @throws {ApiClientError} server xatolik qaytarsa yoki javob kelmasa
 */
export async function apiRequest<TData>(path: string, options: RequestOptions = {}): Promise<TData> {
  const { body, accessToken, headers, timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...init } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Chaqiruvchining o'z bekor qilish signali ham hurmat qilinadi.
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  let response: Response;

  /**
   * Fayl yuborilayotgan bo'lsa, tana O'Z HOLICHA uzatiladi.
   *
   * ── Nima uchun `content-type` OLIB TASHLANADI ──────────────────────
   * `multipart/form-data` sarlavhasi ichida chegara belgisi bo'ladi
   * (`boundary=----WebKitFormBoundary...`) va uni brauzer o'zi
   * yozadi. Biz "application/json" deb yozib qo'ysak, server tanani
   * umuman ocholmasdi — fayl "yo'q" bo'lib ko'rinardi.
   */
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  try {
    response = await fetch(path, {
      ...init,
      signal: controller.signal,
      // Refresh token cookie'si yuborilishi uchun majburiy.
      credentials: 'same-origin',
      headers: {
        ...(isFormData ? {} : { 'content-type': 'application/json' }),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: isFormData ? (body as FormData) : JSON.stringify(body) }),
    });
  } catch (error) {
    /**
     * Bu yerga ikki holatda tushamiz: muddat tugadi yoki tarmoq
     * uzildi. Ikkalasi ham "serverga yetib bo'lmadi" degani, shuning
     * uchun javob ham bir xil — `SERVICE_UNAVAILABLE`.
     *
     * Bu MUHIM: `UNAUTHORIZED` dan farqli o'laroq, bu holatda
     * foydalanuvchini kirish sahifasiga haydash NOTO'G'RI bo'lardi —
     * u tizimdan chiqmagan, shunchaki aloqa yo'q.
     */
    throw new ApiClientError(
      0,
      'SERVICE_UNAVAILABLE',
      controller.signal.aborted
        ? "Server javob bermadi. Aloqani tekshirib, qayta urinib ko'ring."
        : "Serverga ulanib bo'lmadi. Aloqani tekshirib, qayta urinib ko'ring.",
      { _cause: [error instanceof Error ? error.message : String(error)] },
    );
  } finally {
    clearTimeout(timer);
  }

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

/**
 * Bu xato "server yetib bo'lmadi" degani (aloqa yo'q, muddat tugadi
 * yoki serverning o'zi buzilgan) — foydalanuvchi TIZIMDAN CHIQMAGAN.
 *
 * Farqni ajratish shart: chiqmagan odamni kirish sahifasiga haydash
 * uni cheksiz aylanishga tushirib qo'yadi (sabab `proxy.ts` da).
 */
export function isServerUnreachable(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) {
    // `TypeError` — brauzerning tarmoq xatosi.
    return error instanceof TypeError;
  }

  return error.status === 0 || error.status >= 500;
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
