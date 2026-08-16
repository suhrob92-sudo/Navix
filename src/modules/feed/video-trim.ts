import { MAX_VIDEO_SECONDS } from '@/modules/upload/upload.types';

/**
 * Video kesish — SOF hisob-kitob.
 *
 * ── Nima uchun bu fayl alohida ────────────────────────────────────────
 * Kesish nuqtalari UCH joyda ishlatiladi: muharrir ekrani (odam
 * surgichni suradi), server (kelgan qiymatni tekshiradi) va pleyer
 * (o'sha oraliqda o'ynatadi).
 *
 * Har birida alohida hisoblansa, ular albatta ajralib ketardi: ekran
 * "12 soniya" deb ko'rsatib, server 13 ni saqlab qo'yardi. Bunday
 * xatoni ko'z bilan payqash deyarli imkonsiz.
 *
 * Shuning uchun butun hisob shu yerda — brauzersiz, bazasiz, sof
 * funksiya sifatida. Uni sinov bilan har tomondan tekshirish mumkin.
 */

/**
 * Eng qisqa kesim.
 *
 * ── Nima uchun 1 soniya ───────────────────────────────────────────────
 * Undan qisqasi video emas, kadr bo'lardi: pleyer boshlanishi bilan
 * to'xtardi va odam "video buzuq" deb o'ylardi.
 */
export const MIN_TRIM_SECONDS = 1;

/**
 * Muharrirdagi kadrlar soni.
 *
 * ── Nima uchun 6 ta ───────────────────────────────────────────────────
 * Telefon ekranida bir qatorga shuncha sig'adi. Ko'proq bo'lsa har
 * biri tirnoqdek kichrayib, kadrni tanib bo'lmasdi; kamroq bo'lsa
 * videoning yarmi ko'rinmasdan qolardi.
 *
 * Har bir kadr alohida dekodlanadi — bu telefon uchun eng qimmat
 * amal, shuning uchun son atayin kichik.
 */
export const COVER_FRAME_COUNT = 6;

export interface TrimRange {
  start: number;
  end: number;
}

/** Soniyani ikki xonagacha yaxlitlaydi — o'ndan mingdan keyingisi ortiqcha. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Kesim oralig'ini QONUNIY holatga keltiradi.
 *
 * ── Nima uchun tuzatadi, rad etmaydi ──────────────────────────────────
 * Bu funksiya surgich harakatlanayotganda chaqiriladi. Har noto'g'ri
 * holatda xato ko'rsatilsa, ekran qizil yozuvlarga to'lib ketardi —
 * holbuki odam shunchaki barmog'ini surayotgan bo'ladi.
 *
 * Shuning uchun natija HAR DOIM ishlaydigan oraliq bo'ladi: chegaradan
 * chiqqan qiymat chegaraga qaytariladi, teskari oraliq to'g'rilanadi.
 *
 * @param duration Faylning to'liq uzunligi.
 */
export function clampTrim(start: number, end: number, duration: number): TrimRange {
  /*
    Buzuq davomiylik — kesish umuman mumkin emas.

    Ba'zi fayllarda brauzer `Infinity` yoki `NaN` qaytaradi (oqim
    sifatida yozilgan video). Bunday holda hisoblashga urinish
    `NaN` ni butun ekran bo'ylab tarqatardi.
  */
  if (!Number.isFinite(duration) || duration <= 0) {
    return { start: 0, end: 0 };
  }

  const safeStart = Number.isFinite(start) ? Math.min(Math.max(start, 0), duration) : 0;
  const safeEnd = Number.isFinite(end) ? Math.min(Math.max(end, 0), duration) : duration;

  /*
    Oraliq eng kichik uzunlikdan qisqa bo'lsa, OXIRI suriladi.

    Boshini surish tabiiyroq tuyuladi, lekin odam odatda oxirgi
    surgichni ushlab turgan bo'ladi — uning ostidagi qiymatni
    o'zgartirish barmoq bilan kurashishga o'xshardi.
  */
  if (safeEnd - safeStart >= MIN_TRIM_SECONDS) {
    return { start: round(safeStart), end: round(safeEnd) };
  }

  // Videoning o'zi juda qisqa — kesishning ma'nosi yo'q.
  if (duration <= MIN_TRIM_SECONDS) {
    return { start: 0, end: round(duration) };
  }

  const shiftedEnd = safeStart + MIN_TRIM_SECONDS;

  if (shiftedEnd <= duration) {
    return { start: round(safeStart), end: round(shiftedEnd) };
  }

  // Oxiriga tirab qo'yilgan — endi boshi orqaga suriladi.
  return { start: round(duration - MIN_TRIM_SECONDS), end: round(duration) };
}

/**
 * Kesilgandan keyingi uzunlik — TOMOSHABIN ko'radigan vaqt.
 *
 * Butun songa yaxlitlanadi: bazada `videoSeconds` butun son va
 * ekranda ham "0:12" ko'rinishida ko'rsatiladi.
 *
 * Yuqoriga yaxlitlanadi — 11.2 soniyalik video "0:11" deb yozilsa,
 * oxirgi kadr sanoqdan tashqarida qolardi.
 */
export function trimmedSeconds(range: TrimRange): number {
  return Math.max(MIN_TRIM_SECONDS, Math.ceil(range.end - range.start));
}

/**
 * Kesim SAQLASHGA yaroqlimi.
 *
 * ── Nima uchun `clampTrim` dan alohida ────────────────────────────────
 * `clampTrim` — ekran uchun: u tuzatadi. Bu esa SERVER uchun: u
 * tekshiradi va rad etadi.
 *
 * Ikkalasi bir funksiya bo'lishi mumkin emasdi. Server kelgan
 * qiymatni jimgina "tuzatib" saqlasa, brauzerdagi xatolik ham,
 * ataylab yuborilgan buzuq so'rov ham bilinmay qolardi.
 */
export function isValidTrim(start: number, end: number): boolean {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  if (start < 0) return false;
  if (end - start < MIN_TRIM_SECONDS) return false;

  // Kesim uzunligi yuklash chegarasidan oshmaydi.
  return end - start <= MAX_VIDEO_SECONDS;
}

/**
 * Muqova uchun kadr vaqtlarini hisoblaydi.
 *
 * ── Nima uchun chekkalardan ICHKARIROQ ────────────────────────────────
 * Aynan boshlanish nuqtasidagi kadr ko'pincha qorong'i bo'ladi
 * (video ochilishi) va oxirgisi ham (yopilishi). Ular muqova
 * sifatida eng yomon tanlov bo'lardi.
 *
 * Shuning uchun kadrlar oraliqni teng bo'lakka bo'lib, HAR
 * BO'LAKNING O'RTASIDAN olinadi.
 */
export function coverFrameTimes(range: TrimRange, count = COVER_FRAME_COUNT): number[] {
  const span = range.end - range.start;

  if (span <= 0 || count < 1) return [round(range.start)];

  const step = span / count;

  return Array.from({ length: count }, (_, index) => round(range.start + step * (index + 0.5)));
}

/**
 * Pleyer uchun: shu vaqt kesim ICHIDAMI.
 *
 * Chegaradan chiqqan bo'lsa, pleyer boshiga qaytarishi kerak.
 */
export function isInsideTrim(currentTime: number, range: TrimRange): boolean {
  return currentTime >= range.start && currentTime <= range.end;
}

/**
 * Post ma'lumotidan kesimni o'qiydi.
 *
 * ── Nima uchun `null` ham javob ───────────────────────────────────────
 * Kesish qo'shilishidan OLDIN joylangan videolarda bu maydonlar bo'sh.
 * Ular butunlay o'ynashi kerak — eski postlarni buzish mumkin emas.
 *
 * Yarim to'ldirilgan holat ham (faqat boshi bor) kesilmagan deb
 * qaraladi: yarim ma'lumot bilan pleyer qayerda to'xtashini
 * bilmasdi.
 */
export function readTrim(post: {
  videoStartSeconds: number | null;
  videoEndSeconds: number | null;
}): TrimRange | null {
  const { videoStartSeconds: start, videoEndSeconds: end } = post;

  if (start === null || end === null) return null;
  if (!isValidTrim(start, end)) return null;

  return { start, end };
}
