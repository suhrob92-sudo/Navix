/**
 * Content-Security-Policy — brauzerga "bu sahifada nimaga ruxsat bor"
 * deb aytadigan sarlavha.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Agar biror joyda begona matn sahifaga qo'shilib qolsa (masalan
 * foydalanuvchi yozgan izoh ichidagi kod), brauzer uni ISHGA
 * TUSHIRISHI mumkin. Bu XSS deb ataladi va u orqali begona odam
 * boshqa foydalanuvchining tokenini o'g'irlay oladi.
 *
 * CSP shu ishni brauzer darajasida to'sadi: kodimizda xato qolsa ham,
 * brauzer begona kodni bajarmaydi.
 *
 * ── Nima uchun IKKI qism ──────────────────────────────────────────────
 * To'liq qattiq CSP'ni birdaniga yoqish — saytni oq ekranga
 * aylantirishning eng oson yo'li: bitta unutilgan manba butun
 * sahifani to'xtatadi.
 *
 * Shuning uchun:
 *   1. XAVFSIZ qism — hozir MAJBURIY qilinadi. U hech narsani
 *      buzmaydi (loyihada tashqi forma, iframe va tashqi skript
 *      umuman yo'q), lekin haqiqiy hujum turlarini yopadi.
 *   2. QATTIQ qism — faqat KUZATUV rejimida. Brauzer hech narsani
 *      to'smaydi, faqat "bu qoidaga to'g'ri kelmadi" deb xabar
 *      yuboradi. Xabarlar admin paneldagi xatolar jurnaliga tushadi.
 *
 * Bir necha hafta kuzatuvdan keyin, ro'yxat to'liq bo'lganda,
 * ikkinchi qism ham majburiyga o'tkaziladi.
 *
 * ── O'LCHANGAN natija (22-avgust) ─────────────────────────────────────
 * Kuzatuv rejimi olti sahifada sinaldi. Ikki xil belgi chiqdi:
 *
 *  1. `script-src-elem: inline` — Next.js sahifaga o'z ichki skriptini
 *     qo'shadi. Uni ruxsat etishning to'g'ri yo'li — `nonce`
 *     (har so'rovda yangi tasodifiy belgi).
 *
 *     ── Nima uchun `nonce` HOZIRCHA qo'shilmadi ───────────────────────
 *     Next.js'da `nonce` ishlatilishi bilan BARCHA sahifalar
 *     dinamikaga o'tadi: har so'rovda yangi belgi kerak, ya'ni
 *     sahifani oldindan tayyorlab qo'yib bo'lmaydi.
 *
 *     Loyihada 100 dan ortiq sahifa bor va ularning katta qismi
 *     hozir OLDINDAN tayyorlangan (statik) — ular darhol ochiladi va
 *     server vaqtini umuman sarflamaydi. Nonce ularning hammasini
 *     har bir tashrifda qaytadan yasashga majburlardi: sayt
 *     sekinlashadi va Vercel hisobi oshadi.
 *
 *     Bu — savdo: XSS himoyasi kuchayadi, tezlik va xarajat
 *     yomonlashadi. Foydalanuvchi soni o'sib, haqiqiy xavf paydo
 *     bo'lganda qayta ko'riladi.
 *
 *  2. `script-src: eval` — tekshiruv kutubxonasi (Zod) qoidalarni
 *     tezroq bajarish uchun kod yasashga URINADI, lekin bu urinish
 *     `try/catch` ichida: CSP to'ssa, u sekinroq yo'lga o'zi
 *     o'tadi va hech narsa buzilmaydi.
 *
 *     Ya'ni `'unsafe-eval'` KERAK EMAS — uni ruxsat etish esa
 *     CSP'ning ma'nosini yo'qotardi.
 */

/** CSP buzilishi haqidagi xabar keladigan manzil. */
export const CSP_REPORT_PATH = '/api/v1/csp-report';

/**
 * ALLAQACHON O'LCHANGAN buzilishlar — ular yozilmaydi.
 *
 * ── Muammo (sinovda topilgan) ─────────────────────────────────────────
 * Kuzatuv rejimi ikkita belgini HAR BIR sahifa ochilishida yuboradi:
 * Next.js ning ichki skripti va Zod'ning tezlashtirish urinishi.
 * Ikkalasi ham o'lchangan, sababi yozilgan va ular O'ZGARMAYDI.
 *
 * Ya'ni bitta odam o'nta sahifa ochsa, ellikta bir xil xabar keladi.
 * Natijada:
 *   · bazaga behuda yozuv ketardi;
 *   · chastota cheklovi ishga tushib, foydalanuvchining brauzer
 *     konsolida 429 xatolari chiqardi (aynan shu holat sinovda
 *     ko'rindi);
 *   · haqiqiy, YANGI buzilish shu shovqin ichida yo'qolardi.
 *
 * ── Nima uchun CSP'dan olib tashlanmadi ───────────────────────────────
 * Qoidani yumshatish (masalan `unsafe-inline` qo'shish) kuzatuvning
 * ma'nosini yo'qotardi: keyin haqiqiy XSS ham belgilanmasdi.
 *
 * Shuning uchun qoida QATTIQ qoladi, xabar esa serverda tashlab
 * yuboriladi — bepul va yozuvsiz.
 */
const KNOWN_VIOLATIONS: ReadonlyArray<{ directive: string; blocked: string }> = [
  // Next.js sahifaga o'z ichki skriptini qo'shadi.
  { directive: 'script-src-elem', blocked: 'inline' },
  { directive: 'script-src', blocked: 'inline' },
  // Zod qoidalarni tezroq bajarish uchun kod yasashga urinadi.
  { directive: 'script-src', blocked: 'eval' },
  { directive: 'script-src-elem', blocked: 'eval' },
];

/**
 * Bu buzilish allaqachon ma'lummi.
 *
 * Ma'lum bo'lsa — jurnalga yozilmaydi. Yangi bo'lsa — yoziladi va
 * aynan shuning uchun kuzatuv yoqilgan.
 */
export function isKnownViolation(directive: string, blocked: string): boolean {
  return KNOWN_VIOLATIONS.some((known) => known.directive === directive && known.blocked === blocked);
}

/**
 * Hozir MAJBURIY qilinadigan qoidalar.
 *
 * Har biri nimani to'sadi:
 *
 *  · `frame-ancestors 'none'` — saytimizni begona sahifa <iframe>
 *    ichiga solib, foydalanuvchini aldab tugma bostirish (clickjacking);
 *
 *  · `base-uri 'self'` — sahifaga qo'shilgan <base> yorlig'i orqali
 *    barcha nisbiy manzillarni begona serverga burib yuborish;
 *
 *  · `form-action 'self'` — formani begona serverga yuborish, ya'ni
 *    parolni to'g'ridan-to'g'ri o'g'irlash;
 *
 *  · `object-src 'none'` — eskirgan <object> va <embed> orqali kod
 *    ishga tushirish.
 *
 * Loyihada tashqi forma ham, iframe ham, Flash ham yo'q — shuning
 * uchun bu qoidalar hech qanday ishlayotgan narsani buzmaydi.
 */
export const ENFORCED_CSP = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

/**
 * KUZATUV rejimidagi to'liq qoidalar.
 *
 * ── Nima uchun `script-src` da 'unsafe-inline' YO'Q ───────────────────
 * Aynan shuni o'lchamoqchimiz. Next.js sahifaga o'z ichki skriptini
 * qo'shadi va u hozir bu qoidaga to'g'ri kelmasligi mumkin. Kuzatuv
 * rejimi buni SINDIRMASDAN ko'rsatadi: xabarlar kelsa, ularni
 * o'qib, keyin `nonce` qo'shamiz.
 *
 * ── Nima uchun `img-src` da `https:` ochiq ────────────────────────────
 * Rasmlar Vercel Blob domenidan keladi va u domen har loyihada
 * boshqacha. Uni qattiq yozib qo'yish yangi ombor ulanganda rasmlarni
 * o'chirib qo'yardi.
 *
 * ── Nima uchun `connect-src` da `wss:` bor ────────────────────────────
 * Qo'ng'iroqlar WebRTC orqali ishlaydi va u boshqa manzillarga
 * ulanadi.
 */
export const REPORT_ONLY_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // Tailwind va React ichki uslublari sahifaga to'g'ridan-to'g'ri yoziladi.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  // Xizmat ishchisi (service worker) shu manzildan boshqasini boshqarmaydi.
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  `report-uri ${CSP_REPORT_PATH}`,
].join('; ');
