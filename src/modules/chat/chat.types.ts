import type { ServiceColor } from '@/config/modules';
import type { CallView } from '@/modules/call/call.types';

/**
 * Chat moduli — brauzer va server uchun umumiy turlar.
 */

export type ConversationKindName = 'DIRECT' | 'BUSINESS';

/** Suhbatdagi ikkinchi tomon — odam yoki biznes. */
export interface ChatPeer {
  kind: ConversationKindName;
  /** Odamda `username`, bizneda `slug`. */
  handle: string;
  name: string;
  avatarUrl: string | null;
  /** Biznes rangi — avatar o'rniga ishlatiladi. */
  color: ServiceColor | null;
  isVerified: boolean;
  /** Profil sahifasi manzili. */
  profileUrl: string;
}

export interface ConversationListItem {
  id: string;
  peer: ChatPeer;
  /** Oxirgi xabar matni. Hali xabar bo'lmasa `null`. */
  lastMessage: string | null;
  /** Oxirgi xabarni MEN yuborganmanmi. */
  lastMessageIsMine: boolean;
  /** Oxirgi xabar vaqti — ISO. Xabar bo'lmasa suhbat yaratilgan vaqt. */
  lastMessageAt: string;
  unreadCount: number;
}

/**
 * Xabar holati.
 *
 * ── Nima uchun uch bosqich ────────────────────────────────────────────
 * "Yuborildi" — server xabarni saqladi;
 * "Yetkazildi" — qabul qiluvchining qurilmasi uni oldi;
 * "O'qildi"    — u suhbatni ochdi.
 *
 * Ikkinchisisiz "yubordim, lekin javob yo'q" holatida odam sababini
 * bilmasdi: xabar yetmadimi yoki javob berilmadimi?
 */
export type MessageStatus = 'SENT' | 'DELIVERED' | 'SEEN';

export interface MessageView {
  id: string;
  body: string;
  /** Biriktirilgan rasm. O'chirilgan xabarda `null`. */
  imageUrl: string | null;
  /** Xabarni MEN yubordimmi. */
  isMine: boolean;
  createdAt: string;
  /** Holat faqat O'Z xabarlarimda ma'noga ega. */
  status: MessageStatus;
  isDeleted: boolean;
}

export interface ThreadView {
  id: string;
  peer: ChatPeer;
  /** Ikkinchi tomon hozir ilovadami. */
  isPeerOnline: boolean;
  /** Ikkinchi tomon hozir yozmoqdami. */
  isPeerTyping: boolean;
  messages: MessageView[];
  /**
   * Shu suhbatdagi TUGAGAN qo'ng'iroqlar.
   *
   * ── Nima uchun suhbat ichida ────────────────────────────────────────
   * Javobsiz qo'ng'iroq alohida ro'yxatda tursa, odam uni umuman
   * ko'rmasdi. Suhbat oynasida esa u xabar kabi o'z vaqtida turadi va
   * "kim, qachon qo'ng'iroq qilgan" degan savol o'z-o'zidan javob
   * topadi.
   */
  calls: CallView[];
}

export interface ThreadResponse {
  thread: ThreadView;
}

export interface SendMessageResponse {
  message: MessageView;
}

export interface ConversationsResponse {
  conversations: ConversationListItem[];
  total: number;
  /** Barcha suhbatlardagi umumiy o'qilmagan xabarlar soni. */
  totalUnread: number;
}

export interface OpenConversationResponse {
  conversationId: string;
  /** Suhbat SHU so'rovda yaratildimi. */
  isNew: boolean;
}

// ── Ro'yxat filtrlari ─────────────────────────────────────────────────

export const CHAT_FILTERS = [
  { value: 'ALL', label: 'Barchasi' },
  { value: 'UNREAD', label: "O'qilmagan" },
  { value: 'BUSINESS', label: 'Kompaniyalar' },
  { value: 'DIRECT', label: 'Foydalanuvchilar' },
] as const;

export type ChatFilter = (typeof CHAT_FILTERS)[number]['value'];

// ── Ko'rinadigan matnlar ──────────────────────────────────────────────

/**
 * Ro'yxatdagi oxirgi xabar satri.
 *
 * O'zim yuborgan xabar oldiga "Siz: " qo'yiladi — aks holda ro'yxatda
 * kim yozgani noaniq bo'lib qoladi.
 */
export function formatLastMessage(item: ConversationListItem): string {
  if (item.lastMessage === null) return "Hali xabar yo'q";

  /**
   * Matnsiz rasm uchun MAXSUS matn.
   *
   * Aks holda ro'yxatda bo'sh qator turardi va odam "nima keldi?"
   * deb suhbatni ochishga majbur bo'lardi.
   */
  const text = item.lastMessage.length > 0 ? item.lastMessage : IMAGE_MESSAGE_TEXT;

  return item.lastMessageIsMine ? `Siz: ${text}` : text;
}

/** Rasmli (matnsiz) xabar ro'yxatlarda va push'da shunday ko'rinadi. */
export const IMAGE_MESSAGE_TEXT = 'Rasm';

/** Xabar holati uchun belgi: ✓ yoki ✓✓. */
export function statusMark(status: MessageStatus): string {
  return status === 'SENT' ? '✓' : '✓✓';
}

/**
 * Ikkinchi tomon holatini bir satrda yozadi.
 *
 * "Yozmoqda" ONLAYN dan ustun: u yangiroq va aniqroq ma'lumot.
 */
export function peerStatusText(isOnline: boolean, isTyping: boolean): string {
  if (isTyping) return 'yozmoqda...';

  return isOnline ? 'Onlayn' : 'Oflayn';
}

/**
 * O'qilmagan xabarlar nishoni.
 *
 * 99 dan oshsa "99+" — uch xonali son nishonni cho'zib yuborardi.
 */
export function formatUnread(count: number): string {
  return count > 99 ? '99+' : String(count);
}
