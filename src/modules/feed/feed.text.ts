/**
 * Post matnini tahlil qilish — xeshteg, eslash va havolalar.
 *
 * ── Nima uchun ALOHIDA fayl ───────────────────────────────────────────
 * Bu yerda baza ham, brauzer ham yo'q — faqat matn kiradi, natija
 * chiqadi. Shuning uchun uni ham server, ham brauzer ishlatadi va
 * sinash uchun hech narsa tayyorlash kerak emas.
 *
 * Server va brauzer bir xil funksiyani chaqirgani MUHIM: matnda
 * ko'ringan `#poyabzal` bilan bazaga yozilgan `poyabzal` doim mos
 * kelishi kerak.
 */

/** Xeshtegning eng qisqa va eng uzun uzunligi (`#` sanalmaydi). */
const HASHTAG_MIN = 2;
const HASHTAG_MAX = 50;

/**
 * Bitta postdagi eng ko'p xeshteg.
 *
 * ── Nima uchun chegara ────────────────────────────────────────────────
 * Chegarasiz odam 100 ta xeshteg yozib, postini hamma mavzuga
 * tiqishtirardi. Bu — spam va u qidiruvni ishlatib bo'lmas holga
 * keltiradi.
 *
 * O'ntasi haqiqiy mavzu uchun yetadi.
 */
export const MAX_HASHTAGS_PER_POST = 10;

/**
 * Xeshteg namunasi.
 *
 * `\p{L}` — HAR QANDAY alifbodagi harf. Faqat `a-z` yozilsa,
 * `#poyabzal` ishlardi-yu, `#kiyim` dagi lotin harflari bilan bir
 * qatorda kirill yozuvidagi mavzular umuman topilmasdi.
 *
 * Boshida raqam bo'lishi mumkin emas: `#2024` mavzu emas, sana.
 */
const HASHTAG_PATTERN = /#([\p{L}][\p{L}\p{N}_]*)/gu;

/**
 * Eslash namunasi — `@foydalanuvchi`.
 *
 * Foydalanuvchi nomi qoidasi bilan bir xil bo'lishi SHART: aks holda
 * matnda ko'k rangda ko'ringan nom bosilganda "topilmadi" sahifasiga
 * olib borardi.
 */
const MENTION_PATTERN = /@([a-zA-Z0-9_]{3,30})/g;

/** Havola namunasi — faqat `http://` va `https://`. */
const LINK_PATTERN = /https?:\/\/[^\s<]+/g;

/**
 * Matndagi xeshteglar — kichik harflarda, takrorsiz.
 *
 * Tartib saqlanadi: odam yozgan tartib "asosiy mavzu birinchi"
 * degan ma'noni beradi.
 */
export function extractHashtags(body: string): string[] {
  const found: string[] = [];

  for (const match of body.matchAll(HASHTAG_PATTERN)) {
    const tag = match[1].toLowerCase();

    if (tag.length < HASHTAG_MIN || tag.length > HASHTAG_MAX) continue;
    if (found.includes(tag)) continue;

    found.push(tag);

    if (found.length >= MAX_HASHTAGS_PER_POST) break;
  }

  return found;
}

/**
 * Matnda eslangan foydalanuvchi nomlari — kichik harflarda, takrorsiz.
 *
 * Bu yerda nom HAQIQATAN bormi — tekshirilmaydi. Tekshirish bazani
 * talab qiladi va u serverning ishi.
 */
export function extractMentions(body: string): string[] {
  const found: string[] = [];

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const username = match[1].toLowerCase();

    if (!found.includes(username)) found.push(username);
  }

  return found;
}

/** Matn bo'lagining turi. */
export type RichTokenKind = 'TEXT' | 'HASHTAG' | 'MENTION' | 'LINK';

export interface RichToken {
  kind: RichTokenKind;
  /** Ekranda ko'rinadigan matn — `#` va `@` bilan birga. */
  text: string;
  /**
   * Bosilganda ochiladigan manzil. `TEXT` uchun `null`.
   */
  href: string | null;
}

/**
 * Matnni bo'laklarga ajratadi: oddiy matn, xeshteg, eslash, havola.
 *
 * ── Nima uchun `dangerouslySetInnerHTML` ISHLATILMAYDI ────────────────
 * Matnni HTML ga aylantirib qo'yish eng oson yo'l edi. Lekin unda
 * odam yozgan `<script>` ham HTML bo'lib ishga tushardi — ya'ni
 * har bir post boshqalarning brauzerida kod bajarishi mumkin edi.
 *
 * Bo'laklar ro'yxati esa xavfsiz: React har bo'lakni MATN sifatida
 * chizadi va hech qanday teg hosil bo'lmaydi.
 */
export function parseRichText(body: string): RichToken[] {
  interface Found {
    start: number;
    end: number;
    token: RichToken;
  }

  const found: Found[] = [];

  for (const match of body.matchAll(LINK_PATTERN)) {
    found.push({
      start: match.index,
      end: match.index + match[0].length,
      token: { kind: 'LINK', text: match[0], href: match[0] },
    });
  }

  for (const match of body.matchAll(HASHTAG_PATTERN)) {
    const tag = match[1].toLowerCase();

    if (tag.length < HASHTAG_MIN || tag.length > HASHTAG_MAX) continue;

    found.push({
      start: match.index,
      end: match.index + match[0].length,
      token: { kind: 'HASHTAG', text: match[0], href: `/feed/tag/${tag}` },
    });
  }

  for (const match of body.matchAll(MENTION_PATTERN)) {
    found.push({
      start: match.index,
      end: match.index + match[0].length,
      token: { kind: 'MENTION', text: match[0], href: `/u/${match[1].toLowerCase()}` },
    });
  }

  found.sort((left, right) => left.start - right.start);

  const tokens: RichToken[] = [];
  let cursor = 0;

  for (const item of found) {
    /**
     * Ustma-ust tushgan bo'lak TASHLAB YUBORILADI.
     *
     * Havola ichida `#` bo'lishi mumkin (`site.uz/#bolim`). Ikkalasi
     * ham belgilansa, matn ikki marta chizilib, post buzilardi.
     */
    if (item.start < cursor) continue;

    if (item.start > cursor) {
      tokens.push({ kind: 'TEXT', text: body.slice(cursor, item.start), href: null });
    }

    tokens.push(item.token);
    cursor = item.end;
  }

  if (cursor < body.length) {
    tokens.push({ kind: 'TEXT', text: body.slice(cursor), href: null });
  }

  return tokens;
}

/**
 * Xeshteg manzilga yaroqlimi.
 *
 * Manzildan kelgan qiymat ishonchsiz: `/feed/tag/<...>` ga har narsa
 * yozilishi mumkin. Bazaga so'rov yuborishdan OLDIN tekshiriladi.
 */
export function isValidHashtag(tag: string): boolean {
  if (tag.length < HASHTAG_MIN || tag.length > HASHTAG_MAX) return false;

  return /^[\p{L}][\p{L}\p{N}_]*$/u.test(tag);
}
