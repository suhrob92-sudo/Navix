/**
 * Saqlanganlar to'plamlari — YAGONA manba.
 *
 * ── Nima uchun alohida fayl ───────────────────────────────────────────
 * Chegaralar to'rt joyda kerak: ekrandagi maydon (uzunlikni cheklaydi),
 * sxema (kelgan qiymatni rad etadi), xizmat (sonini tekshiradi) va
 * sinov.
 *
 * Har birida alohida yozilsa, ertaga chegara o'zgarganda bittasi
 * eskicha qolardi: ekran 40 belgigacha yozishga ruxsat berib, server
 * uni rad etardi va odam sababini bilmasdi.
 */

/**
 * To'plam nomining eng katta uzunligi.
 *
 * ── Nima uchun 40 belgi ───────────────────────────────────────────────
 * Nom telefon ekranidagi gorizontal qatorda tugma bo'lib turadi.
 * Undan uzun nom tugmani ekrandan chiqarib yuborardi yoki uch nuqta
 * bilan kesilib, o'qib bo'lmas holga kelardi.
 *
 * "Toshkentdagi ochiladigan yangi restoranlar" — 40 belgi. Amalda
 * bundan uzun nom yozadigan odam deyarli yo'q.
 */
export const COLLECTION_NAME_MAX_LENGTH = 40;

/**
 * Bitta odamdagi eng ko'p to'plam.
 *
 * ── Nima uchun chegara kerak ──────────────────────────────────────────
 * To'plamlar ro'yxati saqlanganlar sahifasining TEPASIDA, gorizontal
 * qatorda turadi. Ellikta to'plam bo'lsa, odam kerakligini topguncha
 * qatorni uzoq surishga majbur bo'lardi — ya'ni to'plamlar aynan
 * o'zi hal qilmoqchi bo'lgan muammoni qaytarardi.
 *
 * Yigirmata — amalda hech kim yetmaydigan, lekin ro'yxatni
 * boshqarib bo'ladigan son.
 */
export const MAX_COLLECTIONS = 20;

/**
 * Filtr qiymatlari.
 *
 * `ALL` — hammasi, `NONE` — hech qaysi to'plamga solinmaganlari.
 * Qolgan holatda to'plamning o'z ID si ishlatiladi.
 */
export const COLLECTION_FILTER_ALL = 'ALL';
export const COLLECTION_FILTER_NONE = 'NONE';

/** Ekrandagi doimiy tugmalar nomi. */
export const COLLECTION_ALL_LABEL = 'Barchasi';
export const COLLECTION_NONE_LABEL = 'Guruhlanmagan';

/**
 * Nomni TOZALAYDI.
 *
 * ── Nima uchun bu sof funksiya ────────────────────────────────────────
 * Tozalash ikki joyda kerak: sxemada (saqlashdan oldin) va ekranda
 * (takroriy nomni oldindan ogohlantirish uchun). Ikki joyda alohida
 * yozilsa, ular albatta ajralib ketardi.
 *
 * ── Nima uchun ichki bo'shliqlar ham qisqartiriladi ───────────────────
 * "Yangi    retseptlar" va "Yangi retseptlar" — odam uchun BIR XIL
 * nom. Tozalanmasa, baza ularni ikki xil deb qabul qilardi va
 * ro'yxatda ikkita bir xil ko'rinadigan tugma paydo bo'lardi.
 */
export function cleanCollectionName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, COLLECTION_NAME_MAX_LENGTH);
}

/**
 * Nom QONUNIYmi.
 *
 * Bo'sh nom to'plamni ko'rinmas qilardi: qatorda kengligi nol
 * bo'lgan tugma paydo bo'lib, uni bosib ham bo'lmasdi.
 */
export function isValidCollectionName(value: string): boolean {
  const clean = cleanCollectionName(value);

  return clean.length > 0 && clean.length <= COLLECTION_NAME_MAX_LENGTH;
}
