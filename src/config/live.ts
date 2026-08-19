/**
 * Jonli efir e'lonlari — YAGONA manba.
 *
 * ── Nima uchun HOZIRCHA faqat e'lon ───────────────────────────────────
 * Haqiqiy video oqimi alohida katta ish: media server, tarmoq
 * kanallari, sifat darajalari va ularning puli. Uni hozir boshlash
 * erta — avval lentada odam yig'ilishi kerak.
 *
 * Lekin efirning eng qiyin qismi texnika EMAS: odamlarni aynan
 * o'sha vaqtda ekran oldiga yig'ish. Shu sababdan avval o'sha qism
 * quriladi. Efirning o'zi keyin qo'shilganda, tomoshabin allaqachon
 * tayyor bo'ladi.
 */

/**
 * Efir holatlari.
 *
 * `SCHEDULED` — e'lon qilingan, hali boshlanmagan.
 * `LIVE`      — bloger "boshladim" dedi.
 * `ENDED`     — tugadi.
 * `CANCELLED` — bekor qilindi.
 */
export const LIVE_STATUSES = ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'] as const;

export type LiveStatus = (typeof LIVE_STATUSES)[number];

export const LIVE_STATUS_LABELS: Record<LiveStatus, string> = {
  SCHEDULED: 'Rejalashtirilgan',
  LIVE: 'Efirda',
  ENDED: 'Tugadi',
  CANCELLED: 'Bekor qilindi',
};

/**
 * Holatdan holatga o'tish QOIDALARI.
 *
 * ── Nima uchun ro'yxat sifatida yoziladi ──────────────────────────────
 * Tekshiruvni `if` lar bilan yozish mumkin edi, lekin unda "tugagan
 * efirni qayta boshlash mumkinmi?" degan savolga javob kodning
 * turli joylariga sochilib ketardi.
 *
 * Jadval ko'rinishida esa butun mantiq bir qarashda ko'rinadi va
 * uni sinov bilan to'liq qamrab olish oson.
 */
export const LIVE_TRANSITIONS: Record<LiveStatus, readonly LiveStatus[]> = {
  /* E'lon qilingan efirni boshlash yoki bekor qilish mumkin. */
  SCHEDULED: ['LIVE', 'CANCELLED'],
  /*
    Efirdagi efirni faqat TUGATISH mumkin.

    "Bekor qilish" bu yerda ma'nosiz: efir allaqachon bo'lib
    o'tdi va uni bo'lmagan qilib ko'rsatish yolg'on bo'lardi.
  */
  LIVE: ['ENDED'],
  /* Tugagan va bekor qilingan efir — YAKUNIY holat. */
  ENDED: [],
  CANCELLED: [],
};

/** Holatni o'zgartirish mumkinmi. */
export function canChangeLiveStatus(from: LiveStatus, to: LiveStatus): boolean {
  return LIVE_TRANSITIONS[from].includes(to);
}

/** Sarlavha uzunligi — ro'yxatdagi kartochkaga sig'ishi kerak. */
export const LIVE_TITLE_MAX_LENGTH = 120;

/** Izoh uzunligi. */
export const LIVE_DESCRIPTION_MAX_LENGTH = 500;

/**
 * Efirni qancha OLDIN e'lon qilish mumkin (daqiqa).
 *
 * ── Nima uchun eng kami 5 daqiqa ──────────────────────────────────────
 * E'lonning butun ma'nosi — odamlarga xabar berish. Bir daqiqadan
 * keyin boshlanadigan efirni hech kim ko'rmasdi va e'lon shunchaki
 * ro'yxatni to'ldirardi.
 */
export const LIVE_MIN_LEAD_MINUTES = 5;

/**
 * Eng uzoq muddat (kun).
 *
 * ── Nima uchun 30 kun ─────────────────────────────────────────────────
 * Undan uzoq rejalar deyarli har doim o'zgaradi va ro'yxatda
 * "olti oydan keyin" degan e'lonlar to'planib qolardi. Ular esa
 * yaqin efirlarni pastga surib yuborardi.
 */
export const LIVE_MAX_DAYS_AHEAD = 30;

/**
 * Bitta blogerdagi eng ko'p REJALASHTIRILGAN efir.
 *
 * Chegarasiz bo'lsa, bitta odam yuzta e'lon qo'yib, butun ro'yxatni
 * egallab olardi.
 */
export const MAX_SCHEDULED_LIVES = 5;

/**
 * Efir tugagach ro'yxatda qancha turadi (soat).
 *
 * Tugagan efir darhol yo'qolsa, kechikib kelgan odam "efir bo'ldimi
 * yoki bekor qilindimi?" degan savolga javob topa olmasdi.
 */
export const LIVE_ENDED_VISIBLE_HOURS = 6;
