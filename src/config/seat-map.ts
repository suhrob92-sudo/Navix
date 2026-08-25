import type { TransportName } from '@/config/travel';

/**
 * O'rindiq xaritasi — yagona sozlama.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Chipta olishda faqat "nechta o'rin" so'ralardi. Odam esa qaysi
 * o'rinni olayotganini bilmasdi va uni jo'nash kuni, avtobusga
 * chiqqanda bilardi.
 *
 * Ikki kishi birga ketayotgan bo'lsa, ular yonma-yon o'tirishni
 * xohlaydi. Deraza yonini yoqtiradigan odam bor. Bularning hech
 * biri iloji yo'q edi.
 *
 * ── Nima uchun transport turiga qarab BOSHQACHA ───────────────────────
 * Samolyotda o'rin "12A" ko'rinishida beriladi va bu butun dunyoda
 * shunday. Avtobus va poyezdda esa O'zbekistonda oddiy raqam
 * ishlatiladi: "24-o'rin".
 *
 * Bitta ko'rinishga keltirish kodni soddalashtirardi, lekin
 * chiptadagi raqam odam ko'nikkan ko'rinishdan farq qilardi va
 * u nazoratchiga boshqa narsa aytardi.
 */

/** O'rindiqlarni qanday raqamlash. */
export type SeatStyle = 'LETTER' | 'NUMBER';

export interface SeatLayout {
  /** Bitta qatordagi o'rinlar soni. */
  perRow: number;
  /** Shuncha o'rindan keyin YO'LAK bo'ladi. */
  aisleAfter: number;
  style: SeatStyle;
}

/**
 * Har bir transport uchun joylashuv.
 *
 * ── Nima uchun POYEZD ham 2+2 ─────────────────────────────────────────
 * Haqiqiy poyezdda kupe va plaskart joylashuvi murakkabroq: yuqori
 * va pastki javonlar, yon o'rinlar.
 *
 * Uni to'liq chizish uchun har bir vagon turining sxemasi kerak
 * bo'lardi va bizda bunday ma'lumot YO'Q. Soxta sxema chizish esa
 * yolg'on bo'lardi — odam "pastki javon" deb tanlagan o'rin
 * aslida yuqorida chiqishi mumkin.
 *
 * Shuning uchun oddiy raqamli to'r ishlatiladi va u chiptadagi
 * o'rin raqamiga to'g'ri keladi. Tashuvchi bilan shartnoma
 * tuzilganda, uning haqiqiy sxemasi shu yerga qo'shiladi.
 */
export const SEAT_LAYOUTS: Record<TransportName, SeatLayout> = {
  PLANE: { perRow: 6, aisleAfter: 3, style: 'LETTER' },
  BUS: { perRow: 4, aisleAfter: 2, style: 'NUMBER' },
  TRAIN: { perRow: 4, aisleAfter: 2, style: 'NUMBER' },
};

/** Samolyotdagi o'rin harflari. */
const SEAT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

/** Xaritadagi bitta o'rin. */
export interface Seat {
  /** Chiptada ko'rinadigan raqam: "12A" yoki "24". */
  number: string;
  /** Shu o'rindan keyin yo'lak bormi. */
  aisleAfter: boolean;
}

export interface SeatRow {
  /** Qator raqami — 1 dan boshlanadi. */
  index: number;
  seats: Seat[];
}

/**
 * O'rindiqlar xaritasini yasaydi.
 *
 * ── Nima uchun oxirgi qator TO'LIQ bo'lmasligi mumkin ─────────────────
 * Reysdagi o'rinlar soni har doim ham qatorga bo'linmaydi (masalan
 * 50 o'rinli avtobus, qatorda 4 tadan). Oxirgi qatorni to'ldirib
 * qo'yish mumkin edi, lekin o'shanda mavjud bo'lmagan o'rin
 * ko'rsatilardi va uni tanlagan odam avtobusda joy topa olmasdi.
 */
export function buildSeatMap(transport: TransportName, totalSeats: number): SeatRow[] {
  const layout = SEAT_LAYOUTS[transport];

  if (!Number.isInteger(totalSeats) || totalSeats <= 0) return [];

  const rows: SeatRow[] = [];
  let placed = 0;
  let rowIndex = 1;

  while (placed < totalSeats) {
    const seats: Seat[] = [];
    const inThisRow = Math.min(layout.perRow, totalSeats - placed);

    for (let column = 0; column < inThisRow; column += 1) {
      seats.push({
        number:
          layout.style === 'LETTER'
            ? `${rowIndex}${SEAT_LETTERS[column] ?? String(column + 1)}`
            : String(placed + column + 1),
        /*
          Yo'lak oxirgi o'rindan keyin CHIZILMAYDI: u qator
          chetida bo'lardi va bo'sh joyni bekorga egallardi.
        */
        aisleAfter: column + 1 === layout.aisleAfter && column + 1 < inThisRow,
      });
    }

    rows.push({ index: rowIndex, seats });

    placed += inThisRow;
    rowIndex += 1;
  }

  return rows;
}

/** Xaritadagi barcha o'rin raqamlari — tekshiruv uchun. */
export function allSeatNumbers(rows: readonly SeatRow[]): string[] {
  return rows.flatMap((row) => row.seats.map((seat) => seat.number));
}

/**
 * Tanlovni almashtiradi: bor bo'lsa olib tashlaydi, yo'q bo'lsa qo'shadi.
 *
 * Chegaradan oshib ketmaydi. Olib tashlash esa HAR DOIM ishlaydi —
 * aks holda chegaraga yetgan odam tanlovini o'zgartira olmasdi.
 */
export function toggleSeat(selected: readonly string[], seatNumber: string, maxSeats: number): string[] {
  if (selected.includes(seatNumber)) return selected.filter((item) => item !== seatNumber);

  if (selected.length >= maxSeats) return [...selected];

  return [...selected, seatNumber];
}

/**
 * Tanlangan o'rinlarni CHIPTADAGI tartibda beradi.
 *
 * ── Nima uchun tartib muhim ───────────────────────────────────────────
 * Odam "12C, 12A, 12B" tartibida bosishi mumkin. Chiptada esa
 * "12A, 12B, 12C" turishi kerak — aks holda nazoratchi ham,
 * yo'lovchining o'zi ham ularni solishtirishga vaqt sarflaydi.
 *
 * Saralash o'rin RAQAMI bo'yicha emas, XARITADAGI o'rni bo'yicha:
 * "10A" bilan "9A" ni matn sifatida solishtirsak, "10A" oldinga
 * chiqib ketardi.
 */
export function sortSeats(selected: readonly string[], rows: readonly SeatRow[]): string[] {
  const order = new Map(allSeatNumbers(rows).map((number, index) => [number, index]));

  return [...selected].sort(
    (a, b) => (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER),
  );
}

/**
 * Xaritada ko'rsatib bo'lmaydigan band o'rinlar soni.
 *
 * ── Nima uchun bunday holat bor ───────────────────────────────────────
 * O'rin tanlash 51-bosqichda qo'shildi. Undan oldin sotilgan
 * chiptalarda faqat SONI yozilgan — qaysi o'rin ekani hech qayerda
 * saqlanmagan va uni tiklashning iloji yo'q.
 *
 * Bunday o'rinlarni xaritada bo'sh deb ko'rsatish YOLG'ON bo'lardi.
 * Tasodifiy o'rinlarni band qilib qo'yish ham yolg'on — odam
 * aslida bo'sh o'rinni tanlay olmay qolardi.
 *
 * Shuning uchun ular ALOHIDA aytiladi: "yana N ta o'rin band,
 * lekin qaysi biri ekani ma'lum emas".
 *
 * @param soldSeats Sotilgan o'rinlarning umumiy soni.
 * @param knownSeats Xaritada raqami ma'lum bo'lgan band o'rinlar.
 */
export function unknownTakenSeats(soldSeats: number, knownSeats: number): number {
  return Math.max(0, soldSeats - knownSeats);
}
