/**
 * Kirish talab qiladigan sahifalar — YAGONA ro'yxat.
 *
 * ── Nima uchun alohida fayl ───────────────────────────────────────────
 * Bu ro'yxat IKKI joyda kerak:
 *
 *  1. `src/proxy.ts` — cookie yo'q bo'lsa kirish sahifasiga yuboradi;
 *  2. `next.config.ts` — bu sahifalarning HTML'ini KESHLAMASLIKNI
 *     buyuradi (sababi quyida).
 *
 * Ikkita nusxa yuritilsa, ertaga yangi bo'lim qo'shilganda bittasida
 * unutilardi va xato jimgina paydo bo'lardi. Shuning uchun manba bitta.
 *
 * ── Fayl SOF bo'lishi shart ───────────────────────────────────────────
 * `next.config.ts` Next.js ishga tushishidan OLDIN o'qiladi. Shu sababli
 * bu yerda hech qanday import yo'q va bo'lmasligi ham kerak.
 *
 * ── Nima uchun HTML keshlanmasligi kerak ──────────────────────────────
 * Bu sahifalar "qobiq": ular serverda skelet ko'rinishida chiziladi,
 * haqiqiy ma'lumot esa brauzerdagi JavaScript orqali API'dan keladi.
 *
 * Yangi versiya chiqarilganda JavaScript fayllarining nomi o'zgaradi.
 * Agar brauzerda ESKI HTML keshda qolsa, u endi mavjud bo'lmagan
 * fayllarni so'raydi:
 *
 *     eski HTML  →  /_next/static/chunks/abc123.js  →  404
 *
 * Natijada JavaScript ishga tushmaydi va foydalanuvchi ABADIY skeletni
 * ko'rib turadi — sahifa "qotib qolgandek" bo'ladi. Aynan shu xato
 * production'da yuz berdi.
 *
 * Keshlashning foydasi bu yerda deyarli yo'q (qobiq bir necha kilobayt),
 * zarari esa katta. Shuning uchun bu sahifalar har safar yangi olinadi.
 */

export const PROTECTED_PREFIXES = [
  '/dashboard',
  '/welcome',
  '/profile',
  /** Ommaviy profil: `/u/aziz_karimov`. */
  '/u',
  /** Biznes profili: `/b/burger-house`. */
  '/b',
  '/addresses',
  '/devices',
  '/notifications',
  /** Xabarlar: `/messages`. */
  '/messages',
  /** Lenta va bitta post: `/feed`, `/feed/<id>`. */
  '/feed',
  /** Video lentasi. */
  '/reels',
  /** Hikoyalar: `/stories/<username>`. */
  '/stories',
  '/security',
  '/wallet',
  '/payments',
  '/food',
  '/orders',
  '/marketplace',
  '/delivery',
  '/hotel',
  '/travel',
  '/jobs',
  '/merchant',
  '/seller',
  '/courier',
  '/employer',
  /** Yordam xizmati: murojaatlarda shaxsiy ma'lumot bo'ladi. */
  '/support',
  /**
   * Admin panel.
   *
   * `proxy.ts` da faqat "kirganmi?" tekshiriladi — ROL tekshiruvi
   * bo'lmaydi, chunki rol tokenda va uni ochish uchun maxfiy kalit
   * kerak (proxy har so'rovda ishlaydi, tez bo'lishi shart). Haqiqiy
   * himoya `/api/v1/admin/*` endpointlarida: `requirePermission()`.
   */
  '/admin',
] as const;

/**
 * Kirmagan odamga ham SERVERDA chiziladigan sahifalar.
 *
 * ── HAQIQIY XATO: ulashilgan havola BO'SH ko'rinardi ──────────────────
 * `/feed` himoyalangan ro'yxatda va proxy sessiyasiz so'rovni kirish
 * sahifasiga yo'naltirardi. Telegram, WhatsApp va boshqa ilovalar esa
 * havolani O'Z serverlari orqali ochadi — ularda hech qachon sessiya
 * bo'lmaydi.
 *
 * Natijada ular har doim KIRISH sahifasini o'qirdi va kartochkada
 * postning nomi ham, matni ham emas, umumiy "Navix" yozuvi chiqardi.
 * Ya'ni ulashish tugmasi bor edi, lekin ulashishning foydasi yo'q edi.
 *
 * ── Nima uchun bu XAVFSIZ ─────────────────────────────────────────────
 * Bu sahifa serverda faqat QOBIQ bo'lib chiziladi: postning o'zi
 * brauzerdagi JavaScript orqali, TOKEN bilan so'raladi.
 *
 * Ochiq chiqadigan yagona narsa — sarlavha kartochkasi: muallif nomi
 * va matn boshi. Ular ulashishning butun MAQSADI.
 *
 * Kirmagan odam sahifaning o'zini ocholmaydi: `RequireAuth` uni
 * kirish sahifasiga yuboradi va `?next=` bilan qaytarib olib keladi.
 *
 * ── Nima uchun NAQSH, oddiy prefiks emas ──────────────────────────────
 * Faqat BITTA post sahifasi ochiq bo'lishi kerak: `/feed/<id>`.
 * `/feed` ning o'zi (butun lenta), `/feed/saved` (saqlanganlar) va
 * `/feed/settings` esa shaxsiy — ular ochilib qolmasligi shart.
 */
const POST_ID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

export const PUBLIC_PREVIEW_PATTERNS: readonly RegExp[] = [
  /** Bitta post: `/feed/3f1a6c2e-9b4d-4f8a-8c1e-2d7b5a9e0c34`. */
  new RegExp(`^/feed/${POST_ID_PATTERN}$`, 'i'),
  /*
    Ulashish RASMI ham ochiq bo'lishi shart.

    ── HAQIQIY XATO, sinovda topilgan ──────────────────────────────────
    Faqat sahifa ochilib, rasm yopiq qolgan edi. Telegram sarlavhani
    o'qirdi, rasmni so'raganda esa kirish sahifasining HTML'ini
    olardi — ya'ni kartochkada rasm o'rnida bo'shliq qolardi.

    Next.js rasm manzilining oxiriga o'zgaruvchan qism qo'shadi
    (`opengraph-image-6orzjm`), shuning uchun naqsh moslashuvchan.
  */
  new RegExp(`^/feed/${POST_ID_PATTERN}/opengraph-image`, 'i'),
  new RegExp(`^/feed/${POST_ID_PATTERN}/twitter-image`, 'i'),
];

/** Manzil ochiq oldindan ko'rinishga egami. */
export function isPublicPreviewPath(pathname: string): boolean {
  return PUBLIC_PREVIEW_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * `next.config.ts` uchun manzil naqshlari.
 *
 * Next.js `headers()` da `:path*` ko'rinishi ishlatiladi: `/wallet` ning
 * o'zi ham, `/wallet/history` ham qamrab olinadi.
 */
export function protectedPathPatterns(): string[] {
  return PROTECTED_PREFIXES.flatMap((prefix) => [prefix, `${prefix}/:path*`]);
}
