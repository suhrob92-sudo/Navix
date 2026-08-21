/**
 * Sanani o'zbekcha ko'rinishda chiqarish.
 *
 * ── Nima uchun `Intl.DateTimeFormat` EMAS ─────────────────────────────
 * `uz-UZ` uchun oy nomlari muhitga qarab butunlay boshqacha chiqadi:
 *
 *     Node (server)      : "3-avgust, 2026"
 *     Chromium (brauzer) : "2026 M08 3"
 *
 * Ikkinchisi foydalanuvchi uchun umuman tushunarsiz. Bundan tashqari
 * server va brauzer boshqacha matn chizsa React "hydration mismatch"
 * xatosini beradi.
 *
 * Shuning uchun oy nomlari qo'lda yozilgan — natija hamma joyda bir xil.
 *
 * ── Nima uchun Toshkent vaqti ─────────────────────────────────────────
 * Sana foydalanuvchi qurilmasining vaqt mintaqasiga qarab hisoblansa,
 * chet eldagi telefon boshqa kunni ko'rsatardi va server bilan mos
 * kelmasdi. Navix — Markaziy Osiyo uchun, shuning uchun vaqt DOIM
 * Toshkent bo'yicha ko'rsatiladi (UZT, UTC+5, yozgi vaqt yo'q).
 */

/** O'zbekistonning UTC dan farqi, minutlarda. Yozgi vaqtga o'tilmaydi. */
const TASHKENT_OFFSET_MINUTES = 5 * 60;

const MONTHS_LONG = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
] as const;

const MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'] as const;

/**
 * Sanani Toshkent vaqtiga suradi.
 *
 * Natijadagi `getUTC*` metodlari Toshkentdagi qiymatlarni beradi —
 * shuning uchun quyida hamma joyda faqat `getUTC*` ishlatiladi.
 */
function toTashkent(value: Date | string): Date {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Date(date.getTime() + TASHKENT_OFFSET_MINUTES * 60_000);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Sana kalitini beradi: `2026-08-07`.
 *
 * ── Nima uchun "kalit" ────────────────────────────────────────────────
 * Bu ko'rinish ikki xislatga ega: uni odam ham o'qiydi, `<input
 * type="date">` ham tushunadi, va eng muhimi — SATRLAR sifatida
 * taqqoslash to'g'ri natija beradi (`'2026-08-07' < '2026-08-09'`).
 * Shu tufayli sanalarni solishtirishda vaqt zonasi umuman aralashmaydi.
 *
 * Satr berilsa, birinchi 10 belgi olinadi: `Date` ga o'girib qaytarish
 * kunni bir kunga surib yuborishi mumkin edi.
 */
export function toDateKey(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);

  const year = value.getUTCFullYear();
  const month = pad(value.getUTCMonth() + 1);
  const day = pad(value.getUTCDate());

  return `${year}-${month}-${day}`;
}

/** Bugundan boshlab `days` kun keyingi sana kaliti. */
export function dateKeyFromToday(days: number, today: Date = new Date()): string {
  const base = Date.parse(`${toDateKey(today)}T00:00:00Z`);

  return toDateKey(new Date(base + days * 86_400_000));
}

/**
 * Toshkent vaqtidagi sana va soatni haqiqiy vaqt nuqtasiga aylantiradi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Jadvalda reys "08:20 da jo'naydi" deb yozilgan — bu Toshkent vaqti.
 * Haqiqiy vaqt nuqtasini olish uchun kun va soat birlashtiriladi:
 *
 *     tashkentDateTime('2026-08-10', '08:20')  →  03:20 UTC
 *
 * Server qayerda turishidan qat'iy nazar natija bir xil, chunki
 * mintaqa qo'lda yozilgan (`+05:00`) va O'zbekistonda yozgi vaqt yo'q.
 *
 * @returns Yaroqsiz kirishda `Invalid Date` — chaqiruvchi tomon
 *   `Number.isNaN(result.getTime())` bilan tekshiradi.
 */
export function tashkentDateTime(dateKey: string, time: string): Date {
  return new Date(`${toDateKey(dateKey)}T${time}:00+05:00`);
}

/**
 * Hafta kuni ISO qoidasi bo'yicha: 1 = dushanba … 7 = yakshanba.
 *
 * JavaScript'ning `getUTCDay()` yakshanbani 0 deb beradi. Jadvalda esa
 * hafta dushanbadan boshlanadi — O'zbekistonda kalendarlar shunday.
 */
export function isoWeekday(dateKey: string): number {
  const day = new Date(`${toDateKey(dateKey)}T00:00:00Z`).getUTCDay();

  return day === 0 ? 7 : day;
}

/** Vaqt: "14:30" (Toshkent bo'yicha). */
export function formatUzTime(value: Date | string): string {
  const date = toTashkent(value);
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

/**
 * Sana: "3-avgust, 2026" yoki "3-avg".
 *
 * @param style `long` — to'liq oy nomi va yil; `short` — qisqa oy nomi.
 */
export function formatUzDate(value: Date | string, style: 'long' | 'short' = 'short'): string {
  const date = toTashkent(value);
  const day = date.getUTCDate();
  const monthIndex = date.getUTCMonth();

  return style === 'long'
    ? `${day}-${MONTHS_LONG[monthIndex]}, ${date.getUTCFullYear()}`
    : `${day}-${MONTHS_SHORT[monthIndex]}`;
}

/** Sana va vaqt: "3-avgust, 2026, 14:30" yoki "3-avg, 14:30". */
export function formatUzDateTime(value: Date | string, style: 'long' | 'short' = 'short'): string {
  return `${formatUzDate(value, style)}, ${formatUzTime(value)}`;
}

/**
 * Toshkent bo'yicha kun boshini (soat 00:00) qaytaradi.
 *
 * Statistika uchun zarur: "bugun nechta to'lov bo'ldi?" degan savolga
 * javob serverning vaqt mintaqasiga bog'liq bo'lmasligi kerak. Server
 * Frankfurtda tursa ham "bugun" — Toshkentdagi bugun.
 */
export function startOfTashkentDay(value: Date = new Date()): Date {
  const shifted = toTashkent(value);
  const localMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());

  // Toshkent yarim tunini haqiqiy UTC vaqtiga qaytaramiz.
  return new Date(localMidnight - TASHKENT_OFFSET_MINUTES * 60_000);
}

/**
 * Toshkent bo'yicha SANA kaliti: `2026-08-21`.
 *
 * ── Nima uchun `toDateKey` yetarli emas ───────────────────────────────
 * `toDateKey` sanani UTC bo'yicha o'qiydi. Server Frankfurtda,
 * Toshkent esa besh soat oldinda: kechqurun soat 03:00 gacha bo'lgan
 * hodisalar UTC bo'yicha "kechagi kun" ga tushardi.
 *
 * Statistika diagrammasida bu bir kunlik siljish bo'lib ko'rinardi —
 * bugungi obunachi kechagi ustunchaga qo'shilardi.
 */
export function tashkentDateKey(value: Date | string = new Date()): string {
  return toDateKey(toTashkent(value));
}

/** Toshkent bo'yicha `days` kun oldingi kun boshi. */
export function startOfTashkentDaysAgo(days: number, value: Date = new Date()): Date {
  return new Date(startOfTashkentDay(value).getTime() - days * 24 * 60 * 60_000);
}

/** Ikki sana Toshkent bo'yicha bir kunga to'g'ri keladimi. */
function isSameTashkentDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Yaqin o'tmishni odam tilida chiqaradi.
 *
 * "Hozir" → "12 daqiqa oldin" → "Bugun, 14:30" → "Kecha, 09:15" → "1-avg, 09:15"
 *
 * @param now Hozirgi vaqt. Sinovlarda aniq qiymat berish uchun ochiq.
 */
export function formatRelativeUz(value: Date | string, now: Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60_000);

  if (diffMinutes < 1) return 'Hozir';
  if (diffMinutes < 60) return `${diffMinutes} daqiqa oldin`;

  const tashkentDate = toTashkent(date);
  const tashkentNow = toTashkent(now);

  if (isSameTashkentDay(tashkentDate, tashkentNow)) {
    return `Bugun, ${formatUzTime(date)}`;
  }

  const yesterday = new Date(tashkentNow.getTime() - 24 * 60 * 60_000);

  if (isSameTashkentDay(tashkentDate, yesterday)) {
    return `Kecha, ${formatUzTime(date)}`;
  }

  // Bir yildan oshgan bo'lsa yilni ham ko'rsatamiz — aks holda chalkashadi.
  const isSameYear = tashkentDate.getUTCFullYear() === tashkentNow.getUTCFullYear();

  return isSameYear ? formatUzDateTime(date, 'short') : formatUzDate(date, 'long');
}

/**
 * Suhbatdagi kun ajratkichi uchun sarlavha.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Chatda har xabarda faqat soat ko'rinadi. Uzun suhbatda esa "14:30"
 * qaysi kunniki ekani bilinmaydi: kecha ham, uch hafta oldin ham
 * "14:30" bo'lishi mumkin.
 *
 * Kun ajratkichi bu savolni butunlay yopadi va suhbatni ko'z bilan
 * qismlarga bo'ladi. Barcha mashhur chat ilovalarida shunday.
 *
 * ── Nima uchun `formatRelativeUz` EMAS ────────────────────────────────
 * U vaqtni ham qo'shadi ("Bugun, 14:30") va "12 daqiqa oldin" deb
 * yozadi. Ajratkichda esa faqat KUN kerak — vaqt har xabarning o'zida
 * turibdi.
 *
 * @param now Hozirgi vaqt. Sinovlarda aniq qiymat berish uchun ochiq.
 */
export function formatUzDayLabel(value: Date | string, now: Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  const tashkentDate = toTashkent(date);
  const tashkentNow = toTashkent(now);

  if (isSameTashkentDay(tashkentDate, tashkentNow)) return 'Bugun';

  const yesterday = new Date(tashkentNow.getTime() - 24 * 60 * 60_000);

  if (isSameTashkentDay(tashkentDate, yesterday)) return 'Kecha';

  // Boshqa yildagi kun yilsiz yozilsa, "3-avg" qaysi yilniki noaniq qolardi.
  return tashkentDate.getUTCFullYear() === tashkentNow.getUTCFullYear()
    ? formatUzDate(date, 'short')
    : formatUzDate(date, 'long');
}
