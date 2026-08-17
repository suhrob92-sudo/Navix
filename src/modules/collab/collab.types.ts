/**
 * Hamkorlik — biznes va ijodkor o'rtasidagi taklif.
 *
 * ── Nima uchun ALOHIDA modul ──────────────────────────────────────────
 * Buni suhbat modulining ichiga qo'yish mumkin edi: taklif ham
 * xabarga o'xshaydi. Lekin ularning ishi butunlay boshqa.
 *
 * Xabar — oqim: u yozilib, o'qilib, unutiladi. Taklif esa HOLATGA
 * ega: kutilmoqda, qabul qilindi, rad etildi. Uni javobsiz qoldirib
 * bo'lmaydi va u ro'yxatda javob kutib turishi kerak.
 *
 * Ikkalasini aralashtirsak, taklif boshqa suhbatlar orasida yo'qolib
 * ketardi — aynan hozirgi holat.
 */

export const COLLAB_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'] as const;

export type CollabStatusName = (typeof COLLAB_STATUSES)[number];

/** Holat nomi — ekranda ko'rinadigan matn. */
export const COLLAB_STATUS_LABELS: Record<CollabStatusName, string> = {
  PENDING: 'Javob kutilmoqda',
  ACCEPTED: 'Qabul qilindi',
  DECLINED: 'Rad etildi',
  WITHDRAWN: 'Qaytarib olindi',
};

/**
 * Qaysi quti ko'rsatilyapti.
 *
 * ── Nima uchun ikkita quti ────────────────────────────────────────────
 * Bitta odam ham ijodkor, ham biznes egasi bo'lishi mumkin: usta o'z
 * do'koni haqida video joylaydi va boshqa blogerga taklif yuboradi.
 *
 * Bitta ro'yxatda ikkalasi aralashsa, "menga kim yozdi?" degan
 * savolga javob topish qiyinlashardi.
 */
export const COLLAB_BOXES = ['IN', 'OUT'] as const;

export type CollabBoxName = (typeof COLLAB_BOXES)[number];

/** Taklifdagi odam — ro'yxatda ko'rinadigan minimum. */
export interface CollabPersonView {
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface CollabOfferView {
  id: string;
  subject: string;
  message: string;
  status: CollabStatusName;
  /**
   * Taklif MENGA kelganmi.
   *
   * Shu bayroqqa qarab ekran boshqa tugmalarni chizadi: kelgan
   * taklifda "Qabul qilish" va "Rad etish", yuborilganda esa
   * "Qaytarib olish".
   */
  isIncoming: boolean;
  /**
   * Ikkinchi tomon.
   *
   * Kelgan taklifda — yuboruvchi, yuborilganda — qabul qiluvchi.
   * Ekranda har doim "u kim?" degan savolga javob kerak va bu
   * savolning javobi qutiga qarab o'zgaradi.
   */
  person: CollabPersonView;
  /** Qabul qilingandan keyin ochilgan suhbat. */
  conversationId: string | null;
  createdAt: string;
  respondedAt: string | null;
}

/** Katalogdagi bitta ijodkor. */
export interface CreatorCardView {
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  /** Hamkorlik shartlari — qisqa izoh. */
  collabNote: string | null;
  followerCount: number;
  /**
   * Videolari jami necha marta ko'rilgan.
   *
   * ── Nima uchun katalog SHU bo'yicha tartiblanadi ────────────────────
   * Obunachilar soni "qancha odam obuna bo'lgan" degani va u bir
   * marta yig'ilib, keyin o'zgarmasligi mumkin. Ko'rishlar esa
   * ijodkor HOZIR ishlayaptimi degan savolga javob beradi.
   *
   * Biznes uchun aynan ikkinchisi muhim: o'lik hisobga reklama
   * berishning ma'nosi yo'q.
   */
  videoViewCount: number;
}

export interface CollabOffersResponse {
  offers: CollabOfferView[];
  /** Javob kutayotgan takliflar soni — belgi (badge) uchun. */
  pendingCount: number;
}

export interface CreatorsResponse {
  creators: CreatorCardView[];
}
