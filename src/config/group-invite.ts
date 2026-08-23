import { REFERRAL_ALPHABET } from '@/config/referral';

/**
 * Guruh havolasi — yagona sozlama.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Hozir guruhga qo'shishning yagona yo'li bor: administrator odamni
 * qidirib topib, qo'lda qo'shadi. Bu ikki holatda ishlamaydi:
 *
 *   1. Odam ilovada YO'Q. Uni topib bo'lmaydi — avval u ro'yxatdan
 *      o'tishi kerak, lekin nima uchun o'tishini bilmaydi.
 *   2. Odam KO'P. Yigirma kishini birma-bir qidirib qo'shish uzoq
 *      va zerikarli ish.
 *
 * Havola ikkalasini ham hal qiladi: uni Telegram'ga tashlaysiz,
 * odamlar o'zlari kiradi.
 *
 * ── Nima uchun taklif kodidan UZUNROQ ─────────────────────────────────
 * Taklif kodi (7 belgi) og'zaki aytilishi mumkin: "menga falon kodni
 * yuboring". Guruh havolasi esa faqat bosiladi — uni hech kim qo'lda
 * yozmaydi.
 *
 * Ya'ni qisqalik shart emas, xavfsizlik esa muhimroq: havolani bilgan
 * HAR KIM guruhga kira oladi. 10 belgi 26 harfli alifboda 141 trillion
 * kombinatsiya beradi — uni taxmin qilib topib bo'lmaydi.
 */

/** Alifbo taklif kodi bilan BIR XIL — sabab `config/referral.ts` da. */
export const GROUP_INVITE_ALPHABET = REFERRAL_ALPHABET;

/** Havola kodining uzunligi. */
export const GROUP_INVITE_CODE_LENGTH = 10;

/** Kod to'qnashsa shuncha marta qayta uriniladi. */
export const GROUP_INVITE_ATTEMPTS = 3;

/** Havola manzilining boshlanishi: `/g/ABCDEFGHJK`. */
export const GROUP_INVITE_PATH = '/g';

/** To'liq havolani yasaydi. */
export function groupInviteLink(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${GROUP_INVITE_PATH}/${code}`;
}

/** Qiymat haqiqiy havola kodiga o'xshaydimi. */
export function isGroupInviteCode(value: string): boolean {
  if (value.length !== GROUP_INVITE_CODE_LENGTH) return false;

  return [...value].every((character) => GROUP_INVITE_ALPHABET.includes(character));
}

/**
 * Kiritilgan matndan kodni ajratib oladi.
 *
 * Odam butun havolani nusxalab qo'yishi mumkin — undan faqat kod
 * kerak.
 */
export function cleanGroupInviteCode(input: string): string {
  const trimmed = input.trim().toUpperCase();
  const fromLink = trimmed.split('/').pop() ?? trimmed;

  return fromLink.split('?')[0].replace(/\s+/g, '');
}

/** Havola bilan birga yuboriladigan matn. */
export function groupInviteShareText(title: string, link: string): string {
  return `«${title}» guruhiga qo'shiling: ${link}`;
}

/**
 * Havola haqidagi ogohlantirish.
 *
 * ── Nima uchun bu matn KERAK ──────────────────────────────────────────
 * Havolaning eng katta xavfi ko'zga tashlanmaydi: guruhdan
 * CHIQARILGAN odam o'sha havola bilan qaytib kira oladi. Ya'ni
 * chiqarish amali havola tirik ekan, deyarli ma'nosiz.
 *
 * Telegram, WhatsApp va Slack ham xuddi shunday ishlaydi — bu odatiy
 * xatti-harakat, kamchilik emas. Lekin foydalanuvchi buni BILISHI
 * kerak, aks holda u chiqargan odam qaytib kelganda nima
 * bo'layotganini tushunmaydi.
 *
 * Yechimi ham shu yerda: havolani yangilash. Eski havola darhol
 * ishlamay qoladi.
 */
export const GROUP_INVITE_WARNING =
  "Havolani bilgan har kim guruhga kira oladi. Guruhdan chiqarilgan odam ham shu havola orqali qaytishi mumkin — kerak bo'lsa havolani yangilang.";
