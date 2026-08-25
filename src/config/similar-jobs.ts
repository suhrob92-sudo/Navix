/**
 * "Menga o'xshash vakansiyalar" — qoidalar.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Vakansiyani ochgan odam ko'pincha unga ariza YUBORMAYDI: maosh
 * past, shahar boshqa, tajriba talabi baland.
 *
 * O'shanda u orqaga qaytib, ro'yxatni yana varaqlaydi. Aslida esa
 * o'sha lahzada uning nimani izlayotgani ANIQ ma'lum — u aynan shu
 * turdagi ishni ochdi.
 *
 * ── Nima uchun sun'iy intellekt EMAS ──────────────────────────────────
 * "O'xshashlik" so'zi model ishlatishga undaydi. Lekin bu yerda
 * o'xshashlik ANIQ o'lchanadi: bir xil yo'nalish, bir xil shahar,
 * yaqin maosh.
 *
 * Model bu qoidalarni takrorlardi, ustiga pul va kechikish
 * qo'shardi va eng yomoni — natijasini TUSHUNTIRIB bo'lmasdi.
 * Bu yerda esa har bir ball uchun sabab bor.
 *
 * ── Nima uchun BALL, oddiy filtr emas ─────────────────────────────────
 * Qat'iy filtr ("aynan shu yo'nalish va shu shahar") ko'pincha bo'sh
 * ro'yxat berardi: kichik shaharda bitta yo'nalishda ikkita vakansiya
 * bo'lishi mumkin.
 *
 * Ball esa eng yaqinlarini tepaga chiqaradi va ro'yxat hech qachon
 * bo'sh qolmaydi.
 */

/** Taqqoslash uchun kerakli maydonlar. */
export interface SimilarCandidate {
  id: string;
  categorySlug: string;
  city: string;
  experienceLevel: string;
  employmentType: string;
  /** Maoshlar TIYINDA. `null` — kelishilgan holda. */
  salaryMin: number | null;
  salaryMax: number | null;
}

/**
 * Ballar.
 *
 * ── Nima uchun YO'NALISH eng og'ir ────────────────────────────────────
 * Dasturchi izlayotgan odamga oshpaz vakansiyasi kerak emas —
 * u bir xil shaharda va bir xil maoshda bo'lsa ham.
 *
 * Shahar ikkinchi o'rinda: odam ko'chib o'tishga tayyor bo'lishi
 * mumkin, lekin kasbini o'zgartirishga — kamdan-kam.
 */
export const SIMILARITY_WEIGHTS = {
  category: 50,
  city: 25,
  experience: 15,
  employment: 10,
  salary: 20,
} as const;

/**
 * Maosh "yaqin" hisoblanadigan farq — FOIZDA.
 *
 * 30% — sezilarli, lekin qaror o'zgartiradigan darajada emas.
 * Undan katta farq esa boshqa daraja degani.
 */
export const SALARY_NEAR_PERCENT = 30;

/** Vakansiyaning o'rtacha maoshi — TIYINDA. Noma'lum bo'lsa `null`. */
export function midSalary(item: Pick<SimilarCandidate, 'salaryMin' | 'salaryMax'>): number | null {
  const { salaryMin, salaryMax } = item;

  if (salaryMin !== null && salaryMax !== null) return (salaryMin + salaryMax) / 2;

  /*
    Faqat bitta chegara berilgan bo'lsa, o'sha ishlatiladi:
    "2 mln dan" degan e'londa 2 mln — mavjud yagona ma'lumot.
  */
  return salaryMin ?? salaryMax;
}

/**
 * Ikki vakansiyaning o'xshashlik BALLI.
 *
 * @returns 0 dan 120 gacha. Katta son — o'xshashroq.
 */
export function similarityScore(source: SimilarCandidate, candidate: SimilarCandidate): number {
  let score = 0;

  if (source.categorySlug === candidate.categorySlug) score += SIMILARITY_WEIGHTS.category;
  if (source.city === candidate.city) score += SIMILARITY_WEIGHTS.city;
  if (source.experienceLevel === candidate.experienceLevel) score += SIMILARITY_WEIGHTS.experience;
  if (source.employmentType === candidate.employmentType) score += SIMILARITY_WEIGHTS.employment;

  const sourceSalary = midSalary(source);
  const candidateSalary = midSalary(candidate);

  /*
    ── Maosh noma'lum bo'lsa ball BERILMAYDI ─────────────────────────
    "Kelishilgan holda" degan ikki e'lonni o'xshash deb hisoblash
    mumkin edi, lekin bu ma'nosiz: ular haqida hech narsa
    ma'lum emas.

    Jazolash ham noto'g'ri bo'lardi — O'zbekistonda e'lonlarning
    katta qismi shunday yoziladi.
  */
  if (sourceSalary !== null && candidateSalary !== null && sourceSalary > 0) {
    const difference = Math.abs(candidateSalary - sourceSalary) / sourceSalary;

    if (difference * 100 <= SALARY_NEAR_PERCENT) score += SIMILARITY_WEIGHTS.salary;
  }

  return score;
}

/**
 * Eng o'xshash vakansiyalarni tanlaydi.
 *
 * ── Nima uchun YO'NALISH — QAT'IY shart ───────────────────────────────
 * Avval bu yerda faqat "eng kam ball" sharti bor edi va u YETARLI
 * emasligi test yozilganda ochildi:
 *
 *   oshpaz vakansiyasi bir xil shahar (25) + tajriba (15) +
 *   bandlik (10) + yaqin maosh (20) = 70 ball to'plardi va
 *   dasturchi izlayotgan odamga "o'xshash" deb ko'rsatilardi.
 *
 * Ballarni qayta muvozanatlash mumkin edi, lekin u mo'rt yechim:
 * ertaga yangi mezon qo'shilsa, yig'indi yana chegaradan oshib
 * ketardi va buni hech kim sezmasdi.
 *
 * Shuning uchun yo'nalish endi BALL emas, SHART: boshqa kasbdagi
 * e'lon ro'yxatga umuman tushmaydi. Ball esa qolganlarini
 * tartiblaydi.
 *
 * ── Nima uchun bo'sh ro'yxat ham to'g'ri javob ────────────────────────
 * Kichik shaharda bitta yo'nalishda bitta vakansiya bo'lishi
 * mumkin. "O'xshash" deb tasodifiy narsani ko'rsatishdan ko'ra
 * bo'limni umuman ko'rsatmagan yaxshi.
 */
export function pickSimilar(
  source: SimilarCandidate,
  candidates: readonly SimilarCandidate[],
  limit: number,
): SimilarCandidate[] {
  const scored = candidates
    .filter((item) => item.id !== source.id && item.categorySlug === source.categorySlug)
    .map((item) => ({ item, score: similarityScore(source, item) }));

  /*
    Teng ballda tartib BARQAROR bo'lishi kerak: aks holda sahifa
    har yangilanganda ro'yxat o'zgarib, odam kechagi vakansiyani
    topa olmasdi.
  */
  scored.sort((a, b) => (b.score - a.score) || a.item.id.localeCompare(b.item.id));

  return scored.slice(0, limit).map((entry) => entry.item);
}

/** Bo'limda ko'rsatiladigan vakansiyalar soni. */
export const MAX_SIMILAR = 4;
