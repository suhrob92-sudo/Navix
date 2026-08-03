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
