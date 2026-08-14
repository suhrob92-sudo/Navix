/**
 * Fayl yuklash — brauzer va server uchun umumiy turlar.
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
export type UploadPurpose = 'AVATAR' | 'POST' | 'CHAT' | 'VOICE' | 'VIDEO';

/** Qabul qilinadigan rasm turlari. */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/**
 * Qabul qilinadigan ovoz turlari.
 *
 * ── Nima uchun aynan shular ──────────────────────────────────────────
 * Brauzer ovozni O'ZI tanlagan formatda yozadi va tanlov qurilmaga
 * bog'liq:
 *  · Android va kompyuterdagi Chrome → WebM (Opus kodeki);
 *  · iPhone va Safari → MP4 (AAC kodeki).
 *
 * Ikkalasi ham qabul qilinadi, aks holda iPhone egalari ovozli xabar
 * yubora olmasdi.
 */
export const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mp4', 'audio/ogg'] as const;

export type AllowedAudioType = (typeof ALLOWED_AUDIO_TYPES)[number];

/**
 * Qabul qilinadigan VIDEO turlari.
 *
 * ── Nima uchun aynan shular ──────────────────────────────────────────
 * Telefon kamerasi yozadigan formatlar:
 *  · Android → MP4 (H.264);
 *  · iPhone  → MOV (QuickTime, ichida ham H.264).
 *
 * WebM esa brauzerda yozilgan videolar uchun. Uchalasi ham
 * brauzerlarda o'ynaydi; MOV faqat Safari'da to'liq, lekin uni rad
 * etsak iPhone egalari video joylay olmasdi.
 */
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

export type AllowedVideoType = (typeof ALLOWED_VIDEO_TYPES)[number];

export type AllowedUploadType = AllowedImageType | AllowedAudioType | AllowedVideoType;

/**
 * Videoning eng uzun davomiyligi — 60 soniya.
 *
 * ── Nima uchun cheklov ───────────────────────────────────────────────
 * Qisqa video lentaning butun ma'nosi: odam bir daqiqada o'nlab
 * videoni ko'rib chiqadi. Uzun video esa boshqa janr va u boshqa
 * imkoniyatlarni talab qiladi (oldinga o'tish, sifat tanlash,
 * qismlarga bo'lib yuklash).
 *
 * Bundan tashqari uzun video KATTA: bir daqiqalik telefon videosi
 * odatda 15-25 MB, besh daqiqalik esa 100 MB dan oshadi va uni
 * mobil internetda ko'rish azob bo'lardi.
 */
export const MAX_VIDEO_SECONDS = 60;

/**
 * Videoning eng katta hajmi — 48 MB.
 *
 * Bir daqiqalik telefon videosi odatda 15-25 MB. Chegara undan
 * kengroq: brauzer videoni kichraytira olmaydi (rasmdan farqli),
 * shuning uchun bu yerda zaxira qoldirilgan.
 */
export const MAX_VIDEO_BYTES = 48 * 1024 * 1024;

/**
 * Video SERVER ORQALI yuborilmaydi.
 *
 * ── HAQIQIY TO'SIQ, e'tibordan chetda qolishi oson ───────────────────
 * Vercel'da serversiz funksiyaga kelgan so'rov tanasi 4.5 MB bilan
 * cheklangan. Ya'ni 20 MB lik video `/api/v1/uploads` orqali
 * yuborilsa, u ishlab chiqishda ishlaydi-yu, production'da
 * "413 Payload Too Large" bilan yiqiladi — va buni faqat
 * foydalanuvchilar topadi.
 *
 * Shuning uchun video BRAUZERDAN TO'G'RIDAN-TO'G'RI omborga
 * yuboriladi: server faqat qisqa muddatli ruxsat (token) beradi va
 * faylning o'zi u orqali o'tmaydi.
 */
export const VIDEO_UPLOAD_PATH = '/api/v1/uploads/video-token';

/**
 * Ovozli xabarning eng uzun davomiyligi — 2 daqiqa.
 *
 * ── Nima uchun cheklov ───────────────────────────────────────────────
 * Uzun ovozli xabar suhbatdosh uchun yuk: uni tinglash uchun vaqt
 * ajratish kerak va tez ko'z yugurtirib bo'lmaydi.
 *
 * Ikki daqiqa — fikrni aytishga yetadi. Undan uzunini yozmoqchi bo'lgan
 * odam odatda qo'ng'iroq qilgani ma'qul.
 */
export const MAX_VOICE_SECONDS = 120;

/** Ovozli xabar shu tezlikda yoziladi (bit/soniya). */
export const VOICE_BITRATE = 24_000;

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

/**
 * Fayl turiga mos kengaytma.
 *
 * Kengaytma kerak: brauzer va CDN fayl turini ko'pincha aynan shundan
 * aniqlaydi. Kengaytmasiz fayl yuklab olinganda "nomsiz fayl" bo'lib
 * tushardi.
 */
export function extensionFor(type: AllowedUploadType): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  if (type === 'audio/webm') return 'webm';
  if (type === 'audio/mp4') return 'm4a';
  if (type === 'audio/ogg') return 'ogg';
  if (type === 'video/mp4') return 'mp4';
  if (type === 'video/webm') return 'webm';
  if (type === 'video/quicktime') return 'mov';

  return 'jpg';
}

/**
 * Davomiylikni odam tiliga o'giradi: 95 → "1:35".
 *
 * ── Nima uchun `Intl` EMAS ───────────────────────────────────────────
 * Loyihadagi barcha formatlash qo'lda: `Intl` server va brauzerda
 * boshqacha natija berib, React "hydration mismatch" xatosini
 * chiqarardi.
 */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;

  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
