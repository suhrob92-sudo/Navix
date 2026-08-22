import type { ChatWallpaperName } from '@/config/chat-wallpapers';
import type { GroupRoleName, SystemMessageKindName } from '@/config/group-chat';
import { REACTIONS } from '@/config/reactions';
import type { ServiceColor } from '@/config/modules';
import type { CallView } from '@/modules/call/call.types';

/**
 * Chat moduli — brauzer va server uchun umumiy turlar.
 */

export type ConversationKindName = 'DIRECT' | 'BUSINESS' | 'GROUP';

/**
 * Suhbatning "ikkinchi tomoni" — odam, biznes yoki GURUHNING O'ZI.
 *
 * ── Nima uchun guruh ham shu turda ────────────────────────────────────
 * Suhbatlar ro'yxati va suhbat sarlavhasi uchta narsani biladi: nom,
 * rasm va bosilganda qayerga o'tish. Guruh uchun ham xuddi shu uchtasi
 * kerak. Alohida tur kiritilsa, ro'yxatning har bir joyida "bu guruhmi
 * yoki odammi" degan shart takrorlanardi.
 */
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
  /**
   * Oxirgi xabar TURI.
   *
   * ── Nima uchun kerak ────────────────────────────────────────────────
   * Rasm va ovozli xabarda matn bo'sh bo'lishi mumkin. Tursiz ro'yxatda
   * bo'sh qator turardi va odam "nima keldi?" deb har bir suhbatni
   * ochib ko'rishga majbur bo'lardi.
   */
  lastMessageKind: MessageKind;
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
  /** Ovozli xabar manzili. O'chirilgan xabarda `null`. */
  voiceUrl: string | null;
  /** Ovozli xabar davomiyligi (soniya). */
  voiceSeconds: number | null;
  /**
   * Javob berilgan xabar — qisqacha ko'rinishi.
   *
   * ── Nima uchun TO'LIQ xabar emas ────────────────────────────────────
   * Iqtibosda faqat ikki narsa kerak: kim yozgan va nima yozgan.
   * To'liq xabar yuborilsa, javoblar zanjiri bo'lgan suhbatda bir
   * xil ma'lumot bir necha marta takrorlanardi.
   */
  replyTo: MessageQuote | null;
  /** Tahrirlangan bo'lsa — vaqti. Aks holda `null`. */
  editedAt: string | null;
  /**
   * Xabarga qo'yilgan reaksiyalar — emoji bo'yicha YIG'ILGAN holda.
   *
   * ── Nima uchun kim qo'ygani yuborilmaydi ────────────────────────────
   * Suhbatda ikki kishi bor: sanoq va "menikimi" belgisi ismni ham
   * ayon qiladi. Ismlar ro'yxatini yuborish esa har xabarni og'irroq
   * qilardi va hech qanday yangi ma'lumot bermasdi.
   */
  reactions: MessageReactionView[];
  /** Xabarni MEN yubordimmi. */
  isMine: boolean;
  createdAt: string;
  /** Holat faqat O'Z xabarlarimda ma'noga ega. */
  status: MessageStatus;
  isDeleted: boolean;
  /**
   * Hodisa turi — guruhdagi voqealar uchun ("Ali guruhga qo'shdi").
   *
   * Oddiy xabarda `null`. To'ldirilgan bo'lsa, xabar pufakcha emas,
   * markazdagi kulrang yozuv bo'lib ko'rsatiladi.
   */
  systemKind: SystemMessageKindName | null;
  /**
   * Yuboruvchining ismi — FAQAT guruhda to'ldiriladi.
   *
   * ── Nima uchun ikki kishilik suhbatda YO'Q ──────────────────────────
   * U yerda ikki tomon bor va pufakchaning qaysi tomonda turgani
   * kimligini allaqachon aytadi. Ismni takrorlash ekranni behuda
   * to'ldirardi va har bir xabarni og'irlashtirardi.
   */
  senderName: string | null;
  /** Yuboruvchining rasmi — FAQAT guruhda. */
  senderAvatarUrl: string | null;
  /**
   * Yuboruvchining ID'si — FAQAT guruhda.
   *
   * ── Nima uchun ism yetarli EMAS ─────────────────────────────────────
   * Ketma-ket kelgan xabarlarda ism va rasm bir marta ko'rsatiladi.
   * Ularni ISM bo'yicha solishtirish xato bo'lardi: bir xil ismli ikki
   * odam guruhda bo'lishi mumkin va ularning xabarlari bitta odamning
   * gapiday ko'rinardi.
   *
   * Ikki kishilik suhbatda `null` — u yerda guruhlash ham, ism ham
   * ko'rsatilmaydi.
   */
  senderId: string | null;
}

/** Bitta emoji va uni qo'yganlar soni. */
export interface MessageReactionView {
  emoji: string;
  count: number;
  /** Shu reaksiyani MEN qo'yganmanmi. */
  isMine: boolean;
}

/**
 * Javob berilgan xabarning qisqacha ko'rinishi.
 *
 * Asl xabar o'chirilgan bo'lsa, `isDeleted` bilan belgilanadi —
 * iqtibosda "o'chirilgan xabar" deb ko'rsatiladi.
 */
export interface MessageQuote {
  id: string;
  /** Kim yozgan: "Siz" yoki suhbatdoshning ismi. */
  authorName: string;
  /** Qisqartirilgan matn. Matnsiz xabarda turining nomi. */
  preview: string;
  isDeleted: boolean;
}

export interface ThreadView {
  id: string;
  peer: ChatPeer;
  /** Ikkinchi tomon hozir ilovadami. */
  isPeerOnline: boolean;
  /** Ikkinchi tomon hozir yozmoqdami. */
  isPeerTyping: boolean;
  /**
   * Guruhda hozir kim yozayotgani.
   *
   * Ikki kishilik suhbatda ism kerak emas (`isPeerTyping` yetarli),
   * guruhda esa "kimdir yozmoqda" foydasiz xabar bo'lardi.
   */
  typingNames: string[];
  /** Guruhdagi a'zolar soni. Boshqa suhbatlarda `null`. */
  memberCount: number | null;
  /** Mening guruhdagi darajam. Boshqa suhbatlarda `null`. */
  myRole: GroupRoleName | null;
  messages: MessageView[];
  /**
   * Suhbat oynasining foni — SHU foydalanuvchi tanlagani.
   *
   * ── Nima uchun suhbat javobida ──────────────────────────────────────
   * Fon profilda saqlanadi, lekin u faqat shu yerda kerak. Alohida
   * so'rov qilinsa, suhbat ochilganda fon bir lahza "sakrab"
   * o'zgarardi. Bu yerda esa u xabarlar bilan BIRGA keladi va
   * qo'shimcha so'rov ham, qo'shimcha baza murojaati ham talab
   * qilmaydi: qiymat allaqachon olinadigan a'zolik yozuvida turadi.
   */
  wallpaper: ChatWallpaperName;
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

export interface ReactionsResponse {
  reactions: MessageReactionView[];
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
  { value: 'GROUP', label: 'Guruhlar' },
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
   * Matnsiz xabar uchun MAXSUS matn.
   *
   * Rasm va ovozli xabarda matn bo'sh bo'lishi mumkin — o'shanda
   * turining nomi ko'rsatiladi.
   */
  const text = item.lastMessage.length > 0 ? item.lastMessage : messageKindText(item.lastMessageKind);

  return item.lastMessageIsMine ? `Siz: ${text}` : text;
}

/**
 * Xabar turi.
 *
 * Matn bo'sh bo'lganda ro'yxatda nima yozilishini shu belgilaydi.
 */
export type MessageKind = 'TEXT' | 'IMAGE' | 'VOICE';

/** Rasmli (matnsiz) xabar ro'yxatlarda va push'da shunday ko'rinadi. */
export const IMAGE_MESSAGE_TEXT = 'Rasm';

/** Ovozli xabar ro'yxatlarda va push'da shunday ko'rinadi. */
export const VOICE_MESSAGE_TEXT = 'Ovozli xabar';

/** Iqtibosdagi matn shuncha belgidan uzun bo'lmaydi. */
export const QUOTE_PREVIEW_LENGTH = 80;

/**
 * Iqtibos uchun qisqacha matn.
 *
 * ── Nima uchun QISQARTIRILADI ────────────────────────────────────────
 * Uzun xabarga javob berilganda iqtibos butun ekranni egallardi va
 * javobning o'zi ko'rinmay qolardi.
 */
export function quotePreview(body: string, kind: MessageKind, isDeleted: boolean): string {
  if (isDeleted) return DELETED_MESSAGE_TEXT;

  const text = body.trim() || messageKindText(kind);

  return text.length > QUOTE_PREVIEW_LENGTH ? `${text.slice(0, QUOTE_PREVIEW_LENGTH)}…` : text;
}

/** O'chirilgan xabar o'rnida ko'rinadigan matn. */
export const DELETED_MESSAGE_TEXT = "Xabar o'chirilgan";

/**
 * Reaksiya qatorlarini emoji bo'yicha yig'adi.
 *
 * ── Nima uchun TARTIB muhim ──────────────────────────────────────────
 * Jonli ulanish suhbatni JSON matnga aylantirib, oldingisi bilan
 * solishtiradi va faqat FARQ bo'lsa yuboradi. Tartib har safar
 * o'zgarsa, hech narsa o'zgarmagan bo'lsa ham matn boshqacha chiqib,
 * butun suhbat har 1.5 soniyada qayta uzatilardi.
 *
 * Shuning uchun tartib qat'iy: avval ko'p qo'yilgani, teng bo'lsa
 * ro'yxatdagi tartib bo'yicha.
 */
export function aggregateReactions(
  rows: readonly { emoji: string; userId: string }[],
  viewerId: string,
): MessageReactionView[] {
  const byEmoji = new Map<string, MessageReactionView>();

  for (const row of rows) {
    const existing = byEmoji.get(row.emoji);

    if (existing) {
      existing.count += 1;
      existing.isMine ||= row.userId === viewerId;
    } else {
      byEmoji.set(row.emoji, { emoji: row.emoji, count: 1, isMine: row.userId === viewerId });
    }
  }

  return [...byEmoji.values()].sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;

    return reactionOrder(a.emoji) - reactionOrder(b.emoji);
  });
}

/** Emojining ro'yxatdagi o'rni. Noma'lum emoji oxirida turadi. */
function reactionOrder(emoji: string): number {
  const index = REACTIONS.findIndex((item) => item.emoji === emoji);

  return index === -1 ? REACTIONS.length : index;
}

/**
 * Xabarga reaksiya qo'yish mumkinmi.
 *
 * O'chirilgan xabar bundan mustasno: unda hech narsa qolmagan va
 * reaksiya nimaga qo'yilgani tushunarsiz bo'lardi. Vaqtinchalik
 * (hali yuborilmagan) xabarning ID'si ham haqiqiy emas.
 */
export function canReactToMessage(message: MessageView): boolean {
  return !message.isDeleted && !message.id.startsWith(PENDING_ID_PREFIX);
}

/**
 * Hali serverga yetmagan xabar ID'sining boshlanishi.
 *
 * Bir joyda saqlanadi: uni tekshiradigan kod ham, yaratadigan kod ham
 * bir xil qiymatga tayanishi kerak.
 */
export const PENDING_ID_PREFIX = 'pending-';

/**
 * Xabarni tahrirlash mumkinmi.
 *
 * ── Nima uchun FAQAT matnli xabar ────────────────────────────────────
 * Rasm va ovozni tahrirlab bo'lmaydi — ularni qayta yuborish kerak.
 * Matnli xabarda esa xato tuzatish eng ko'p uchraydigan ehtiyoj.
 */
export function canEditMessage(message: MessageView): boolean {
  return message.isMine && !message.isDeleted && message.voiceUrl === null && message.imageUrl === null;
}

/** Matnsiz xabar o'rniga ko'rsatiladigan matn. */
export function messageKindText(kind: MessageKind): string {
  if (kind === 'VOICE') return VOICE_MESSAGE_TEXT;
  if (kind === 'IMAGE') return IMAGE_MESSAGE_TEXT;

  return '';
}

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
 * Guruh sarlavhasi ostidagi qator.
 *
 * ── Nima uchun "onlayn" YO'Q ──────────────────────────────────────────
 * Guruhda "kim onlayn" degan savolning bitta javobi yo'q. "3 ta onlayn"
 * ko'rsatish uchun har bir a'zoni tekshirish kerak bo'lardi — bu esa
 * har yangilanishda o'nlab so'rov degani.
 *
 * A'zolar soni esa har doim foydali va tekin.
 */
export function groupStatusText(memberCount: number, typingNames: string[]): string {
  if (typingNames.length > 0) return typingText(typingNames);

  return `${memberCount} a'zo`;
}

/**
 * Guruhda kim yozayotgani.
 *
 * Uchtadan ko'p bo'lsa ismlar sanalmaydi: qator sarlavha ostiga
 * sig'masdi va har soniyada uzunligi o'zgarib "sakrab" turardi.
 */
export function typingText(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} yozmoqda...`;
  if (names.length === 2) return `${names[0]} va ${names[1]} yozmoqda...`;

  return `${names.length} kishi yozmoqda...`;
}

/**
 * O'qilmagan xabarlar nishoni.
 *
 * 99 dan oshsa "99+" — uch xonali son nishonni cho'zib yuborardi.
 */
export function formatUnread(count: number): string {
  return count > 99 ? '99+' : String(count);
}
