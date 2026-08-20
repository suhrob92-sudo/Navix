import type {
  ContentRemovalReasonName,
  ModeratedContentKindName,
} from '@/config/moderation-reasons';

/**
 * Moderatsiya — brauzer va server uchun umumiy turlar.
 */

export type ReportReasonName = 'SPAM' | 'HARASSMENT' | 'FRAUD' | 'IMPERSONATION' | 'OTHER';

/** Bloklangan odam — ro'yxat uchun. */
export interface BlockedUserView {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  blockedAt: string;
}

export interface BlockedListResponse {
  users: BlockedUserView[];
}

export interface BlockResponse {
  isBlocked: boolean;
}

export interface ReportResponse {
  /** Shikoyat qabul qilindi (yoki allaqachon ko'rib chiqilmoqda). */
  isReported: boolean;
}

/**
 * Shikoyat sabablari.
 *
 * ── Nima uchun tayyor ro'yxat ─────────────────────────────────────────
 * Erkin matn ham mumkin edi, lekin unda har shikoyatni odam o'qib
 * chiqishi kerak bo'lardi. Tayyor sabablar esa guruhlash va tartiblash
 * imkonini beradi: "bitta odam ustidan 10 ta firibgarlik shikoyati"
 * darhol ko'rinadi.
 *
 * "Boshqa" varianti qoldirilgan — ro'yxat hech qachon to'liq bo'lmaydi.
 */
export const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam va reklama' },
  { value: 'HARASSMENT', label: 'Haqorat yoki tahdid' },
  { value: 'FRAUD', label: "Firibgarlik, pul so'rash" },
  { value: 'IMPERSONATION', label: "Boshqa odam nomidan ish ko'rish" },
  { value: 'OTHER', label: 'Boshqa sabab' },
] as const satisfies readonly { value: ReportReasonName; label: string }[];

/** Sababning o'zbekcha nomi. */
export function reportReasonLabel(reason: ReportReasonName): string {
  return REPORT_REASONS.find((item) => item.value === reason)?.label ?? reason;
}

/**
 * Shikoyatning holati.
 *
 * `OPEN` — yangi, `REVIEWED` — chora ko'rildi, `DISMISSED` — asos yo'q.
 */
export type ReportStatusName = 'OPEN' | 'REVIEWED' | 'DISMISSED';

export const REPORT_STATUS_LABELS: Record<ReportStatusName, string> = {
  OPEN: 'Yangi',
  REVIEWED: "Chora ko'rildi",
  DISMISSED: 'Asos topilmadi',
};

/** Moderator ro'yxatidagi bitta shikoyat. */
export interface AdminReportView {
  id: string;
  reason: ReportReasonName;
  note: string | null;
  status: ReportStatusName;
  createdAt: string;
  reviewedAt: string | null;

  /** Shikoyat qilgan odam. */
  reporter: ReportPartyView;
  /** Kim ustidan shikoyat qilingan. */
  target: ReportPartyView;
  /**
   * Shu odam ustidan jami OCHIQ shikoyatlar soni.
   *
   * Bitta shikoyat tasodif bo'lishi mumkin, o'ntasi esa — naqsh.
   * Moderator qaror qabul qilishda avval shu songa qaraydi.
   */
  targetOpenReports: number;
  /**
   * Shikoyat aynan QAYSI yozuv haqida.
   *
   * `null` — odam ustidan umumiy shikoyat (avvalgi tartib). Yozuv
   * ko'rsatilganda moderator matnni O'SHA YERDA o'qiydi va uni
   * ochish uchun boshqa sahifaga o'tmaydi.
   */
  content: ReportedContentView | null;
}

/** Shikoyat qilingan post yoki izoh. */
export interface ReportedContentView {
  kind: 'POST' | 'COMMENT' | 'STORY';
  id: string;
  /** Matn boshi — ro'yxatga sig'adigan hajmda. */
  preview: string;
  /** Hozir odamlarga ko'rinadimi. */
  isVisible: boolean;
  /** Postga havola; izoh uchun — u turgan post. */
  href: string;
}

export interface ReportPartyView {
  userId: string;
  username: string;
  fullName: string | null;
}

export interface AdminReportListResponse {
  reports: AdminReportView[];
}

/**
 * Kim menga yoza olishi.
 *
 * Bu qiymat profil sozlamalarida tanlanadi va chat ham, qo'ng'iroq ham
 * unga bo'ysunadi.
 */
export type MessagePrivacyName = 'EVERYONE' | 'FOLLOWERS' | 'NOBODY';

/**
 * Nima uchun yozib bo'lmasligining sababi.
 *
 * ── Nima uchun sabab AJRATILADI ───────────────────────────────────────
 * Foydalanuvchiga "yozib bo'lmaydi" deyish yetarli emas: u nima
 * qilishini bilmaydi. Sabab aniq bo'lsa, xabar ham aniq bo'ladi.
 *
 * MUHIM: "meni bloklashgan" sababi foydalanuvchiga AYTILMAYDI —
 * quyidagi matnlar shu qoidani hisobga oladi.
 */
export type MessageDenyReason = 'BLOCKED_BY_ME' | 'BLOCKED_BY_THEM' | 'FOLLOWERS_ONLY' | 'NOBODY';

/**
 * Rad etish sababining ko'rinadigan matni.
 *
 * ── Nima uchun bloklanganlik OSHKOR QILINMAYDI ────────────────────────
 * "Bu odam sizni bloklagan" deb yozilsa, bloklash o'z ma'nosini
 * yo'qotardi: bezovta qiluvchi odam buni bilib, boshqa hisob ochardi
 * yoki tashqarida bosim o'tkazardi.
 *
 * Shuning uchun tashqi ko'rinish "shaxsiy sozlama" bilan bir xil.
 */
export function messageDenyText(reason: MessageDenyReason): string {
  if (reason === 'BLOCKED_BY_ME') {
    return 'Siz bu foydalanuvchini bloklagansiz. Yozish uchun blokdan chiqaring.';
  }

  if (reason === 'FOLLOWERS_ONLY') {
    return 'Bu foydalanuvchiga faqat u kuzatadigan odamlar yoza oladi.';
  }

  // BLOCKED_BY_THEM va NOBODY — ataylab BIR XIL matn.
  return "Bu foydalanuvchiga xabar yozib bo'lmaydi.";
}

// ─────────────────────────────────────────────────────────────────────
// Olib tashlangan yozuvlar — MUALLIF uchun
// ─────────────────────────────────────────────────────────────────────

/**
 * Muallif ko'radigan bitta qaror.
 *
 * ── Nima uchun yorliq va izoh SERVERDA tayyorlanadi ───────────────────
 * Ularni brauzerda ham hisoblash mumkin edi (sozlama fayli
 * brauzerga ketadi). Lekin bu qaror bildirishnomada ham, sahifada
 * ham, kelajakda elektron pochtada ham bir xil ko'rinishi kerak —
 * ya'ni matn bitta joyda yig'ilgani ma'qul.
 */
export interface ContentRemovalView {
  id: string;
  kind: ModeratedContentKindName;
  /** "Post", "Mahsulot" — ekranda ko'rinadigan tur nomi. */
  kindLabel: string;
  /** Yozuvning qaror paytidagi nomi. */
  title: string;
  reason: ContentRemovalReasonName;
  /** Qisqa yorliq — "Spam". */
  reasonLabel: string;
  /** To'liq tushuntirish: qoida + moderator izohi. */
  notice: string;
  /** Yozuv qaytarilganmi. */
  isRestored: boolean;
  createdAt: string;
  restoredAt: string | null;
}

export interface ContentRemovalListResponse {
  removals: ContentRemovalView[];
}
