/**
 * Chipta QR kodi — nima yoziladi va nima YOZILMAYDI.
 *
 * ── Nima uchun QR kerak ───────────────────────────────────────────────
 * Nazoratchi chiptani tekshirganda raqamni ko'z bilan o'qib,
 * ro'yxatdan qidiradi. "NVX-T-20260810-A1B2C3" — yigirma belgi va
 * ularda `0` bilan `O`, `1` bilan `I` chalkashadi.
 *
 * QR bir soniyada skanerlanadi va xato qilmaydi.
 *
 * ── Nima uchun QR ichida FAQAT chipta raqami ──────────────────────────
 * QR kodini istalgan odam skanerlashi mumkin: yo'lovchi telefonini
 * ushlab turganda yonidagi odam ham, ijtimoiy tarmoqqa qo'yilgan
 * suratdan ham.
 *
 * Shuning uchun unda YO'Q:
 *  · yo'lovchining ismi va telefon raqami;
 *  · to'langan summa;
 *  · foydalanuvchi hisobiga bog'liq hech narsa.
 *
 * Chipta raqamining o'zi esa hech narsa ochmaydi: uni bilgan odam
 * ham chiptani ko'ra olmaydi — server har doim EGASINI tekshiradi.
 *
 * ── Nima uchun imzo (JWT) yo'q ────────────────────────────────────────
 * Imzolangan token QR ni "o'z-o'zidan ishonchli" qilardi va
 * nazoratchi internetsiz tekshira olardi.
 *
 * Lekin bunday token uzoq muddat amal qiladi va uni nusxalash
 * mumkin — ya'ni u aslida bilet EMAS, parol bo'lardi. Bizda hali
 * tashuvchining tekshiruv tizimi ham yo'q.
 *
 * Soxta xavfsizlik hech qanday xavfsizlikdan yomonroq, shuning
 * uchun QR shunchaki RAQAM va uni server tekshiradi.
 */

/**
 * Xatoga chidamlilik darajasi.
 *
 * ── Nima uchun "M" ────────────────────────────────────────────────────
 * Chipta ekranda ko'rsatiladi va ekran chizilgan, iflos yoki quyosh
 * ostida bo'lishi mumkin. "L" darajasi bunday holatda o'qilmay
 * qolardi.
 *
 * "H" esa kodni ancha zichlashtiradi — kichik ekranda modullar
 * bir-biriga qo'shilib ketadi.
 */
export const QR_ERROR_LEVEL = 'M' as const;

/**
 * QR ichiga yoziladigan matn.
 *
 * @param ticketNumber Chipta raqami.
 */
export function ticketQrPayload(ticketNumber: string): string {
  return ticketNumber.trim().toUpperCase();
}

/**
 * QR ko'rsatish MUMKINMI.
 *
 * ── Nima uchun bekor qilingan chiptada QR yo'q ────────────────────────
 * Amal qilmaydigan chiptaning QR kodi eng xavfli narsa: nazoratchi
 * uni skanerlaydi, ekranda kod ko'rinadi va u yo'lovchini o'tkazib
 * yuborishi mumkin.
 *
 * Yo'lovchining o'zi ham "QR bor ekan, demak chipta ishlaydi" deb
 * o'ylab, vokzalga bekorga borardi.
 */
export function canShowQr(status: string): boolean {
  return status === 'CONFIRMED';
}
