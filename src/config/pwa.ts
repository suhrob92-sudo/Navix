/**
 * Navix'ni TELEFONGA ILOVA qilib o'rnatish — yagona sozlama.
 *
 * ── Muammo ────────────────────────────────────────────────────────────
 * Navix telefonda brauzer ichida ochiladi. Bu uch narsani anglatadi:
 *
 *   1. Ekranning yuqorisida manzil qatori turadi — foydali joyning
 *      ~10% i yo'qoladi.
 *   2. Ilovani ochish uchun brauzerni ochib, xatcho'plardan topish
 *      kerak. Odam buni kuniga bir marta qiladi, ilova belgisini esa
 *      o'nlab marta bosadi.
 *   3. Internet uzilganda brauzerning "Sahifani ochib bo'lmadi"
 *      degan oq ekrani chiqadi — ilova buzilgandek ko'rinadi.
 *
 * ── Yechim ────────────────────────────────────────────────────────────
 * PWA (Progressive Web App): brauzer Navix'ni ilova sifatida
 * o'rnatadi. Belgi ekranga chiqadi, manzil qatori yo'qoladi, ochilish
 * tezlashadi.
 *
 * Belgilar (`icon-192`, `icon-512`, `icon-maskable-512`) allaqachon
 * tayyor edi — faqat ma'lumotnoma (manifest) yetishmasdi.
 */

import { siteConfig } from '@/config/site';

/**
 * Ekrandagi qisqa nom.
 *
 * ── Nima uchun to'liq nomdan alohida ──────────────────────────────────
 * Belgi ostida 12 belgidan ko'pi sig'maydi va qolgani "..." bilan
 * kesiladi. "Navix" bemalol sig'adi.
 */
export const PWA_SHORT_NAME = siteConfig.name;

export const PWA_NAME = `${siteConfig.name} — ${siteConfig.tagline}`;

/**
 * Ochilish sahifasi.
 *
 * ── Nima uchun `/` emas ───────────────────────────────────────────────
 * `/` — tanishtiruv sahifasi (landing). U yangi mehmon uchun.
 * Ilovani O'RNATGAN odam esa allaqachon "mehmon" emas: u har
 * safar tanishtiruvni o'qishni xohlamaydi.
 *
 * `/dashboard` kirgan odamni o'z sahifasiga, kirmaganini esa
 * kirish sahifasiga olib boradi — ikkalasi uchun ham to'g'ri.
 */
export const PWA_START_URL = '/dashboard';

/**
 * Interfeys rangi (brauzer sarlavhasi va tizim panellari).
 *
 * `layout.tsx` dagi `themeColor` bilan BIR XIL bo'lishi kerak —
 * aks holda ilova ochilganda rang sakrab o'zgaradi.
 */
export const PWA_THEME_COLOR = '#0d0e14';

/**
 * Ochilish paytidagi fon.
 *
 * Ilova yuklanguncha brauzer shu rangda bo'sh ekran ko'rsatadi.
 * Qorong'i mavzu foniga teng: yorug' oq ekran ko'zni qamashtirardi.
 */
export const PWA_BACKGROUND_COLOR = '#0d0e14';

/**
 * Belgini uzoq bosganda chiqadigan tezkor yo'llar.
 *
 * ── Nima uchun ATIGI uchtasi ──────────────────────────────────────────
 * Android ko'pincha faqat to'rttasini ko'rsatadi, iOS esa umuman
 * ko'rsatmaydi. Uzun ro'yxat yozish behuda: u hech qayerda
 * to'liq ko'rinmaydi.
 *
 * Uchtasi eng ko'p ochiladigan joylar: lenta, qidiruv va hamyon.
 */
export const PWA_SHORTCUTS = [
  { name: 'Feed', url: '/feed', description: "Yangi postlar va videolar" },
  { name: 'Qidiruv', url: '/search', description: 'Xizmat yoki mahsulot qidirish' },
  { name: 'Hamyon', url: '/wallet', description: "Balans va o'tkazmalar" },
] as const;

// ─────────────────────────────────────────────────────────────────────
// Kesh
// ─────────────────────────────────────────────────────────────────────

/**
 * Kesh nomi VERSIYA bilan.
 *
 * ── Nima uchun versiya kerak ──────────────────────────────────────────
 * Kesh qoidasi o'zgarganda eski kesh qolib ketishi mumkin. Nomga
 * versiya qo'shilsa, yangi xizmat ishchisi eski nomdagi hamma
 * keshni o'chirib tashlaydi — ya'ni tozalash O'Z-O'ZIDAN bo'ladi.
 */
export const CACHE_VERSION = 'v1';

export const SHELL_CACHE = `navix-shell-${CACHE_VERSION}`;
export const ASSET_CACHE = `navix-assets-${CACHE_VERSION}`;

/**
 * Internet yo'qligida ko'rsatiladigan sahifa.
 *
 * U o'rnatish paytida keshga yoziladi — ya'ni internet umuman
 * bo'lmaganda ham ochiladi.
 */
export const OFFLINE_PATH = '/offline';

/**
 * NIMA KESHLANADI va nima uchun.
 *
 * ── Eng muhim qoida: MA'LUMOT KESHLANMAYDI ────────────────────────────
 * Bu qaror ilovaning boshidan beri amal qiladi va u ATAYLAB
 * qilingan (eski `sw.js` izohida ham yozilgan edi):
 *
 *     Noto'g'ri kesh eng yomon xatolarni keltirib chiqaradi —
 *     odam eski NARXNI yoki eski BALANSNI ko'rib qolishi mumkin.
 *
 * Shuning uchun keshga faqat QARIMAYDIGAN narsalar tushadi:
 *
 *   ✅ JavaScript, CSS, shrift — ular fayl nomida versiya bilan
 *      keladi (`chunks/2-3f1p4geboky.js`). Kod o'zgarsa, nom ham
 *      o'zgaradi. Ya'ni eski nusxa yangisini almashtira olmaydi.
 *
 *   ✅ Belgilar va oflayn sahifa — ular o'zgarmaydi.
 *
 *   ❌ API javoblari — narx, balans, xabar, buyurtma holati.
 *      Ularning eskisi ZARARLI.
 *
 *   ❌ HTML sahifalar — ular ichida foydalanuvchi ma'lumoti
 *      bo'lishi mumkin. Umumiy keshda saqlansa, bitta telefonni
 *      ikki kishi ishlatganda birinchisining ma'lumoti
 *      ikkinchisiga ko'rinardi.
 */
export const CACHEABLE_DESTINATIONS = ['script', 'style', 'font'] as const;

/**
 * Rasm keshi ALOHIDA cheklanadi.
 *
 * Rasmlar keshning 90% ini egallaydi va ular eskirsa zarari yo'q
 * (avatar bir kun eski bo'lgani muammo emas). Lekin cheksiz o'sib
 * ketmasligi kerak: telefon xotirasi tugab qolardi.
 */
export const MAX_CACHED_IMAGES = 60;
