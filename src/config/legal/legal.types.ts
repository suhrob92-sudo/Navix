import type { LucideIcon } from 'lucide-react';

/**
 * Huquqiy hujjatlarning tuzilishi.
 *
 * ── Nima uchun matn EMAS, MA'LUMOT ────────────────────────────────────
 * Hujjatlarni tayyor HTML sifatida saqlash mumkin edi. Lekin unda
 * uchta muammo bo'lardi:
 *
 *  1. HTML ni ekranga chiqarish uchun `dangerouslySetInnerHTML` kerak —
 *     bu esa hujjat matniga tegib qo'ygan har qanday odamga sahifaga
 *     skript qo'shish yo'lini ochadi;
 *  2. mundarija (bo'limlar ro'yxati) qo'lda yozilardi va matn
 *     o'zgarganda undan ajralib qolardi;
 *  3. uchta hujjat uch xil ko'rinishga ega bo'lib ketardi.
 *
 * Shuning uchun hujjat — bo'limlar ro'yxati, bo'lim esa bloklar
 * ro'yxati. Ko'rinishni bitta komponent hal qiladi, mundarija esa
 * bo'lim sarlavhalaridan O'ZI yasaladi.
 */

/** Bo'lim ichidagi bitta blok. */
export type LegalBlock =
  | { kind: 'text'; value: string }
  | { kind: 'list'; items: readonly string[] }
  /** Ajratib ko'rsatiladigan muhim eslatma. */
  | { kind: 'note'; value: string }
  | { kind: 'table'; head: readonly string[]; rows: readonly (readonly string[])[] };

export interface LegalSection {
  /**
   * Mundarija havolasi uchun langar (`#tolov`).
   *
   * Qo'lda yoziladi, sarlavhadan yasalmaydi: sarlavha tahrirlansa
   * havola o'zgarib ketardi va odamlar yuborgan eski havolalar
   * ishlamay qolardi.
   */
  id: string;
  title: string;
  blocks: readonly LegalBlock[];
}

export interface LegalDocument {
  /** Manzildagi nom: `/legal/maxfiylik`. */
  slug: string;
  title: string;
  /** Ro'yxatdagi va qidiruvdagi qisqa izoh. */
  summary: string;
  icon: LucideIcon;
  /** Oxirgi tahrir sanasi — `YYYY-MM-DD`. */
  updatedAt: string;
  /**
   * Hujjat rasmiy rekvizitlarga bog'liqmi.
   *
   * Ommaviy oferta — shartnoma, unda tashkilotning rasmiy
   * ma'lumotlari bo'lishi SHART. Ular hali kiritilmagan bo'lsa,
   * sahifada halol ogohlantirish chiqadi va hujjat qidiruv
   * tizimlariga berilmaydi.
   */
  requiresRequisites?: boolean;
  sections: readonly LegalSection[];
}
