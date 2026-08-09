/**
 * Navbat (waitlist) sozlamalari.
 *
 * Ilova hali hamma uchun ochilmagan. Instagram va Telegramdagi
 * reklamadan kelgan odam shu sahifada raqamini qoldiradi, ochilish
 * kuni esa unga birinchilardan bo'lib xabar boradi.
 */

/** Qayerdan kelganini belgilash uchun ruxsat etilgan manbalar. */
export const WAITLIST_SOURCES = ['instagram', 'telegram', 'youtube', 'tanish', 'boshqa'] as const;

export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];

export const WAITLIST_RULES = {
  /**
   * Navbatdagilar soni shu songa yetgandan keyin sahifada ko'rsatiladi.
   *
   * ── Nima uchun darhol emas ──────────────────────────────────────────
   * "3 kishi navbatda" degan yozuv yangi kelgan odamni ishontirmaydi,
   * aksincha — "demak hech kimga kerak emas ekan" degan taassurot
   * qoldiradi. Son ma'noli bo'lgandan keyingina ko'rsatiladi.
   *
   * Bu YOLG'ON emas: kam bo'lganda son umuman aytilmaydi, hech qachon
   * bo'rttirilmaydi.
   */
  showCountFrom: 50,
} as const;

/**
 * Navbat sahifasidagi va'dalar — nima uchun yozilish arziydi.
 *
 * ── Diqqat: bu MATNLAR va'da ─────────────────────────────────────────
 * Bu yerda yozilgan har bir gap foydalanuvchiga berilgan so'z. Shuning
 * uchun ular ataylab ehtiyotkor: bajarilishi aniq bo'lgan narsalargina
 * yozilgan. Bonus, chegirma yoki muddat va'da qilmoqchi bo'lsangiz —
 * avval uni bajara olishingizga ishonch hosil qiling.
 */
export const WAITLIST_BENEFITS = [
  {
    title: "Birinchilardan bo'lib kirasiz",
    description: "Ilova ochilgan kuni sizga xabar keladi — e'lonni kutib o'tirmaysiz.",
  },
  {
    title: 'Barcha xizmatlar bitta ilovada',
    description: "Taksi, ovqat, marketplace, to'lovlar, ish, mehmonxona va chiptalar.",
  },
  {
    title: 'Fikringiz eshitiladi',
    description: 'Qaysi xizmat sizga birinchi kerakligini ayting — biz shuni oldinga suramiz.',
  },
] as const;
