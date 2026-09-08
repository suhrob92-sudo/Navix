import { formatUzMonth } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { monthKey, previousMonth } from '@/modules/finance/finance.calc';
import { getMonthlyFinance } from '@/modules/finance/finance.service';
import type { AssistantReply } from '@/modules/assistant/assistant.types';
import type { MonthlyFinance } from '@/modules/finance/finance.types';

/**
 * "Navix, shu oyda qancha sarfladim" — yordamchining moliya oqimi.
 *
 * ── Nima uchun ALOHIDA fayl ───────────────────────────────────────────
 * `assistant.taxi-flow.ts` bilan bir xil sabab: `assistant.service.ts`
 * allaqachon uzun va har modulning o'z qoidalari bor.
 *
 * ── Bu yerda hech narsa HISOBLANMAYDI ─────────────────────────────────
 * Butun hisob `finance.service.ts` da, ya'ni ekran ko'rsatadigan
 * raqam bilan AYNAN BIR XIL manbadan keladi.
 *
 * Bu qoida muhim: agar yordamchi o'z hisobini yuritganda, u ekrandagi
 * raqamdan farq qilishi mumkin edi va odam qaysi biriga ishonishni
 * bilmasdi. Pul haqidagi ikkita "haqiqat" — eng yomon holat.
 */

/**
 * Javobda alohida aytiladigan eng katta toifa.
 *
 * Bittasi yetarli: "eng ko'p nimaga ketdi" degan savolga javob
 * BITTA nom. Uchtasini sanab chiqish ovozli javobda uzun bo'lardi
 * va odam oxirigacha eshitmasdi — batafsili ekranda.
 */
function topCategorySentence(finance: MonthlyFinance): string {
  const top = finance.categories[0];

  if (!top) return '';

  return ` Eng ko'pi — ${top.label}: ${formatTiyin(top.amountTiyin)} (${top.percent}%).`;
}

/**
 * O'tgan oy bilan solishtirish jumlasi.
 *
 * Bo'sh satr qaytishi mumkin: o'tgan oyda xarajat bo'lmagan bo'lsa,
 * foizni hisoblab bo'lmaydi va "cheksiz o'sish" deb aytish yolg'on
 * bo'lardi.
 */
function comparisonSentence(changePercent: number | null): string {
  if (changePercent === null) return '';
  if (changePercent === 0) return " O'tgan oy bilan bir xil.";

  const direction = changePercent > 0 ? "ko'p" : 'kam';

  return ` O'tgan oyga nisbatan ${Math.abs(changePercent)}% ${direction}.`;
}

export interface FinanceFlowParams {
  userId: string;
  /** Qaysi oy so'ralgan. */
  month: 'CURRENT' | 'PREVIOUS';
  /** Hozirgi vaqt — sinovda qat'iy sana berish uchun. */
  now?: Date;
}

/** Oylik hisobotni gap qilib aytadi. */
export async function handleFinanceReport({
  userId,
  month,
  now = new Date(),
}: FinanceFlowParams): Promise<AssistantReply> {
  const currentMonth = monthKey(now);
  const asked = month === 'PREVIOUS' ? previousMonth(currentMonth) : currentMonth;

  const summary = await getMonthlyFinance(userId, asked);
  const finance = summary.current;

  const label = formatUzMonth(asked);

  /*
    Amal bo'lmagan oy — XATO EMAS.

    "Ma'lumot topilmadi" deyish odamni ilova buzilgan deb
    o'ylatardi. Aslida javob oddiy: o'sha oyda hech narsa
    qilinmagan.
  */
  if (finance.transactionCount === 0) {
    return {
      text: `${label} da hali amal yo'q.`,
      suggestions: month === 'CURRENT' ? ["O'tgan oyda qancha sarfladim"] : ['Shu oyda qancha sarfladim'],
      action: { kind: 'navigate', href: '/finance', label: 'Moliya markazi' },
      state: { slots: {} },
    };
  }

  const text =
    `${label} da ${formatTiyin(finance.spentTiyin)} sarfladingiz.` +
    topCategorySentence(finance) +
    /*
      Solishtirish FAQAT joriy oy so'ralganda aytiladi.

      "O'tgan oyda 604 000 sarfladingiz. O'tgan oyga nisbatan 20%
      kam" — bu gap o'zini o'zi inkor qiladi: qaysi "o'tgan oy"
      haqida gap ketyapti? Chalkashlikdan ko'ra jimlik yaxshi.
    */
    (month === 'CURRENT' ? comparisonSentence(summary.changePercent) : '');

  return {
    text,
    suggestions:
      month === 'CURRENT'
        ? ["O'tgan oyda qancha sarfladim", 'Balansim qancha']
        : ['Shu oyda qancha sarfladim', 'Balansim qancha'],
    action: { kind: 'navigate', href: '/finance', label: "Batafsil ko'rish" },
    state: { slots: {} },
  };
}
