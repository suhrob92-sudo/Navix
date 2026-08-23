/**
 * Guruh havolasi — brauzer va server uchun umumiy turlar.
 */

/** Guruhning hozirgi havolasi. */
export interface GroupInviteView {
  /** Havola kodi. Havola yo'q bo'lsa `null`. */
  code: string | null;
  /** To'liq havola — ulashish uchun tayyor. */
  link: string | null;
  /** Havola qachon yasalgani — ISO. */
  createdAt: string | null;
  /** Guruh nomi — ulashish matnini yasash uchun. */
  shareTitle?: string;
}

/**
 * Havola bo'yicha KIRISHSIZ ko'rinadigan ma'lumot.
 *
 * Ataylab kam: guruh nomi, rasmi va a'zolar soni. A'zolarning
 * ismlari, xabarlar va guruh ID'si berilmaydi — havola tasodifan
 * begona odamga tushsa ham, u guruh ichini ko'rmaydi.
 */
export interface GroupInvitePreview {
  title: string;
  imageUrl: string | null;
  memberCount: number;
  /** Guruh to'lganmi — tugmani oldindan o'chirish uchun. */
  isFull: boolean;
}

export interface GroupInviteResponse {
  invite: GroupInviteView;
}

export interface GroupInvitePreviewResponse {
  invite: GroupInvitePreview;
}

/** Havola orqali qo'shilish natijasi. */
export interface JoinByInviteResult {
  conversationId: string;
  /** Odam AYNI SHU so'rovda qo'shildimi (allaqachon a'zo bo'lmaganmi). */
  isNew: boolean;
}
