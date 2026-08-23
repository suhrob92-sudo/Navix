/**
 * Mahsulot sahifasi — yagona sozlama.
 *
 * ── Nima uchun sahifa QAYTA QURILDI ───────────────────────────────────
 * Eski tartibda sahifa shunday edi: rasm → nom → narx → zaxira →
 * tavsif → do'kon → savatga.
 *
 * Undagi eng katta kamchilik — eng muhim savol javobsiz qolardi:
 * "QACHON keladi?". U do'kon kartochkasining ichida, kichik kulrang
 * matnda, "2 kunda yetkaziladi" ko'rinishida turardi.
 *
 * ── Yangi tartib va uning sababi ──────────────────────────────────────
 * Xaridor sahifani yuqoridan pastga o'qimaydi — u SAVOL ketma-ketligi
 * bo'yicha qaraydi:
 *
 *   1. "bu nima?"        → galereya va nom;
 *   2. "qancha turadi?"  → narx va chegirma;
 *   3. "qachon keladi?"  → yetkazish sanasi;
 *   4. "olamanmi?"       → savatga tugmasi;
 *   5. "batafsil-chi?"   → tavsif va xususiyatlar;
 *   6. "boshqalar-chi?"  → baholar;
 *   7. "hali savolim bor" → savol-javob.
 *
 * Har bir keyingi bo'lim faqat oldingisiga javob olgan odam uchun
 * kerak. Shuning uchun tartib aynan shunday.
 */

/**
 * Bitta mahsulotda eng ko'p nechta xususiyat.
 *
 * ── Nima uchun 20 ta ──────────────────────────────────────────────────
 * Telefonning texnik varaqasi 40 qatordan iborat bo'lishi mumkin,
 * lekin xaridor ulardan 5-8 tasiga qaraydi.
 *
 * Chegara sotuvchini MUHIMLARINI tanlashga majbur qiladi va jadval
 * telefon ekranida o'qib bo'lmas holga kelmaydi.
 */
export const MAX_PRODUCT_ATTRIBUTES = 20;

/** Xususiyat nomi va qiymati uzunligi. */
export const ATTRIBUTE_NAME_MAX_LENGTH = 60;
export const ATTRIBUTE_VALUE_MAX_LENGTH = 200;

/**
 * Sahifada nechta xususiyat ko'rinadi — qolganlari yopiq turadi.
 *
 * ── Nima uchun yopiladi ───────────────────────────────────────────────
 * 20 qatorlik jadval telefon ekranining butun balandligini egallaydi
 * va uning ostidagi baholar bo'limiga hech kim yetib bormaydi.
 */
export const VISIBLE_ATTRIBUTES = 6;

/** Savol matnining uzunligi. */
export const QUESTION_MAX_LENGTH = 500;

/** Javob matnining uzunligi. */
export const ANSWER_MAX_LENGTH = 1_000;

/**
 * Bir sahifada nechta savol.
 *
 * Savollar odatda ko'p bo'lmaydi va ular baholardan pastda turadi —
 * shuning uchun chegara kichik.
 */
export const QUESTIONS_PAGE_SIZE = 10;

/**
 * Bitta odam bir kunda nechta savol bera oladi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Savolni istalgan kirgan odam bera oladi va bu bo'lim eng oson
 * spam yo'li: raqobatchi o'nlab "bu yomonmi?" degan savol yozib,
 * sahifani buzib qo'yishi mumkin.
 *
 * Kuniga 10 ta — haqiqiy xaridor uchun juda ko'p, spam uchun esa
 * foydasiz.
 */
export const MAX_QUESTIONS_PER_DAY = 10;

/** Savol yozishga ruxsat yo'qligining sababi. */
export type QuestionBlockReason = 'GUEST' | 'DAILY_LIMIT';

export const QUESTION_BLOCK_TEXT: Record<QuestionBlockReason, string> = {
  GUEST: 'Savol berish uchun hisobingizga kiring',
  DAILY_LIMIT: `Bugun ${MAX_QUESTIONS_PER_DAY} ta savol berdingiz. Ertaga davom eting.`,
};

/** Javobsiz savol belgisining matni. */
export function answerCountText(count: number): string {
  if (count === 0) return 'Javob kutilmoqda';

  return `${count} ta javob`;
}

/**
 * Yopiq xususiyatlar tugmasining matni.
 *
 * Nechta qolganini AYTADI: "yana 8 ta" degan yozuv "hammasini
 * ko'rsatish" dan aniqroq — odam bosishga arziydimi yo'qmi,
 * darhol biladi.
 */
export function moreAttributesText(hidden: number): string {
  return `Yana ${hidden} ta xususiyat`;
}
