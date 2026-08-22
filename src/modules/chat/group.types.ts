import type { GroupRoleName } from '@/config/group-chat';

/**
 * Guruh suhbatlari — brauzer va server uchun umumiy turlar.
 */

/** Guruh a'zosi — ro'yxatda ko'rsatiladigan ko'rinishi. */
export interface GroupMemberView {
  userId: string;
  name: string;
  /** `username`. Bo'lmasa bo'sh satr. */
  handle: string;
  avatarUrl: string | null;
  isVerified: boolean;
  role: GroupRoleName;
  /** Guruhga qo'shilgan payt — ISO. */
  joinedAt: string;
  /** Bu MENMI. */
  isMe: boolean;
  /**
   * Men shu a'zoni chiqara olamanmi.
   *
   * ── Nima uchun SERVER hisoblaydi ────────────────────────────────────
   * Brauzer ham hisoblay olardi, lekin unda qoida ikki joyda yozilgan
   * bo'lardi va ertaga bittasi eskirib qolardi. Server esa baribir
   * tekshiradi — natijani birga yuborish tekin.
   */
  canRemove: boolean;
  /** Men shu a'zoning administratorligini o'zgartira olamanmi. */
  canToggleAdmin: boolean;
}

/** Guruh haqidagi to'liq ma'lumot — «Guruh ma'lumoti» sahifasi uchun. */
export interface GroupInfoView {
  conversationId: string;
  title: string;
  imageUrl: string | null;
  /** Guruh yaratilgan payt — ISO. */
  createdAt: string;
  memberCount: number;
  /** Mening darajam. */
  myRole: GroupRoleName;
  /** Nom va rasmni o'zgartira olamanmi. */
  canEditInfo: boolean;
  /** Yangi a'zo qo'sha olamanmi. */
  canAddMembers: boolean;
  /** Yana nechta a'zo qo'shish mumkin. */
  freeSlots: number;
  members: GroupMemberView[];
}

export interface GroupInfoResponse {
  group: GroupInfoView;
}

export interface CreateGroupResponse {
  conversationId: string;
}

/** A'zo qo'shish natijasi. */
export interface AddMembersResponse {
  /** Haqiqatda qo'shilganlar soni. */
  added: number;
  /**
   * Qo'shilmaganlar soni va sababi.
   *
   * ── Nima uchun XATO emas ────────────────────────────────────────────
   * O'ntadan bittasi allaqachon guruhda bo'lsa, butun so'rovni rad
   * etish qolgan to'qqiztasini ham qo'shmaslik degani bo'lardi.
   * Foydalanuvchi esa nimani qayta tanlashini bilmasdi.
   */
  skipped: number;
  group: GroupInfoView;
}
