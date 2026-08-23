/**
 * Xabarlar qidiruvi — brauzer va server uchun umumiy turlar.
 */

/** Bitta topilgan xabar. */
export interface MessageSearchHit {
  messageId: string;
  conversationId: string;
  /** Suhbat nomi: odam, guruh yoki kompaniya. */
  conversationTitle: string;
  conversationImageUrl: string | null;
  senderName: string;
  senderAvatarUrl: string | null;
  /** Xabarni MEN yozdimmi. */
  isMine: boolean;
  /**
   * Topilgan so'z ATROFIDAN olingan parcha.
   *
   * To'liq xabar emas: u 4000 belgigacha bo'lishi mumkin va
   * ro'yxatni ishlatib bo'lmas holga keltirardi.
   */
  snippet: string;
  createdAt: string;
}

export interface MessageSearchResult {
  hits: MessageSearchHit[];
  total: number;
  /** Tozalangan qidiruv so'zi — ajratib ko'rsatish uchun. */
  query: string;
}

export interface MessageSearchResponse extends MessageSearchResult {
  meta?: unknown;
}
