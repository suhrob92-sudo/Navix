/**
 * Ilova bo'ylab yagona xatolik turlari.
 *
 * Nima uchun kerak: har bir modul o'zicha xatolik qaytarsa, frontend
 * ularni bir xil ishlay olmaydi. Shu yerdagi sinflar barcha API'lar uchun
 * bir xil `code` + `status` + `message` beradi.
 */

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Maydonlar bo'yicha validatsiya xatoliklari: { email: ["Noto'g'ri format"] } */
export type FieldErrors = Record<string, string[]>;

/**
 * Barcha "kutilgan" xatoliklar shu sinfdan meros oladi.
 * `isOperational = true` degani — bu dasturchi xatosi emas, balki
 * oldindan hisobga olingan holat (masalan: foydalanuvchi topilmadi).
 */
export class AppError extends Error {
  public readonly code: ErrorCodeValue;
  public readonly status: number;
  public readonly details?: FieldErrors;
  public readonly isOperational = true;

  constructor(code: ErrorCodeValue, status: number, message: string, details?: FieldErrors) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }
}

/** 400 — Yuborilgan ma'lumot noto'g'ri. */
export class ValidationError extends AppError {
  constructor(message = "Yuborilgan ma'lumot noto'g'ri", details?: FieldErrors) {
    super(ErrorCode.VALIDATION_ERROR, 400, message, details);
  }
}

/** 401 — Tizimga kirilmagan yoki token yaroqsiz. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Avtorizatsiya talab qilinadi') {
    super(ErrorCode.UNAUTHORIZED, 401, message);
  }
}

/** 403 — Kirgan, lekin bu amalga huquqi yo'q. */
export class ForbiddenError extends AppError {
  constructor(message = "Bu amalni bajarishga ruxsatingiz yo'q") {
    super(ErrorCode.FORBIDDEN, 403, message);
  }
}

/** 404 — Resurs topilmadi. */
export class NotFoundError extends AppError {
  constructor(resource = 'Resurs') {
    super(ErrorCode.NOT_FOUND, 404, `${resource} topilmadi`);
  }
}

/** 409 — Ziddiyat (masalan: bunday email allaqachon mavjud). */
export class ConflictError extends AppError {
  constructor(message = "Bu ma'lumot allaqachon mavjud") {
    super(ErrorCode.CONFLICT, 409, message);
  }
}

/** 429 — So'rovlar chegarasi oshib ketdi. */
export class RateLimitError extends AppError {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = "So'rovlar soni chegarasidan oshdi") {
    super(ErrorCode.RATE_LIMITED, 429, message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * 413 — So'rov tanasi juda katta.
 *
 * ── Nima uchun ALOHIDA xato, "validatsiya" emas ───────────────────────
 * Ikkalasi ham "so'rov noto'g'ri" degani, lekin sabab butunlay
 * boshqacha va chaqiruvchining harakati ham boshqacha:
 *
 *  · validatsiya xatosi — maydonni TUZATISH kerak;
 *  · hajm xatosi — so'rovni BO'LAKLARGA bo'lish yoki kamaytirish kerak.
 *
 * 413 — bu holatning standart raqami. Oraliqdagi xizmatlar (CDN,
 * proksi) uni tanaga qaramasdan tushunadi va shunga qarab ish tutadi.
 */
export class PayloadTooLargeError extends AppError {
  constructor(message = "So'rov hajmi juda katta") {
    super(ErrorCode.PAYLOAD_TOO_LARGE, 413, message);
  }
}

/** 503 — Tashqi xizmat (baza, Redis, to'lov tizimi) javob bermayapti. */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Xizmat vaqtincha ishlamayapti') {
    super(ErrorCode.SERVICE_UNAVAILABLE, 503, message);
  }
}
