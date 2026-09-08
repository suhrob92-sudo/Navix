/**
 * Moliya markazi — brauzer tomonidagi turlar.
 *
 * Barcha summalar TIYINDA va oddiy son (`number`): `BigInt` JSON ga
 * o'girilmaydi. Hamyon modulida ham xuddi shunday.
 */

/** Bitta toifa bo'yicha xarajat. */
export interface SpendingSlice {
  /** Tranzaksiyadagi `sourceModule`. */
  code: string;
  label: string;
  color: string;
  /** Shu toifaga ketgan summa — TIYINDA. */
  amountTiyin: number;
  /** Umumiy xarajatdagi ulush — FOIZDA, bir xonagacha. */
  percent: number;
  /** Nechta amal — "3 ta buyurtma" deb ko'rsatish uchun. */
  count: number;
}

/**
 * Bir oylik moliyaviy hisobot.
 *
 * ── Nima uchun XARAJAT va QAYTARILGAN alohida ─────────────────────────
 * Bekor qilingan buyurtmaning puli qaytariladi. Uni to'g'ridan-to'g'ri
 * toifadan ayirish mumkin edi, lekin bunda IKKI muammo chiqadi:
 *
 *  1. Qaytarish tranzaksiyasi BOSHQA modul nomi bilan yozilishi
 *     mumkin (xarid `market`, qaytarish `seller`) — o'shanda bir
 *     toifa manfiy, boshqasi shishib ketardi;
 *  2. Xarid yanvarda, qaytarish fevralda bo'lsa — fevral manfiy
 *     chiqardi.
 *
 * Shuning uchun toifalar YALPI chiqimni ko'rsatadi, qaytarilgan pul
 * esa alohida qatorda turadi. Sof xarajat ikkalasining farqi.
 */
export interface MonthlyFinance {
  /** Oy — `YYYY-MM`. */
  month: string;

  /** Hamyondan chiqqan jami summa — TIYINDA. */
  spentTiyin: number;
  /** Qaytarilgan summa — TIYINDA. */
  refundedTiyin: number;
  /** Sof xarajat: chiqim minus qaytarilgan. Noldan kichik bo'lmaydi. */
  netTiyin: number;

  /**
   * Hamyonga tushgan summa — TIYINDA.
   *
   * To'ldirish, daromad, bonus va kelgan o'tkazmalar. Qaytarilgan
   * pul BU YERGA KIRMAYDI: u tushum emas, o'z pulingizning
   * qaytishi.
   */
  receivedTiyin: number;

  /** Toifalar bo'yicha taqsimot — kattadan kichikka. */
  categories: SpendingSlice[];

  /** Jami amallar soni. */
  transactionCount: number;
}

/** Ikki oyni solishtirish. */
export interface FinanceComparison {
  current: MonthlyFinance;
  /** O'tgan oy. Ma'lumot bo'lmasa ham obyekt qaytadi (nollar bilan). */
  previous: MonthlyFinance;
  /**
   * O'tgan oyga nisbatan o'zgarish — FOIZDA.
   *
   * `null` — o'tgan oyda xarajat bo'lmagan. Bunday holatda foiz
   * hisoblab bo'lmaydi (nolga bo'lish) va uni "cheksiz o'sish" deb
   * ko'rsatish yolg'on bo'lardi.
   */
  changePercent: number | null;
}

export interface FinanceSummaryResponse {
  summary: FinanceComparison;
}
