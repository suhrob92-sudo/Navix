import { MAX_CHART_SLICES, OTHER_CATEGORY, financeCategory } from '@/config/finance';
import type { MonthlyFinance, SpendingSlice } from '@/modules/finance/finance.types';

/**
 * Moliyaviy hisob-kitob — SOF funksiyalar.
 *
 * ── Nima uchun bazadan AJRATILGAN ─────────────────────────────────────
 * `taxi.pricing.ts` bilan bir xil sabab: bu yerda pul sanaladi va
 * bu yerdagi xato HAR OYDA takrorlanadi. Ustiga, xatoni sezish
 * qiyin: 18 660 o'rniga 18 000 chiqsa, hech kim darrov bilmaydi.
 *
 * Bazaga tegmagani uchun har bir chegara holatini sinov bilan
 * qoplash mumkin.
 */

/** Hisob-kitobga kiradigan bitta tranzaksiya. */
export interface FinanceRow {
  /** `IN` yoki `OUT`. */
  direction: 'IN' | 'OUT';
  type: string;
  sourceModule: string;
  /** Summa TIYINDA, musbat. */
  amountTiyin: number;
}

/**
 * Oy nomini `YYYY-MM` ko'rinishida beradi.
 *
 * ── Nima uchun UTC ────────────────────────────────────────────────────
 * Server va foydalanuvchi turli mintaqada bo'lishi mumkin. Mahalliy
 * vaqt ishlatilsa, oyning birinchi kunidagi tranzaksiya server
 * uchun o'tgan oyga tushib qolardi.
 *
 * Butun ilovada sana UTC da saqlanadi, shuning uchun hisob ham
 * UTC da.
 */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Oyning boshlanishi va tugashi — UTC. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [year, index] = month.split('-').map(Number);

  const start = new Date(Date.UTC(year, index - 1, 1));
  /* Keyingi oyning birinchi kuni — chegara SIG'MAYDIGAN qilib olinadi. */
  const end = new Date(Date.UTC(year, index, 1));

  return { start, end };
}

/** Oldingi oy: `2026-01` → `2025-12`. */
export function previousMonth(month: string): string {
  const [year, index] = month.split('-').map(Number);

  return index === 1
    ? `${year - 1}-12`
    : `${year}-${String(index - 1).padStart(2, '0')}`;
}

/** Oy yozuvi to'g'ri shakldami. */
export function isValidMonth(month: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(month)) return false;

  const index = Number(month.slice(5));

  return index >= 1 && index <= 12;
}

/**
 * Qaytarilgan pul TUSHUM emas.
 *
 * ── Nima uchun bu muhim ───────────────────────────────────────────────
 * Bekor qilingan taksining puli hamyonga qaytadi. Uni "tushum" deb
 * sanasak, odam ishlamagan pulni daromad deb ko'rardi va oylik
 * hisobot yolg'on chiqardi.
 */
const REFUND_TYPE = 'REFUND';

export function summarizeMonth(month: string, rows: readonly FinanceRow[]): MonthlyFinance {
  let spentTiyin = 0;
  let refundedTiyin = 0;
  let receivedTiyin = 0;

  /** Modul kodi → [summa, amallar soni]. */
  const byModule = new Map<string, { amount: number; count: number }>();

  for (const row of rows) {
    if (row.direction === 'OUT') {
      spentTiyin += row.amountTiyin;

      const current = byModule.get(row.sourceModule) ?? { amount: 0, count: 0 };

      byModule.set(row.sourceModule, {
        amount: current.amount + row.amountTiyin,
        count: current.count + 1,
      });

      continue;
    }

    if (row.type === REFUND_TYPE) {
      refundedTiyin += row.amountTiyin;

      continue;
    }

    receivedTiyin += row.amountTiyin;
  }

  /*
    Sof xarajat noldan kichik BO'LMAYDI.

    O'tgan oydagi xariddan qaytgan pul bu oyda ko'p bo'lishi mumkin
    va o'shanda ayirma manfiy chiqardi. "Bu oyda -50 000 so'm
    sarfladingiz" degan yozuv hech qanday ma'no bermaydi.
  */
  const netTiyin = Math.max(0, spentTiyin - refundedTiyin);

  return {
    month,
    spentTiyin,
    refundedTiyin,
    netTiyin,
    receivedTiyin,
    categories: toSlices(byModule, spentTiyin),
    transactionCount: rows.length,
  };
}

/**
 * Modullarni diagramma bo'laklariga aylantiradi.
 *
 * ── Nima uchun kichiklari BIRLASHTIRILADI ─────────────────────────────
 * O'n to'rtta ustun telefon ekraniga sig'maydi va odam ularni bir
 * qarashda solishtira olmaydi — varaqlashga majbur bo'ladi.
 *
 * Beshtasi alohida, qolgani "Boshqa" — jami baribir to'g'ri qoladi.
 */
function toSlices(
  byModule: Map<string, { amount: number; count: number }>,
  total: number,
): SpendingSlice[] {
  const all = [...byModule.entries()]
    .map(([code, value]) => {
      const category = financeCategory(code);

      return {
        code,
        label: category.label,
        amountTiyin: value.amount,
        count: value.count,
        percent: 0,
      };
    })
    /* Kattadan kichikka: eng katta xarajat birinchi ko'rinadi. */
    .sort((left, right) => right.amountTiyin - left.amountTiyin);

  const top = all.slice(0, MAX_CHART_SLICES);
  const rest = all.slice(MAX_CHART_SLICES);

  if (rest.length > 0) {
    top.push({
      ...OTHER_CATEGORY,
      amountTiyin: rest.reduce((sum, item) => sum + item.amountTiyin, 0),
      count: rest.reduce((sum, item) => sum + item.count, 0),
      percent: 0,
    });
  }

  /*
    Foiz OXIRIDA hisoblanadi.

    Avval hisoblansa, "Boshqa" bo'lagi uchun uni qayta yig'ish
    kerak bo'lardi va yaxlitlash xatosi to'planardi.
  */
  return top.map((slice) => ({
    ...slice,
    percent: total === 0 ? 0 : Math.round((slice.amountTiyin / total) * 1000) / 10,
  }));
}

/**
 * Ikki oy orasidagi o'zgarish — FOIZDA.
 *
 * `null` — o'tgan oyda xarajat bo'lmagan. Nolga bo'lib bo'lmaydi va
 * "cheksiz o'sish" deb ko'rsatish yolg'on bo'lardi.
 */
export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;

  return Math.round(((current - previous) / previous) * 1000) / 10;
}
