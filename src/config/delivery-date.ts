import { isoWeekday, tashkentDateKey, toDateKey } from '@/lib/date';

/**
 * Yetkazish sanasi — yagona sozlama.
 *
 * ── Nima uchun bu modul kerak ─────────────────────────────────────────
 * Mahsulot sahifasida eng muhim savol — "QACHON keladi?" — javobsiz
 * qolardi. U yerda faqat "2 kunda yetkaziladi" degan yozuv turardi.
 *
 * Bu ikkalasi bir xil narsa emas:
 *
 *   · "2 kunda"        — odam o'zi sanashi kerak va u ko'pincha
 *                        adashadi ("bugundanmi, ertadanmi?");
 *   · "5-avgust, chorshanba" — javob tayyor va aniq.
 *
 * Amazon savdosining katta qismi shu qatordan keladi: odam sanani
 * ko'rib, "ulguradi" degan qarorni qabul qiladi.
 *
 * ── Nima uchun BAZAGA yozilmaydi ──────────────────────────────────────
 * Sana buyurtma berilgandagina va'da bo'ladi. Katalogda u shunchaki
 * HISOB — do'konning muddatidan kelib chiqadi va har ochilishda
 * qaytadan hisoblanadi.
 *
 * Uni bazaga yozsak, ertaga ham kechagi sana ko'rinardi.
 */

/**
 * Buyurtma qabul qilinadigan oxirgi soat (Toshkent vaqti).
 *
 * ── Nima uchun kesim vaqti kerak ──────────────────────────────────────
 * Kechqurun soat 23:00 da berilgan buyurtma o'sha kuni yig'ilmaydi:
 * ombor yopiq, kuryer uyda.
 *
 * Kesimsiz hisob "ertaga keladi" deb va'da berardi va odam kutib
 * qolardi. Bu — ishonchni yo'qotadigan eng oson yo'l.
 *
 * ── Nima uchun aynan 18:00 ────────────────────────────────────────────
 * O'zbekistondagi do'konlarning ko'pi 18:00 gacha ishlaydi. Undan
 * keyingi buyurtma ertangi kunga tushadi.
 */
export const ORDER_CUTOFF_HOUR = 18;

/**
 * Yakshanba yetkazishga KIRADI.
 *
 * ── Nima uchun ─────────────────────────────────────────────────────────
 * O'zbekistonda yakshanba ham savdo kuni: bozorlar ochiq, kuryerlar
 * ishlaydi. Uni chiqarib tashlash sanani bir kunga uzaytirardi va
 * bu YOLG'ON bo'lardi.
 *
 * Bayram kunlari hisobga olinmaydi: ular har yili o'zgaradi va
 * ularning ro'yxatini yuritish alohida ish. Bu ochiq va ataylab
 * tanlangan soddalik.
 */

/**
 * Toshkent bo'yicha `days` kun keyingi sana kaliti.
 *
 * ── HAQIQIY XATO: sana bir kunga adashardi ────────────────────────────
 * Ilgari bu yerda `dateKeyFromToday()` ishlatilgan edi va u sanani
 * UTC bo'yicha oladi.
 *
 * Toshkent UTC dan besh soat oldinda: Toshkentda 3-avgust soat 01:00
 * bo'lganda UTC bo'yicha hali 2-avgust. Ya'ni yarim tundan keyin
 * buyurtma bergan odamga KECHAGI kundan hisoblangan sana
 * ko'rsatilardi — bir kun erta.
 *
 * Xato faqat tunda ko'rinardi va uni kunduzi topib bo'lmasdi.
 */
function tashkentDayKey(days: number, now: Date): string {
  const base = Date.parse(`${tashkentDateKey(now)}T00:00:00Z`);

  return toDateKey(new Date(base + days * 86_400_000));
}

/** Hafta kunlari — 1 (dushanba) dan 7 (yakshanba) gacha. */
const WEEKDAYS: readonly string[] = [
  'dushanba',
  'seshanba',
  'chorshanba',
  'payshanba',
  'juma',
  'shanba',
  'yakshanba',
];

/** Oy nomlari — sana matnini yasash uchun. */
const MONTHS: readonly string[] = [
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
];

/**
 * Yetkazish sanasini hisoblaydi.
 *
 * ── Nima uchun `now` PARAMETR ─────────────────────────────────────────
 * Sinovda "hozir" ni belgilab bo'lmasa, kesim vaqtini tekshirish
 * imkonsiz bo'lardi: sinov natijasi u ishga tushgan soatga bog'liq
 * bo'lib qolardi va tunda buzilardi.
 *
 * @param deliveryDays Do'kon va'da qilgan kunlar soni.
 * @returns Sana kaliti: "2026-08-05".
 */
export function estimateDeliveryDateKey(deliveryDays: number, now: Date = new Date()): string {
  const days = Math.max(0, Math.trunc(deliveryDays));

  /**
   * Soat Toshkent bo'yicha olinadi.
   *
   * Server Frankfurtda tursa ham kesim vaqti Toshkentdagi 18:00
   * bo'lishi kerak — aks holda tushdan keyin berilgan buyurtma
   * "kechikdi" deb hisoblanardi.
   */
  const tashkentHour = Number(
    new Date(now.getTime() + 5 * 60 * 60_000).toISOString().slice(11, 13),
  );

  const isLate = tashkentHour >= ORDER_CUTOFF_HOUR;

  return tashkentDayKey(days + (isLate ? 1 : 0), now);
}

/**
 * Sanani odam tiliga o'giradi: "5-avgust, chorshanba".
 *
 * ── Nima uchun HAFTA KUNI ham yoziladi ────────────────────────────────
 * "5-avgust" o'zi hech narsa aytmaydi: odam bugun nechanchi sana
 * ekanini ham har doim bilmaydi.
 *
 * "Chorshanba" esa darhol tushunarli — u rejasini shunga qarab
 * tuzadi.
 *
 * ── Nima uchun `Intl` EMAS ────────────────────────────────────────────
 * Loyihadagi barcha formatlash qo'lda: `Intl` server va brauzerda
 * boshqacha natija berib, React "hydration mismatch" xatosini
 * chiqarardi (sabab `src/lib/money.ts` da batafsil).
 */
export function formatDeliveryDate(dateKey: string, now: Date = new Date()): string {
  const key = toDateKey(dateKey);
  const todayKey = tashkentDateKey(now);

  if (key === todayKey) return 'bugun';
  if (key === tashkentDayKey(1, now)) return 'ertaga';
  if (key === tashkentDayKey(2, now)) return 'indinga';

  const [, month, day] = key.split('-').map(Number);
  const weekday = WEEKDAYS[isoWeekday(key) - 1];

  return `${day}-${MONTHS[month - 1]}, ${weekday}`;
}

/**
 * To'liq jumla: "Yetkazish — ertaga".
 *
 * ── Nima uchun jumla SHU YERDA yasaladi ───────────────────────────────
 * Bu matn ikki joyda ko'rinadi: mahsulot sahifasida va savatda.
 * Har birida qo'lda yozilsa, ertaga so'z tartibi o'zgarganda
 * bittasi unutilardi.
 */
export function deliveryPromise(deliveryDays: number, now: Date = new Date()): string {
  return `Yetkazish — ${formatDeliveryDate(estimateDeliveryDateKey(deliveryDays, now), now)}`;
}

/**
 * Kesim vaqti haqida ogohlantirish.
 *
 * `null` — hali erta, ogohlantirish kerak emas.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Kesimdan keyin sana bir kunga suriladi va odam buni tushunmasdi:
 * "kecha ikki kun deb yozilgan edi-ku?"
 *
 * Sababni aytish esa uni shoshiltiradi ham: ertaga emas, HOZIR
 * buyurtma bergani ma'qul.
 */
export function cutoffNotice(now: Date = new Date()): string | null {
  const tashkentHour = Number(
    new Date(now.getTime() + 5 * 60 * 60_000).toISOString().slice(11, 13),
  );

  if (tashkentHour < ORDER_CUTOFF_HOUR) {
    return `Bugun soat ${ORDER_CUTOFF_HOUR}:00 gacha buyurtma bersangiz, shu kundan hisoblanadi`;
  }

  return null;
}
