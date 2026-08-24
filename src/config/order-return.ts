/**
 * Mahsulotni qaytarish — yagona sozlama.
 *
 * ── Nima uchun bu kerak ───────────────────────────────────────────────
 * Internetdan mahsulot olishning eng katta qo'rquvi: "olib, yoqmasa
 * nima qilaman?". Do'konda buyumni ushlab ko'rish mumkin, bu yerda
 * esa yo'q.
 *
 * Qaytarish imkoniyati aynan shu qo'rquvni yo'qotadi. U mavjud
 * bo'lgani uchun ko'pchilik undan foydalanmaydi ham — bilishning
 * o'zi yetarli.
 *
 * ── Nima uchun qoidalar SHU YERDA ─────────────────────────────────────
 * Qaytarish PUL bilan bog'liq. "Necha kun ichida", "qancha qaytadi"
 * degan qoidalar kod bo'ylab sochilib ketsa, ular bir kun kelib
 * bir-biriga zid bo'lardi va kimdir noto'g'ri summa olardi.
 */

/**
 * Yetkazilgandan keyin necha kun ichida qaytarish mumkin.
 *
 * ── Nima uchun 14 kun ─────────────────────────────────────────────────
 * O'zbekiston qonunchiligida oziq-ovqat bo'lmagan mahsulot uchun
 * muddat 14 kun. Undan qisqa muddat qo'yish qonunga zid bo'lardi.
 *
 * Uzunroq muddat ham qo'yish mumkin edi, lekin u sotuvchini
 * noaniqlikda ushlab turardi: sotilgan pulni qachon "meniki" deb
 * hisoblashni bilmasdi.
 */
export const RETURN_WINDOW_DAYS = 14;

/** Izoh uzunligi. */
export const RETURN_COMMENT_MAX_LENGTH = 500;

/** Rad etish sababi uzunligi. */
export const DECISION_NOTE_MAX_LENGTH = 255;

export type ReturnReasonName =
  | 'DAMAGED'
  | 'WRONG_ITEM'
  | 'NOT_AS_DESCRIBED'
  | 'CHANGED_MIND'
  | 'OTHER';

export type ReturnStatusName = 'PENDING' | 'APPROVED' | 'REJECTED';

export const RETURN_REASONS: readonly { value: ReturnReasonName; label: string }[] = [
  { value: 'DAMAGED', label: 'Buzilgan holda keldi' },
  { value: 'WRONG_ITEM', label: 'Boshqa mahsulot keldi' },
  { value: 'NOT_AS_DESCRIBED', label: 'Tavsifga mos kelmadi' },
  { value: 'CHANGED_MIND', label: 'Fikrimdan qaytdim' },
  { value: 'OTHER', label: 'Boshqa sabab' },
];

export const RETURN_REASON_LABELS: Record<ReturnReasonName, string> = Object.fromEntries(
  RETURN_REASONS.map((option) => [option.value, option.label]),
) as Record<ReturnReasonName, string>;

export const RETURN_STATUS_LABELS: Record<ReturnStatusName, string> = {
  PENDING: "Ko'rib chiqilmoqda",
  APPROVED: 'Qabul qilindi',
  REJECTED: 'Rad etildi',
};

export const RETURN_STATUS_VARIANTS: Record<
  ReturnStatusName,
  'default' | 'success' | 'warning' | 'destructive'
> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

/**
 * Ayb SOTUVCHIDAmi.
 *
 * ── Nima uchun bu farq muhim ──────────────────────────────────────────
 * Yetkazish haqi shu savolga qarab qaytariladi. Buzilgan mahsulot
 * uchun xaridordan yetkazish pulini ushlab qolish adolatsiz: u
 * hech qanday xato qilmagan.
 *
 * "Fikrimdan qaytdim" esa boshqa gap — mahsulot joyida edi va
 * kuryer ishini bajargan.
 */
export function isSellerFault(reason: ReturnReasonName): boolean {
  return reason === 'DAMAGED' || reason === 'WRONG_ITEM' || reason === 'NOT_AS_DESCRIBED';
}

/** Qaytarishga to'sqinlik qiladigan sabablar. */
export type ReturnBlockReason =
  | 'NOT_DELIVERED'
  | 'WINDOW_CLOSED'
  | 'ALREADY_REQUESTED';

export const RETURN_BLOCK_TEXT: Record<ReturnBlockReason, string> = {
  NOT_DELIVERED: 'Qaytarish faqat buyurtma yetkazilgandan keyin mumkin.',
  WINDOW_CLOSED: `Qaytarish muddati o'tgan — yetkazilgandan keyin ${RETURN_WINDOW_DAYS} kun beriladi.`,
  ALREADY_REQUESTED: "Bu buyurtma uchun so'rov allaqachon yuborilgan.",
};

export interface ReturnEligibility {
  canRequest: boolean;
  reason: ReturnBlockReason | null;
  /** Muddat tugashiga necha kun qolgan. */
  daysLeft: number | null;
}

/**
 * Qaytarish so'rovi yuborish mumkinmi.
 *
 * ── Nima uchun sabab ham qaytariladi ──────────────────────────────────
 * Tugmani shunchaki yashirish yomon yechim: odam "qaytarish
 * yo'q ekan" deb o'ylardi. Sabab aytilsa, u nima qilish
 * kerakligini biladi.
 */
export function checkReturnEligibility(
  order: { status: string; deliveredAt: string | null; hasReturnRequest: boolean },
  now: Date = new Date(),
): ReturnEligibility {
  if (order.hasReturnRequest) {
    return { canRequest: false, reason: 'ALREADY_REQUESTED', daysLeft: null };
  }

  if (order.status !== 'DELIVERED' || !order.deliveredAt) {
    return { canRequest: false, reason: 'NOT_DELIVERED', daysLeft: null };
  }

  const left = daysLeftInWindow(order.deliveredAt, now);

  if (left <= 0) {
    return { canRequest: false, reason: 'WINDOW_CLOSED', daysLeft: 0 };
  }

  return { canRequest: true, reason: null, daysLeft: left };
}

/**
 * Muddat tugashiga necha kun qolgan.
 *
 * Yetkazilgan kunning O'ZI ham hisobga kiradi, shuning uchun natija
 * yuqoriga yaxlitlanadi: 13.2 kun qolgan bo'lsa "14 kun" deyish
 * xato, "13 kun" deyish esa xaridorni bir kunga aldash bo'lardi.
 */
export function daysLeftInWindow(deliveredAt: string, now: Date = new Date()): number {
  const delivered = new Date(deliveredAt).getTime();

  if (Number.isNaN(delivered)) return 0;

  const deadline = delivered + RETURN_WINDOW_DAYS * 86_400_000;
  const left = deadline - now.getTime();

  if (left <= 0) return 0;

  return Math.ceil(left / 86_400_000);
}

/** Qaytarilayotgan bitta qator. */
export interface ReturnLine {
  /** Bitta donaning narxi TIYINDA. */
  unitPrice: number;
  quantity: number;
}

/**
 * Qaytariladigan summani hisoblaydi — TIYINDA.
 *
 * ── Nima uchun yetkazish haqi HAR DOIM qaytmaydi ──────────────────────
 * Ikkita shart birga bajarilishi kerak:
 *
 *   1. ayb sotuvchida (buzilgan, boshqa mahsulot, tavsifga mos
 *      emas) — aks holda kuryer ishini bajargan va uning haqi
 *      to'langan bo'lishi kerak;
 *   2. buyurtma TO'LIQ qaytarilmoqda — bitta mahsulot qaytsa,
 *      qolganlari baribir yetkazilgan.
 *
 * Bu qoida ataylab sodda: xaridor uni bir jumlada tushunishi va
 * oldindan bilishi kerak.
 */
export function calculateRefund(
  lines: readonly ReturnLine[],
  options: {
    deliveryFee: number;
    reason: ReturnReasonName;
    /** Buyurtmadagi HAMMA dona qaytarilyaptimi. */
    isFullReturn: boolean;
  },
): number {
  const goods = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  const refundsDelivery = options.isFullReturn && isSellerFault(options.reason);

  return goods + (refundsDelivery ? options.deliveryFee : 0);
}

/**
 * Yetkazish haqi qaytariladimi — ekranda oldindan aytish uchun.
 *
 * Xaridor "Yuborish" tugmasini bosishdan OLDIN qancha pul
 * qaytishini bilishi kerak.
 */
export function refundsDeliveryFee(reason: ReturnReasonName, isFullReturn: boolean): boolean {
  return isFullReturn && isSellerFault(reason);
}
