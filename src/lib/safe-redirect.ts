/**
 * Foydalanuvchi bergan manzilga xavfsiz yo'naltirish.
 *
 * ── HAQIQIY XAVF: ochiq yo'naltirish (open redirect) ──────────────────
 * Kirish sahifasi `?next=` parametrini oladi va kirgandan keyin o'sha
 * manzilga o'tadi. Parametr tekshirilmasa, hujum shunday bo'ladi:
 *
 *   1. Hujumchi havola tarqatadi:
 *        https://navix.uz/auth/login?next=https://navix-soxta.uz/kirish
 *
 *   2. Odam havoladagi domenni ko'radi — u HAQIQIY navix.uz. Ishonadi,
 *      haqiqiy parolini kiritadi va rostdan ham kiradi.
 *
 *   3. Kirgandan keyin u soxta saytga tashlanadi. U sayt aynan
 *      Navix'ga o'xshaydi va "sessiya tugadi, qaytadan kiring" deydi.
 *
 *   4. Odam parolini IKKINCHI marta kiritadi — bu safar hujumchiga.
 *
 * Eng zaharli tomoni: birinchi qadamda hamma narsa haqiqiy. Odam
 * o'zining haqiqiy hisobiga kiradi, hech qanday xato ko'rmaydi.
 * Shuning uchun bunday havolaga ishonch juda yuqori.
 *
 * ── Yechim ────────────────────────────────────────────────────────────
 * Faqat O'Z saytimiz ichidagi yo'lga ruxsat beriladi. Har qanday
 * boshqa qiymat jimgina tashlab yuboriladi va odam odatdagi
 * sahifaga o'tadi — unga hech narsa ko'rsatilmaydi, chunki u aybdor
 * emas.
 */

/** Yo'l berilmagan yoki xavfli bo'lsa shu manzil ishlatiladi. */
export const DEFAULT_REDIRECT = '/dashboard';

/**
 * Boshqaruv belgilari: yangi qator, tabulyatsiya va shunga o'xshashlar.
 *
 * Ular bilan tekshiruvni chalg'itish mumkin — ba'zi muhitlar
 * yangi qator qo'shilgan qiymatni boshqacha o'qiydi.
 */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * Qiymat SHU saytdagi yo'lmi.
 *
 * Ruxsat etiladi: `/dashboard`, `/feed/123?tab=all#izoh`.
 *
 * Rad etiladi:
 *  · `https://begona.uz` — boshqa sayt;
 *  · `//begona.uz` — protokolsiz havola, brauzer uni TASHQI manzil deb
 *    o'qiydi (eng ko'p unutiladigan holat);
 *  · `/\begona.uz` — ba'zi brauzerlar teskari chiziqni oldinga
 *    chiziqdek talqin qiladi;
 *  · `javascript:...` — kod bajarish;
 *  · `dashboard` — chiziqsiz nisbiy yo'l, u kutilmagan joyga olib
 *    borishi mumkin.
 */
export function isSafeNextPath(value: string | null | undefined): boolean {
  if (!value) return false;

  /**
   * Boshidagi va oxiridagi bo'shliqlar KESILADI.
   *
   * Brauzerlar manzil boshidagi bo'shliqni e'tiborsiz qoldiradi,
   * ya'ni bo'shliq bilan boshlangan tashqi manzil ham ishlaydi.
   */
  const trimmed = value.trim();

  if (trimmed.length === 0) return false;

  // Bitta chiziq bilan boshlanishi SHART.
  if (!trimmed.startsWith('/')) return false;

  // Ikkinchi belgi chiziq yoki teskari chiziq bo'lsa — tashqi manzil.
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return false;

  if (CONTROL_CHARACTERS.test(trimmed)) return false;

  return true;
}

/**
 * Xavfsiz yo'lni qaytaradi, xavfli bo'lsa odatdagisini.
 *
 * ── Nima uchun xato TASHLANMAYDI ──────────────────────────────────────
 * Odam bu qiymatni o'zi yozmagan — u havoladan kelgan. Unga xato
 * ko'rsatish "siz nimadir noto'g'ri qildingiz" degan ma'noni berardi.
 * Jimgina odatdagi sahifaga o'tish to'g'riroq.
 */
export function safeNextPath(value: string | null | undefined, fallback = DEFAULT_REDIRECT): string {
  if (!isSafeNextPath(value)) return fallback;

  return (value as string).trim();
}
