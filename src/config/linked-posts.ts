import type { AttachmentKindName } from '@/config/attachments';

/**
 * "Bu narsa haqidagi videolar" — ZANJIRNING TESKARI TOMONI.
 *
 * ── Muammo ────────────────────────────────────────────────────────────
 * 9-bosqichda videoga mahsulot, taom, restoran, ish va mehmonxona
 * biriktirish qo'shildi. Zanjir bir tomonga ishlaydi:
 *
 *     video ──> mahsulot sahifasi
 *
 * Lekin teskarisi yo'q edi. Mahsulot sahifasiga tushgan odam u
 * haqida video borligini BILMASDI — garchi o'sha video uni ishontira
 * oladigan yagona narsa bo'lsa ham. Rasm va matn hamma do'konda bir
 * xil; video esa "mana, men ishlatdim" deydi.
 *
 * ── Yechim ────────────────────────────────────────────────────────────
 *     mahsulot sahifasi ──> uni ko'rsatgan videolar
 *
 * Zanjir yopiladi: lentadan ekotizimga, ekotizimdan lentaga.
 *
 * ── Nima uchun bu fayl BRAUZERGA ham ketadi ───────────────────────────
 * Ichida faqat sarlavhalar va son bor — hech qanday server siri yo'q.
 */

/**
 * Bo'lim sarlavhasi — TURGA MOS.
 *
 * ── Nima uchun hammasi "Videolar" emas ───────────────────────────────
 * Mahsulot sahifasida "Videolar" degan sarlavha ostida do'konning
 * reklama roligi turibdimi yoki xaridorning fikri — bilinmaydi.
 * Aniq sarlavha nimani ochayotganini oldindan aytadi.
 */
export const LINKED_POSTS_TITLE: Record<AttachmentKindName, string> = {
  PRODUCT: 'Shu mahsulot ko\'rsatilgan videolar',
  MENU_ITEM: 'Shu taom ko\'rsatilgan videolar',
  RESTAURANT: 'Shu restoran haqida videolar',
  VACANCY: 'Shu ish haqida videolar',
  HOTEL: 'Shu mehmonxona haqida videolar',
};

/*
  MENU_ITEM ning O'Z sahifasi hozircha yo'q — taom restoran
  menyusida turadi va uning videolari restoran bo'limida
  ko'rinadi (`attachmentFilter` da izohi bor).

  Sarlavha baribir yozilgan: xarita TO'LIQ bo'lishi shart qilib
  qo'yilgan, aks holda ertaga taom sahifasi paydo bo'lganda bu
  yerdagi bo'shliq faqat ekran chizishda bilinardi.
*/

/**
 * Bo'lim ostidagi izoh — video KIM tomonidan yozilganini aytadi.
 *
 * ── Nima uchun bu yozuv KERAK ─────────────────────────────────────────
 * Sahifa do'konniki, video esa boshqa odamniki. Izohsiz odam uni
 * do'konning o'z reklamasi deb o'ylaydi va ishonchi kamayadi.
 * Ochiq aytilganda esa aksincha bo'ladi.
 */
export const LINKED_POSTS_HINT = 'Videolarni Navix foydalanuvchilari joylagan.';

/**
 * Nechta video ko'rsatiladi.
 *
 * ── Nima uchun 12 ta ─────────────────────────────────────────────────
 * Bu bo'lim sahifaning ASOSIY mazmuni emas: odam bu yerga mahsulot
 * sotib olish uchun kelgan. Cheksiz ro'yxat "yana bosing" tugmasini,
 * belgini va bo'sh holatni talab qilardi — mahsulot sahifasida esa
 * bularning hammasi ortiqcha.
 *
 * 12 ta — yonma-yon suriladigan tasmada to'rt-besh ekran. Bundan
 * ko'pini hech kim surib chiqmaydi.
 */
export const LINKED_POSTS_LIMIT = 12;

/**
 * So'rov manzili.
 *
 * ── Nima uchun manzil SHU YERDA quriladi ──────────────────────────────
 * Manzil to'rtta sahifada kerak. Har birida qo'lda yozilsa, biri
 * albatta xato yozilardi va bo'lim jimgina bo'sh qolardi — xato
 * ko'rinmasdi, chunki bo'sh bo'lim ham to'g'ri holat.
 */
export function linkedPostsPath(kind: AttachmentKindName, targetId: string): string {
  return `/api/v1/feed/linked?kind=${kind}&targetId=${encodeURIComponent(targetId)}`;
}
