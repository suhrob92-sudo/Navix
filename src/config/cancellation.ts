/**
 * Bandlovni bekor qilish shartlari — yagona sozlama.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Hozirgacha bekor qilishda pul HAR DOIM to'liq qaytardi: kirish
 * kunidan bir kun oldin bekor qilingan bandlov ham, bir oy oldin
 * bekor qilingani ham bir xil edi.
 *
 * Mehmon uchun bu qulay, mehmonxona uchun esa halokatli: kechqurun
 * bekor qilingan xonani boshqa hech kim band qilmaydi va u bo'sh
 * qoladi. Bir necha shunday holatdan keyin mehmonxona
 * platformadan ketadi.
 *
 * ── Nima uchun shartlar OLDINDAN ko'rsatiladi ─────────────────────────
 * Shartni faqat bekor qilish paytida aytish — aldash. Odam pulini
 * to'lagandan keyin "aslida yarmi qaytadi" degan xabarni ko'rsa,
 * u haqli ravishda g'azablanadi.
 *
 * Shuning uchun jadval bandlov oynasida, TO'LOVDAN OLDIN turadi.
 *
 * ── Nima uchun bosqichli, bitta qoida emas ────────────────────────────
 * "Har doim 50%" sodda bo'lardi, lekin adolatsiz: bir oy oldin
 * bekor qilgan odam mehmonxonaga hech qanday zarar yetkazmaydi —
 * xona yana o'ttiz kun sotuvda turadi.
 *
 * Zarar KIRISH KUNI yaqinlashgani sari o'sadi, shuning uchun
 * ushlab qolinadigan ulush ham shunga qarab o'sadi.
 */

/**
 * Shuncha kun (yoki undan ko'p) qolgan bo'lsa — pul TO'LIQ qaytadi.
 *
 * Uch kun — mehmonxona xonani qayta sotishi uchun yetarli muddat.
 */
export const FREE_CANCEL_DAYS = 3;

/**
 * Kirish kuniga yaqin bekor qilishda qaytariladigan ULUSH — foizda.
 *
 * ── Nima uchun 50, 0 emas ─────────────────────────────────────────────
 * Nol qaytarish mehmonxonani to'liq himoya qilardi, lekin odamni
 * BEKOR QILMASLIKKA undardi: "baribir pul ketdi, boraman" degan
 * fikr xavfli (kasal odam yo'lga chiqadi) va mehmonxonaga ham
 * foydasi yo'q.
 *
 * Yarmini qaytarish esa ikkalasiga ham ma'qul: mehmon ogohlantiradi,
 * mehmonxona esa xonani qayta sotishga urinib ko'radi.
 */
export const LATE_CANCEL_REFUND_PERCENT = 50;

/** Bekor qilish darajasi. */
export type CancellationTier = 'FREE' | 'PARTIAL' | 'BLOCKED';

export interface CancellationTerms {
  tier: CancellationTier;
  /** Qaytariladigan ulush — FOIZDA. */
  refundPercent: number;
  /** Odam o'qiydigan qisqa matn. */
  text: string;
}

/**
 * Ikki sana orasidagi KUNLAR farqi.
 *
 * ── Nima uchun sana KALITI (satr) bilan ishlanadi ─────────────────────
 * `2026-08-07` ko'rinishidagi kalitlar vaqt zonasidan mustaqil.
 * `Date` obyektlari bilan ishlansa, Toshkent (UTC+5) da yarim
 * tundan keyingi hisob bir kunga surilib ketardi — ya'ni odam
 * bepul bekor qilish huquqini yarim tunda yo'qotardi.
 *
 * @returns Manfiy son — kirish kuni allaqachon o'tgan.
 */
export function daysUntil(dateKey: string, todayKey: string): number {
  const target = Date.parse(`${dateKey}T00:00:00Z`);
  const today = Date.parse(`${todayKey}T00:00:00Z`);

  if (Number.isNaN(target) || Number.isNaN(today)) return 0;

  return Math.round((target - today) / 86_400_000);
}

/**
 * Shu kunga qaysi shart qo'llanadi.
 *
 * @param checkInKey Kirish sanasi — `2026-08-07`.
 * @param todayKey Bugungi sana — Toshkent vaqtida.
 */
export function cancellationTerms(checkInKey: string, todayKey: string): CancellationTerms {
  const days = daysUntil(checkInKey, todayKey);

  /*
    Kirish kuni yoki undan keyin — bekor qilib bo'lmaydi.

    Bu qoida 49-bosqichgacha ham bor edi va o'zgarmaydi: mehmon
    kelmasa ham xona u uchun ushlab turilgan.
  */
  if (days <= 0) {
    return {
      tier: 'BLOCKED',
      refundPercent: 0,
      text: "Kirish kuni boshlangan — bekor qilib bo'lmaydi. Mehmonxona bilan bog'laning.",
    };
  }

  if (days >= FREE_CANCEL_DAYS) {
    return {
      tier: 'FREE',
      refundPercent: 100,
      text: "Bepul bekor qilish — pul to'liq qaytadi.",
    };
  }

  return {
    tier: 'PARTIAL',
    refundPercent: LATE_CANCEL_REFUND_PERCENT,
    text: `Kirishga ${days} kun qoldi — ${LATE_CANCEL_REFUND_PERCENT}% qaytadi.`,
  };
}

/**
 * Qaytariladigan summa — TIYINDA.
 *
 * ── Nima uchun PASTGA yaxlitlanadi ────────────────────────────────────
 * Kasr tiyin degan narsa yo'q. Yuqoriga yaxlitlansa, har bir
 * bekor qilishda platforma bir tiyindan zarar ko'rardi — o'zi
 * kichik, lekin bu "yo'qdan pul paydo bo'lishi" demak va hisob
 * kitob buziladi.
 *
 * Pastga yaxlitlashda esa qoldiq (eng ko'pi bir tiyin) mehmonxonada
 * qoladi va hisob har doim to'g'ri yig'iladi.
 */
export function refundAmount(totalTiyin: bigint, refundPercent: number): bigint {
  if (refundPercent <= 0) return 0n;
  if (refundPercent >= 100) return totalTiyin;

  return (totalTiyin * BigInt(Math.trunc(refundPercent))) / 100n;
}

/** Jadvaldagi bitta qator — bandlovdan OLDIN ko'rsatiladi. */
export interface PolicyRow {
  /** "3 kun va undan oldin" kabi matn. */
  when: string;
  /** "To'liq qaytadi" kabi matn. */
  refund: string;
  tier: CancellationTier;
}

/**
 * To'liq jadval — to'lovdan oldin ko'rsatish uchun.
 *
 * Uchta qator ataylab: ko'proq bosqich aniqroq bo'lardi, lekin
 * odam uni o'qimasdan o'tib ketardi. Uchtasini bir qarashda
 * tushunish mumkin.
 */
export function cancellationPolicyRows(): PolicyRow[] {
  return [
    {
      when: `Kirishga ${FREE_CANCEL_DAYS} kun va undan ko'p qolganda`,
      refund: "Pul to'liq qaytadi",
      tier: 'FREE',
    },
    {
      when: `Kirishga 1–${FREE_CANCEL_DAYS - 1} kun qolganda`,
      refund: `${LATE_CANCEL_REFUND_PERCENT}% qaytadi`,
      tier: 'PARTIAL',
    },
    {
      when: 'Kirish kuni va undan keyin',
      refund: "Bekor qilib bo'lmaydi",
      tier: 'BLOCKED',
    },
  ];
}
