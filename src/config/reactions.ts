/**
 * Xabarga qo'yiladigan reaksiyalar.
 *
 * ── Nima uchun reaksiya kerak ─────────────────────────────────────────
 * Suhbatda ko'p xabar javob talab qilmaydi: "yetib keldim", "rahmat",
 * "ha, ko'rdim". Ularga har safar matn yozish suhbatni bir xil
 * takroriy javoblar bilan to'ldiradi va telefonda ortiqcha mehnat.
 *
 * Reaksiya shu ehtiyojni bir bosishda yopadi. WhatsApp va Telegram'da
 * u eng ko'p ishlatiladigan imkoniyatlardan biri.
 *
 * ── Nima uchun ro'yxat QISQA ──────────────────────────────────────────
 * Telegram yuzlab emoji beradi, WhatsApp esa oltitasini. Bizga
 * ikkinchisi to'g'ri keladi: tanlov varag'i bir qatorga sig'adi va
 * telefonda barmoq bilan bosish oson bo'ladi. Yuzta emoji orasidan
 * tanlash esa "javob yozishdan tez" degan asosiy foydani yo'qotardi.
 *
 * ── Nima uchun kod EMOJI ning o'zi ────────────────────────────────────
 * `LIKE`, `HEART` kabi nomlar ham mumkin edi, lekin unda har bir nom
 * uchun kodda alohida moslik jadvali kerak bo'lardi. Emoji o'zi ham
 * kod, ham ko'rinish — yangi reaksiya qo'shish faqat shu ro'yxatga bir
 * qator qo'shish demakdir.
 */

export interface Reaction {
  emoji: string;
  /** Ekran o'quvchilar uchun nom — emoji o'zi o'qilmaydi. */
  label: string;
}

export const REACTIONS: readonly Reaction[] = [
  { emoji: '👍', label: 'Zo’r' },
  { emoji: '❤️', label: 'Yoqdi' },
  { emoji: '😂', label: 'Kulgili' },
  { emoji: '😮', label: 'Hayratlandim' },
  { emoji: '😢', label: 'Achinarli' },
  { emoji: '🙏', label: 'Rahmat' },
] as const;

/**
 * Bazadagi ustun uzunligi.
 *
 * Emoji bir nechta belgidan iborat bo'lishi mumkin (masalan ❤️ —
 * ikkita), shuning uchun zaxira bilan olingan.
 */
export const REACTION_MAX_LENGTH = 16;

/** Emoji ruxsat etilgan ro'yxatdami. */
export function isAllowedReaction(emoji: string): boolean {
  return REACTIONS.some((item) => item.emoji === emoji);
}

/** Emoji uchun o'qiladigan nom. Noma'lum emoji uchun emojining o'zi. */
export function reactionLabel(emoji: string): string {
  return REACTIONS.find((item) => item.emoji === emoji)?.label ?? emoji;
}
