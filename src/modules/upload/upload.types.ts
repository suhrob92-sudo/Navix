/**
 * Rasm yuklash — brauzer va server uchun umumiy turlar.
 */

/**
 * Rasm nima uchun yuklanmoqda.
 *
 * ── Nima uchun MAQSAD ko'rsatiladi ───────────────────────────────────
 * Har birining chegarasi va papkasi boshqacha: avatar kichik va bitta,
 * postdagi rasm kattaroq bo'lishi mumkin. Bundan tashqari kelajakda
 * "chatdagi rasmlarni tozalash" kabi ish faqat maqsad ma'lum bo'lganda
 * bajarilishi mumkin.
 */
export type UploadPurpose = 'AVATAR' | 'POST' | 'CHAT';

/** Qabul qilinadigan rasm turlari. */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/**
 * Eng katta hajm — 5 MB.
 *
 * ── Nima uchun aynan shuncha ─────────────────────────────────────────
 * Telefon kamerasidan olingan rasm odatda 2-4 MB. Brauzer uni
 * yuborishdan oldin kichraytiradi (`src/lib/image-resize.ts`), ya'ni
 * amalda 300 KB atrofida keladi.
 *
 * Bu chegara esa HIMOYA: kichraytirish ishlamagan yoki chetlab
 * o'tilgan holatda ham server bir necha o'nlab megabaytli faylni
 * qabul qilmasligi kerak.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Yuklashdan oldin brauzerda rasm shu o'lchamgacha kichraytiriladi. */
export const IMAGE_MAX_DIMENSION = 1_600;

/** Avatar kvadrat va kichik — katta o'lcham bekorga trafik sarflaydi. */
export const AVATAR_MAX_DIMENSION = 512;

export interface UploadResponse {
  url: string;
  key: string;
}

/**
 * Hajmni odam tiliga o'giradi: 1536000 → "1.5 MB".
 *
 * ── Nima uchun `Intl` EMAS ───────────────────────────────────────────
 * Loyihadagi barcha formatlash qo'lda: `Intl` server va brauzerda
 * boshqacha natija berib, React "hydration mismatch" xatosini
 * chiqarardi (sabab `src/lib/money.ts` da batafsil).
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  const megabytes = Math.round((bytes / (1024 * 1024)) * 10) / 10;

  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}

/**
 * Rasm turiga mos fayl kengaytmasi.
 *
 * Kengaytma kerak: brauzer va CDN fayl turini ko'pincha aynan shundan
 * aniqlaydi. Kengaytmasiz rasm yuklab olinganda "nomsiz fayl" bo'lib
 * tushardi.
 */
/**
 * Manzildan ichki kalitni ajratadi.
 *
 * ── Nima uchun bu funksiya IKKI ish qiladi ───────────────────────────
 * Birinchisi — o'chirish uchun kalit topish (bazada MANZIL saqlanadi,
 * o'chirish uchun esa kalit kerak).
 *
 * Ikkinchisi va muhimrog'i — TEKSHIRUV. Brauzer "postimga shu rasmni
 * biriktir" deb istalgan manzilni yuborishi mumkin, jumladan begona
 * saytdagi rasmni. U holda lentada begona sayt yuklanardi: u har bir
 * ko'rgan odamning IP manzilini yig'ib olardi va istalgan payt
 * rasmni boshqasiga almashtira olardi.
 *
 * Shuning uchun faqat O'ZIMIZ yaratgan manzil qabul qilinadi va
 * "o'zimizniki" degani aynan shu: kalit ajralib chiqsa — bizniki.
 *
 * @returns Kalit yoki `null` — manzil begona bo'lsa.
 */
export function keyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Mahalliy yo'l: /api/v1/files/posts/<id>/<uuid>.jpg
  const localPrefix = '/api/v1/files/';

  if (url.startsWith(localPrefix)) {
    const key = url.slice(localPrefix.length);

    return /^[a-z0-9][a-z0-9/_.-]*$/i.test(key) && !key.includes('..') ? key : null;
  }

  /**
   * Blob manzili:
   * https://<store>.public.blob.vercel-storage.com/posts/<id>/<uuid>.jpg
   */
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'https:') return null;
    if (!parsed.hostname.endsWith('.blob.vercel-storage.com')) return null;

    const key = parsed.pathname.replace(/^\//, '');

    return key.length > 0 ? key : null;
  } catch {
    return null;
  }
}

/** Manzil bizning saqlashimizdanmi. */
export function isOwnImageUrl(url: string): boolean {
  return keyFromUrl(url) !== null;
}

export function extensionFor(type: AllowedImageType): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';

  return 'jpg';
}
