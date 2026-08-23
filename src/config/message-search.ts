/**
 * Xabarlarni qidirish — yagona sozlama.
 *
 * ── Nima uchun to'liq matnli qidiruv (FTS) ISHLATILMADI ───────────────
 * Postgres'da kuchli qidiruv mexanizmi bor, lekin u TIL bilishga
 * tayanadi: so'zning o'zagini topadi ("kitoblar" → "kitob"), keraksiz
 * so'zlarni tashlaydi ("va", "yoki").
 *
 * O'zbek tili esa Postgres'da YO'Q. Ya'ni o'zbekcha matnda u
 * hech qanday foyda bermaydi — faqat so'zlarni bo'lakchalarga
 * ajratadi, xolos.
 *
 * Undan tashqari uchta amaliy sabab bor:
 *
 *  1. Odam SO'Z BO'LAGINI yozadi: "salo" deb qidirib "salom" ni
 *     topmoqchi bo'ladi. FTS bunday qidiruvni qo'llab-quvvatlamaydi.
 *  2. Suhbatlarda lotin va kirill aralash yoziladi, ba'zan ruscha
 *     so'zlar ham. Bitta til qoidasi ularning hech biriga to'g'ri
 *     kelmaydi.
 *  3. Xabarlar qisqa. FTS ning kuchi uzun hujjatlarda ko'rinadi,
 *     bir qatorlik xabarlarda esa oddiy qidiruv bilan bir xil
 *     natija beradi.
 *
 * Shuning uchun oddiy "ichida bormi" qidiruvi ishlatiladi va u
 * `pg_trgm` indeksi bilan tezlashtiriladi.
 */

/**
 * Suhbat oynasiga yuklanadigan xabarlar soni.
 *
 * ── Nima uchun bu son QIDIRUV sozlamasida ─────────────────────────────
 * U ikki joyda kerak: server suhbatni shuncha xabar bilan yuboradi,
 * brauzer esa qidiruv natijasi bosilganda "bu xabar oynada bormi?"
 * degan savolga javob berishi kerak.
 *
 * Ikki joyda alohida yozilsa, biri o'zgarganda ikkinchisi yolg'on
 * gapira boshlardi: "oxirgi 100 ta" deb yozib turgan holda aslida
 * 50 tasi yuklanardi.
 */
export const MAX_THREAD_MESSAGES = 100;

/**
 * Qidiruv so'zining eng qisqa uzunligi.
 *
 * ── Nima uchun ikki belgi ─────────────────────────────────────────────
 * Bitta harf bo'yicha qidiruv deyarli HAR BIR xabarni topadi — bu
 * natija emas, shovqin. Undan tashqari u eng og'ir so'rov bo'lardi:
 * indeks yordam bermaydi va butun jadval o'qiladi.
 */
export const SEARCH_MIN_LENGTH = 2;

/** Qidiruv so'zining eng uzun uzunligi. */
export const SEARCH_MAX_LENGTH = 100;

/** Bir sahifada nechta natija. */
export const SEARCH_PAGE_SIZE = 20;

/**
 * Natijada ko'rsatiladigan matn uzunligi.
 *
 * ── Nima uchun butun xabar EMAS ───────────────────────────────────────
 * Xabar 4000 belgigacha bo'lishi mumkin. Natijalar ro'yxatida uzun
 * xabar butun ekranni egallab, qolgan natijalarni ko'rsatmasdi.
 *
 * Shuning uchun topilgan so'z ATROFIDAN parcha olinadi — odam nima
 * topilganini ko'radi va kerak bo'lsa xabarni ochadi.
 */
export const SNIPPET_LENGTH = 120;

/** Topilgan so'zdan oldin nechta belgi ko'rsatiladi. */
const SNIPPET_BEFORE = 40;

/**
 * Qidiruv so'zini tozalaydi.
 *
 * Ortiqcha bo'shliqlar olib tashlanadi va uzunlik cheklanadi: qolgani
 * matnning o'zi bo'lib qoladi, chunki qidiruv aynan shu matnni
 * qidiradi.
 */
export function cleanSearchQuery(input: string): string {
  return input.trim().replace(/\s+/g, ' ').slice(0, SEARCH_MAX_LENGTH);
}

/** Qidiruv so'zi yetarlicha uzunmi. */
export function isSearchableQuery(value: string): boolean {
  return cleanSearchQuery(value).length >= SEARCH_MIN_LENGTH;
}

/**
 * Topilgan so'z ATROFIDAN parcha oladi.
 *
 * ── Nima uchun boshidan emas ──────────────────────────────────────────
 * Xabarning boshidan 120 belgi olinsa, topilgan so'z ko'pincha
 * parchaga umuman tushmasdi: uzun xabarda u o'rtada yoki oxirida
 * bo'ladi.
 *
 * Odam esa "nega bu xabar topildi?" degan savolga javob ko'rishi
 * kerak.
 *
 * @returns Parcha va topilgan so'zning PARCHA ICHIDAGI o'rni.
 *   O'rin `-1` bo'lsa — so'z topilmadi (masalan xabar o'chirilgan).
 */
export function buildSnippet(body: string, query: string): { text: string; matchIndex: number } {
  const needle = cleanSearchQuery(query).toLowerCase();
  const position = body.toLowerCase().indexOf(needle);

  if (position === -1) {
    return { text: body.slice(0, SNIPPET_LENGTH), matchIndex: -1 };
  }

  /**
   * Boshlanish nuqtasi so'zdan biroz ORQADA.
   *
   * Aks holda parcha topilgan so'zdan boshlanardi va gapning
   * boshi ko'rinmasdi — natija tushunarsiz bo'lardi.
   */
  const start = Math.max(0, position - SNIPPET_BEFORE);
  const end = Math.min(body.length, start + SNIPPET_LENGTH);

  let text = body.slice(start, end);

  // Kesilgan joylar ko'rsatiladi, aks holda matn to'liqdek tuyulardi.
  if (start > 0) text = `...${text}`;
  if (end < body.length) text = `${text}...`;

  return {
    text,
    /**
     * O'rin PARCHA ichida hisoblanadi.
     *
     * Brauzer topilgan so'zni ajratib ko'rsatishi kerak, lekin u
     * xabarning to'liq matnini ko'rmaydi — faqat parchani.
     */
    matchIndex: position - start + (start > 0 ? 3 : 0),
  };
}

/**
 * Matnni uch bo'lakka ajratadi: oldi, topilgani, keyingisi.
 *
 * ── Nima uchun HTML emas ──────────────────────────────────────────────
 * Topilgan so'zni `<mark>` bilan o'rab, HTML sifatida chizish oson
 * edi. Lekin unda xabar matni HTML bo'lib talqin qilinardi va
 * foydalanuvchi yozgan kod ishga tushib ketishi mumkin edi (XSS).
 *
 * Bo'laklar esa oddiy matn bo'lib qoladi va React ularni xavfsiz
 * chizadi.
 */
export function splitHighlight(text: string, query: string): [string, string, string] {
  const needle = cleanSearchQuery(query);

  if (needle.length === 0) return [text, '', ''];

  const position = text.toLowerCase().indexOf(needle.toLowerCase());

  if (position === -1) return [text, '', ''];

  return [
    text.slice(0, position),
    // Asl matndagi harflar saqlanadi: "SALOM" qidirilsa ham "Salom" chiqadi.
    text.slice(position, position + needle.length),
    text.slice(position + needle.length),
  ];
}

/** Natijalar sonini o'zbekcha yozadi. */
export function searchResultText(count: number): string {
  if (count === 0) return 'Hech narsa topilmadi';

  return `${count} ta xabar topildi`;
}
