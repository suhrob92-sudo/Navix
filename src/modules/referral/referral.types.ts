/**
 * Taklif tizimi — brauzer va server uchun umumiy turlar.
 */

/** Taklif qilingan bitta odam. */
export interface InvitedPersonView {
  /** Ekranda ko'rinadigan ism. Ism yozilmagan bo'lsa foydalanuvchi nomi. */
  name: string;
  avatarUrl: string | null;
  /** Profilga havola. */
  username: string;
  /** Qachon qo'shilgani (ISO). */
  joinedAt: string;
  /**
   * Hisob TASDIQLANGANMI.
   *
   * ── Nima uchun bu ko'rsatiladi ─────────────────────────────────────
   * Odam havolani ochib, ro'yxatdan o'ta boshlab, telefon kodini
   * kiritmasdan tashlab ketishi mumkin. Bunday hisob hali haqiqiy
   * emas.
   *
   * Uni ro'yxatdan butunlay yashirsak, taklif qilgan odam
   * "do'stim kirdi, lekin ko'rinmayapti" deb o'ylardi. Shuning
   * uchun u ko'rinadi, lekin HISOBGA kirmaydi.
   */
  isActive: boolean;
}

export interface ReferralOverview {
  /** Shaxsiy kod. */
  code: string;
  /** To'liq havola — ulashishga tayyor. */
  link: string;
  /** Tasdiqlangan (haqiqiy) foydalanuvchilar soni. */
  joinedCount: number;
  /** Hali tasdiqlanmaganlar soni. */
  pendingCount: number;
  /** Meni kim taklif qilgani. `null` — hech kim. */
  invitedBy: { name: string; username: string } | null;
}

export interface ReferralListResponse {
  people: InvitedPersonView[];
  /** Yana bormi. */
  hasMore: boolean;
}

/** Taklif havolasi ochilganda ko'rsatiladigan ma'lumot. */
export interface ReferralInviterView {
  name: string;
  avatarUrl: string | null;
  username: string;
}
