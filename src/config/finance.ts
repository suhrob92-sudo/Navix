/**
 * Moliya markazi — modul nomlari va rang shkalasi.
 *
 * ── Nima uchun `APP_MODULES` dan olinmaydi ────────────────────────────
 * Tranzaksiyadagi `sourceModule` va modullar reyestridagi `id` HAR
 * DOIM mos kelmaydi:
 *
 *   sourceModule   reyestrdagi id
 *   'payments'  →  'payments' (bor)
 *   'jobs'      →  'jobs'     (bor)
 *   'parcel'    →  YO'Q — u 'delivery' modulining ichida
 *   'seller'    →  YO'Q — u 'market' ning kabineti
 *   'auth'      →  YO'Q — bu modul emas, tizim qismi
 *
 * Ya'ni reyestrga tayansak, ba'zi xarajatlar "noma'lum" bo'lib
 * qolardi. Bu yerdagi ro'yxat esa TRANZAKSIYA tomonidan yozilgan
 * qiymatlarga to'g'ridan-to'g'ri javob beradi.
 *
 * ── Rang shkalasi nima uchun bu yerda ─────────────────────────────────
 * Diagramma va ro'yxat BIR XIL rangni ishlatishi kerak: odam
 * diagrammadagi ustunni ro'yxatdagi qator bilan rang orqali
 * bog'laydi. Ikki joyda alohida hisoblansa, ular ertaga ajralib
 * qolardi.
 */

/** Ekranda ko'rsatiladigan modul. */
export interface FinanceCategory {
  /** Tranzaksiyadagi `sourceModule` qiymati. */
  code: string;
  label: string;
}

/**
 * Xarajat toifalari.
 *
 * ── Nima uchun bu yerda RANG YO'Q ─────────────────────────────────────
 * Birinchi urinishda har bir toifaga o'z rangi berilgandi. Bu
 * KATEGORIK bo'yash — u seriyalarni bir-biridan farqlash uchun
 * ishlatiladi.
 *
 * Lekin bu ekranda o'quvchining vazifasi boshqa: "qaysi toifaga
 * ko'p ketdi?" — ya'ni KATTALIKNI solishtirish. Bunday holatda
 * to'g'ri yechim bitta rangli ketma-ket shkala: ko'proq — to'qroq.
 *
 * Ustiga, kategorik palitra tekshiruvdan o'tmadi: o'n to'rtta
 * toifadan istalgan beshtasi chiqishi mumkin va ba'zi juftliklar
 * rang ko'rligida ajratib bo'lmas darajada yaqin edi
 * (deutan ΔE 6.1, me'yor 8).
 *
 * Ketma-ket shkalada bunday muammo umuman yo'q va har bir ustun
 * baribir o'z YORLIG'I bilan turadi — ma'no rangda emas.
 */
export const FINANCE_CATEGORIES: readonly FinanceCategory[] = [
  { code: 'food', label: 'Ovqat' },
  { code: 'market', label: 'Marketplace' },
  { code: 'taxi', label: 'Taksi' },
  { code: 'delivery', label: 'Yetkazib berish' },
  { code: 'parcel', label: 'Posilka' },
  { code: 'hotel', label: 'Mehmonxona' },
  { code: 'travel', label: 'Sayohat' },
  { code: 'payments', label: "Kommunal to'lovlar" },
  { code: 'wallet', label: "Pul o'tkazmalari" },
  { code: 'jobs', label: 'Ish qidirish' },
  { code: 'live', label: 'Jonli efir' },
  { code: 'feed', label: 'Lenta' },
  { code: 'collab', label: 'Hamkorlik' },
  { code: 'call', label: "Qo'ng'iroqlar" },
] as const;

/**
 * Ro'yxatda yo'q modul uchun zaxira.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Ertaga yangi modul qo'shilib, bu ro'yxatga yozilmasligi mumkin.
 * O'shanda uning xarajati YO'QOLIB qolmasligi kerak: jami summa
 * bo'laklar yig'indisiga teng bo'lmay qolardi va odam buni
 * darhol sezardi.
 */
export const OTHER_CATEGORY: FinanceCategory = { code: 'other', label: 'Boshqa' };

/**
 * Ustun rangi — KATTALIKKA qarab.
 *
 * ── Nima uchun CSS o'zgaruvchisi ──────────────────────────────────────
 * Diagramma SVG chizadi va unda rang qiymat sifatida beriladi.
 * Agar rang JavaScript'da tanlansa, mavzu almashtirilganda
 * diagramma eski rangda qolib ketardi — uni qayta chizish kerak
 * bo'lardi.
 *
 * `var(--...)` esa SVG `fill` da ham ishlaydi va mavzu bilan
 * O'ZI o'zgaradi: qorong'i rejimda shkala teskari yo'nalishda
 * (ko'proq — YORUGROQ), chunki fon to'q.
 *
 * ── Nima uchun besh qadam ─────────────────────────────────────────────
 * Ekranda ko'pi bilan olti ustun bo'ladi. Undan ko'p qadam
 * qo'shni ustunlarni bir-biridan ajratmay qo'yardi.
 */
const RAMP_STEPS = 5;

/**
 * Summaga mos rang beradi.
 *
 * @param amount Shu toifaning summasi.
 * @param max Eng katta toifaning summasi.
 */
export function rampColor(amount: number, max: number): string {
  if (max <= 0) return 'var(--finance-1)';

  /*
    Nisbat bo'yicha qadam: eng kattasi eng to'q qadamni oladi.

    TARTIB bo'yicha emas, SUMMA bo'yicha — shunda ikkita yaqin
    toifa bir xil rangda chiqadi va bu to'g'ri: ular haqiqatan
    ham teng.
  */
  const ratio = amount / max;
  const step = Math.max(1, Math.ceil(ratio * RAMP_STEPS));

  return `var(--finance-${step})`;
}

const BY_CODE = new Map(FINANCE_CATEGORIES.map((item) => [item.code, item]));

/** Modul kodidan toifani topadi. Topilmasa — "Boshqa". */
export function financeCategory(code: string): FinanceCategory {
  return BY_CODE.get(code) ?? { ...OTHER_CATEGORY, code };
}

/**
 * Diagrammada alohida ko'rsatiladigan eng ko'p toifa.
 *
 * ── Nima uchun chegara bor ────────────────────────────────────────────
 * O'n to'rtta ustun telefon ekraniga sig'maydi: har biri 40
 * pikseldan bo'lsa ham 560 piksel kerak bo'lardi va odam
 * diagrammani ko'rish uchun varaqlashga majbur bo'lardi —
 * solishtirish esa BIR QARASHDA bo'lishi kerak.
 *
 * Beshta katta toifa + "Boshqa" — o'qiladigan eng katta miqdor.
 */
export const MAX_CHART_SLICES = 5;

/**
 * Necha oy orqaga qarash mumkin.
 *
 * ── Nima uchun chegara bor ────────────────────────────────────────────
 * Chegarasiz tugma odamni HECH QACHON to'xtamaydigan yo'lga
 * boshlaydi: u 2019-yilga qadar bosib borishi mumkin va har
 * bosishda bo'sh ekran ko'radi. "Ma'lumot yo'q" degan javob esa
 * xatoga o'xshaydi.
 *
 * O'n ikki oy — hisobot uchun ma'noli eng uzoq muddat: undan
 * narisi endi tahlil emas, arxiv.
 */
export const FINANCE_MONTHS_BACK = 12;
