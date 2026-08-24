/**
 * Savat — yagona sozlama.
 *
 * ── Nima uchun savat SERVERGA ko'chdi ─────────────────────────────────
 * Savat `localStorage` da turardi. U tez ishlardi va so'rov talab
 * qilmasdi, lekin uchta jiddiy kamchiligi bor edi:
 *
 *   1. brauzer ma'lumotlari tozalansa savat butunlay yo'qolardi;
 *   2. odam noutbukda savat to'ldirib, telefondan kirsa — bo'sh
 *      savat ko'rardi;
 *   3. savatda nima turgani serverga ma'lum emas edi, ya'ni
 *      "savatingizda mahsulot qoldi" degan eslatma imkonsiz edi.
 *
 * Uchinchisi eng muhimi: dunyodagi barcha do'konlar daromadining
 * sezilarli qismi aynan shu eslatmadan keladi.
 *
 * ── Nima uchun brauzerdagi nusxa BARIBIR qoladi ───────────────────────
 * Har bir "+" bosishda so'rov yuborib, javobini kutish mobil
 * internetda sekin ko'rinardi: odam tugmani bosadi, hech narsa
 * o'zgarmaydi, u yana bosadi.
 *
 * Shuning uchun ekran DARHOL yangilanadi, so'rov esa orqada
 * ketadi. Server xato qaytarsa — o'zgarish ortga qaytariladi.
 * Serverdagi yozuv har doim haqiqat, brauzerdagisi esa uning
 * tez ko'zgusi.
 */

/**
 * Bitta qatorda eng ko'p nechta dona.
 *
 * ── Nima uchun chegara bor ────────────────────────────────────────────
 * Chegarasiz odam tasodifan "99999" yozib yuborishi va sahifa
 * mantiqsiz summani ko'rsatishi mumkin. Ombor ham baribir
 * bunchasini bermaydi.
 */
export const MAX_QUANTITY_PER_LINE = 99;

/**
 * Savatda eng ko'p nechta TURLI mahsulot.
 *
 * Chegara so'rovni ham himoya qiladi: savat har ochilganda har bir
 * qator uchun narx va zaxira o'qiladi.
 */
export const MAX_CART_LINES = 50;

/**
 * "Keyinroq" ro'yxatida eng ko'p nechta mahsulot.
 *
 * Sevimlilar ro'yxatidan farqi: bu yerda odam SOTIB OLISHNI
 * rejalashtirgan narsalar turadi, ya'ni ro'yxat qisqa bo'ladi.
 */
export const MAX_SAVED_LINES = 50;

/**
 * Savat necha soat qimirlamasa eslatma yuboriladi.
 *
 * ── Nima uchun 24 soat ────────────────────────────────────────────────
 * Bir necha soatdan keyin eslatish bezorilik bo'lardi: odam
 * hali o'ylayotgan bo'lishi mumkin, yoki shunchaki ishda.
 *
 * Bir kundan keyin esa u savatini haqiqatan unutgan bo'ladi.
 */
export const REMINDER_AFTER_HOURS = 24;

/**
 * Savat qancha eskirsa, eslatma YUBORILMAYDI.
 *
 * ── Nima uchun yuqori chegara ham kerak ───────────────────────────────
 * Ikki hafta oldingi savat haqida eslatish foydasiz: odam allaqachon
 * o'sha narsani boshqa joydan olgan yoki fikridan qaytgan.
 *
 * Bunday eslatma faqat asabga tegadi va odam bildirishnomalarni
 * butunlay o'chirib qo'yadi.
 */
export const REMINDER_BEFORE_HOURS = 24 * 7;

/**
 * Bitta odamga eslatma necha soatda bir marta yuboriladi.
 *
 * Usiz savatini unutgan odam har soatda bir xil xabar olardi.
 */
export const REMINDER_COOLDOWN_HOURS = 72;

/** Bir marta o'tishda eng ko'p nechta odamga eslatma yuboriladi. */
export const REMINDER_BATCH = 50;

/** Savat qatori — brauzer va server o'rtasida shu ko'rinishda yuradi. */
export interface CartLine {
  productId: string;
  /** `null` — variantsiz mahsulot. */
  variantId: string | null;
  quantity: number;
}

/**
 * Savat qatorining kaliti.
 *
 * ── Nima uchun IKKITA maydondan ───────────────────────────────────────
 * Bir xil mahsulotning qora va oq rangi — savatda IKKI ALOHIDA qator.
 * Faqat mahsulot bo'yicha kalitlansa, ikkinchi rang birinchisining
 * sonini oshirib yuborardi.
 */
export function cartLineKey(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

/** Miqdorni ruxsat etilgan oraliqqa keltiradi. */
export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;

  const whole = Math.floor(value);

  if (whole < 1) return 1;

  return Math.min(whole, MAX_QUANTITY_PER_LINE);
}

/**
 * Ikkita savatni BIRLASHTIRADI.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Savat serverga ko'chgan kuni odamlarning brauzerida allaqachon
 * to'ldirilgan savat turibdi. Uni shunchaki tashlab yuborsak,
 * hamma o'z savatini yo'qotardi.
 *
 * ── Nima uchun QO'SHILADI, almashtirilmaydi ───────────────────────────
 * Odam telefonda ikkita, noutbukda uchta mahsulot qo'shgan bo'lishi
 * mumkin. Ikkovi ham unga kerak.
 *
 * ── Nima uchun ENG KATTA son olinadi, yig'indi emas ───────────────────
 * Yig'indi xavfli: birlashtirish ikki marta ishlab ketsa (masalan
 * so'rov qaytarilsa), miqdor har safar ikki barobar oshardi.
 *
 * "Eng kattasi" esa necha marta takrorlansa ham bir xil natija
 * beradi.
 */
export function mergeCartLines(
  server: readonly CartLine[],
  local: readonly CartLine[],
): CartLine[] {
  const merged = new Map<string, CartLine>();

  for (const line of server) {
    merged.set(cartLineKey(line.productId, line.variantId), { ...line });
  }

  for (const line of local) {
    const key = cartLineKey(line.productId, line.variantId);
    const existing = merged.get(key);

    if (existing) {
      existing.quantity = clampQuantity(Math.max(existing.quantity, line.quantity));
    } else {
      merged.set(key, { ...line, quantity: clampQuantity(line.quantity) });
    }
  }

  return [...merged.values()].slice(0, MAX_CART_LINES);
}

/** Savatdagi jami dona soni. */
export function totalQuantity(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Eslatma yuborish mumkinmi.
 *
 * Vaqt oralig'i ikki tomondan chegaralangan — sabab
 * `REMINDER_BEFORE_HOURS` da.
 */
export function isReminderDue(idleHours: number): boolean {
  return idleHours >= REMINDER_AFTER_HOURS && idleHours <= REMINDER_BEFORE_HOURS;
}

/**
 * Eslatma matni uchun mahsulot nomi.
 *
 * ── Nima uchun faqat BITTA nom ────────────────────────────────────────
 * "Redmi Note 14, Lenovo IdeaPad, Samsung..." degan xabar telefon
 * ekranida kesilib qolardi va hech narsa tushunarli bo'lmasdi.
 *
 * Bitta aniq nom esa odamga nima haqida gap ketayotganini darhol
 * aytadi.
 */
export function reminderSubject(firstName: string, otherCount: number): string {
  if (otherCount <= 0) return firstName;

  return `${firstName} va yana ${otherCount} ta mahsulot`;
}
