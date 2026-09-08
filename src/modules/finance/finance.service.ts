import { TransactionStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { tiyinToNumber } from '@/lib/money';
import { getOrCreateWallet } from '@/modules/wallet/wallet.service';
import {
  changePercent,
  monthRange,
  previousMonth,
  summarizeMonth,
  type FinanceRow,
} from '@/modules/finance/finance.calc';
import type { FinanceComparison } from '@/modules/finance/finance.types';

/**
 * Moliya markazi — hisobot xizmati.
 *
 * ── Nima uchun yangi jadval YO'Q ──────────────────────────────────────
 * Xarajat tahlili uchun kerak bo'lgan hamma narsa hamyon
 * tranzaksiyalarida allaqachon bor: summa, yo'nalish, qaysi modul va
 * qachon.
 *
 * Alohida "xarajatlar" jadvali yasash mumkin edi va u so'rovni
 * tezlashtirardi. Lekin u IKKINCHI HAQIQAT bo'lardi: pul harakati
 * hamyonda, hisobot esa boshqa joyda. Ular ertaga bir-biriga mos
 * kelmay qolardi va qaysi biri to'g'ri ekanini aniqlash imkonsiz
 * bo'lardi.
 *
 * ── Nima uchun tez ishlaydi ───────────────────────────────────────────
 * `(walletId, createdAt)` indeksi allaqachon bor, ya'ni bir oylik
 * so'rov butun jadvalni o'qimaydi. Bir odamning oylik amallari
 * o'nlab-yuzlab — ularni dasturda guruhlash bir necha
 * millisekund.
 *
 * `groupBy` bilan bazada guruhlash ham mumkin edi, lekin o'shanda
 * qaytarilgan pulni ajratish uchun IKKINCHI so'rov kerak bo'lardi
 * va hisob mantiqi ikki joyga bo'linardi.
 */

/**
 * FAQAT yakunlangan amallar hisobga olinadi.
 *
 * Kutayotgan yoki bekor bo'lgan tranzaksiya hali pul emas. Uni
 * hisobga olsak, odam sarflamagan pulni "sarflandi" deb ko'rardi.
 */
const COUNTED = TransactionStatus.COMPLETED;

/** Bir oylik tranzaksiyalarni o'qiydi. */
async function loadMonth(walletId: string, month: string): Promise<FinanceRow[]> {
  const { start, end } = monthRange(month);

  const rows = await prisma.walletTransaction.findMany({
    where: {
      walletId,
      status: COUNTED,
      /* Boshlanish KIRADI, tugash KIRMAYDI — oylar ustma-ust tushmasin. */
      createdAt: { gte: start, lt: end },
    },
    select: { direction: true, type: true, sourceModule: true, amount: true },
  });

  return rows.map((row) => ({
    direction: row.direction,
    type: row.type,
    sourceModule: row.sourceModule,
    amountTiyin: tiyinToNumber(row.amount),
  }));
}

/**
 * Oylik hisobot va o'tgan oy bilan solishtirish.
 *
 * ── Nima uchun O'TGAN oy ham o'qiladi ─────────────────────────────────
 * "Bu oyda 450 000 so'm sarfladingiz" degan raqam yolg'iz o'zi
 * hech narsa aytmaydi: bu ko'pmi yoki kammi?
 *
 * "O'tgan oyga nisbatan 20% kam" esa darhol ma'no beradi va odam
 * shu bitta jumladan xulosa chiqaradi.
 */
export async function getMonthlyFinance(userId: string, month: string): Promise<FinanceComparison> {
  const wallet = await getOrCreateWallet(userId);

  /*
    Ikkala oy BIR VAQTDA so'raladi.

    Ketma-ket so'ralsa, ekran ochilishi ikki barobar kutardi —
    ikkinchi so'rov birinchisini kutib turishining sababi yo'q.
  */
  const [currentRows, previousRows] = await Promise.all([
    loadMonth(wallet.id, month),
    loadMonth(wallet.id, previousMonth(month)),
  ]);

  const current = summarizeMonth(month, currentRows);
  const previous = summarizeMonth(previousMonth(month), previousRows);

  return {
    current,
    previous,
    /*
      Solishtirish SOF xarajat bo'yicha.

      Yalpi chiqim bo'yicha solishtirsak, bekor qilingan katta
      buyurtma oyni "qimmat" qilib ko'rsatardi — holbuki pul
      qaytgan.
    */
    changePercent: changePercent(current.netTiyin, previous.netTiyin),
  };
}
