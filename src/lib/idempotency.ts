import { ConflictError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';

/**
 * Takroriy so'rovni xavfsiz bajarish.
 *
 * ── HAQIQIY XATO, poyga sinovida topilgan ─────────────────────────────
 * Har bir pul amalida `idempotencyKey` bor va u bazada yagona. Kod
 * shunday ishlardi:
 *
 *   1. "Bu kalit bilan yozuv bormi?" — yo'q;
 *   2. yangi yozuv yaratiladi.
 *
 * Ketma-ket so'rovlarda bu to'g'ri ishlaydi. Lekin ikkita so'rov BIR
 * VAQTDA kelsa, ikkalasi ham 1-qadamda "yo'q" deb ko'radi va ikkalasi
 * ham yozishga urinadi. Bazadagi yagona indeks ikkinchisini rad etadi
 * — bu TO'G'RI, pul ikki marta ketmaydi.
 *
 * Muammo javobda edi: rad etilgan so'rov "Serverda kutilmagan xatolik"
 * (500) qaytarardi.
 *
 * ── Nima uchun bu QIMMAT xato ─────────────────────────────────────────
 * Sekin mobil internetda ilova so'rovni O'ZI qaytadan yuboradi. Odam
 * esa "xatolik" yozuvini ko'rib, pul ketmagan deb o'ylaydi va
 * qaytadan urinadi — endi YANGI kalit bilan. Natijada pul IKKI MARTA
 * ketadi.
 *
 * Ya'ni idempotentlikning butun maqsadi aynan shu joyda buzilardi.
 *
 * ── Yechim ────────────────────────────────────────────────────────────
 * Yagona indeks xatosi ushlanadi va MAVJUD natija qaytariladi — xuddi
 * ketma-ket so'rovdagi kabi. Mijoz uchun natija bir xil bo'ladi.
 */

/**
 * Xato aynan `idempotencyKey` takrorlanganidanmi.
 *
 * ── Nima uchun ustun ham tekshiriladi ─────────────────────────────────
 * `P2002` — istalgan yagona indeks buzilgani. Masalan buyurtma raqami
 * takrorlansa ham shu kod chiqadi. Ustunni tekshirmasdan hammasini
 * "takroriy so'rov" deb qabul qilish boshqa xatolarni yashirardi.
 */
export function isDuplicateIdempotencyKey(error: unknown): boolean {
  /**
   * ── Nima uchun `instanceof` ISHLATILMAYDI ───────────────────────────
   * Avval bu yerda `error instanceof Prisma.PrismaClientKnownRequestError`
   * turgan edi va u HECH QACHON rost bo'lmadi: Turbopack ishlab
   * chiqish rejimida modullarni bir necha marta yuklaydi, natijada
   * xatoni tashlagan sinf bilan bu yerdagi sinf BOSHQA-BOSHQA
   * obyektlar bo'lib qoladi.
   *
   * Xato tanilmagani uchun tuzatish umuman ishlamadi — buni poyga
   * sinovi ko'rsatdi: javob baribir 500 edi.
   *
   * Shuning uchun tekshiruv sinfga emas, XOSSALARGA qaraydi. Prisma
   * xato kodlari barqaror va hujjatlashtirilgan, ya'ni bu yo'l
   * ishonchliroq.
   */
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error as { code?: unknown; meta?: { target?: unknown }; message?: unknown };

  if (candidate.code !== 'P2002') return false;

  const target = candidate.meta?.target;
  const columns = Array.isArray(target) ? target.map(String) : [String(target ?? '')];

  /**
   * Ustun nomi `meta` da bo'lmasa, xabar matnidan qidiriladi.
   *
   * Prisma versiyalari `meta` ni har xil to'ldiradi va bittasiga
   * bog'lanib qolish keyingi yangilanishda jimgina buzilardi.
   */
  const haystack = [...columns, String(candidate.message ?? '')];

  return haystack.some((value) => value.includes('idempotencyKey'));
}

/**
 * Amalni bajaradi; takroriy kalit tufayli rad etilsa — mavjud
 * natijani qaytaradi.
 *
 * @param operation Asosiy amal (yozuv yaratish).
 * @param recover   Mavjud natijani topadigan funksiya.
 */
export async function runIdempotent<T>(
  operation: () => Promise<T>,
  recover: () => Promise<T | null>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isDuplicateIdempotencyKey(error)) throw error;

    /**
     * Natija BIR NECHA MARTA qidiriladi.
     *
     * ── Nima uchun bir marta yetarli emas ───────────────────────────
     * Yagona indeks "bunday kalit bor" deydi — lekin g'olib so'rovning
     * tranzaksiyasi hali YAKUNLANMAGAN bo'lishi mumkin. O'sha lahzada
     * qidirilsa, yozuv topilmaydi va biz yana 500 qaytarardik.
     *
     * Aynan shu holat poyga sinovida ko'rindi: tuzatishdan keyin ham
     * javoblar 500 bo'lib qolavergan edi.
     *
     * G'olib bir necha millisekundda yakunlanadi, shuning uchun qisqa
     * kutish bilan qayta urinish yetarli.
     */
    for (const waitMs of RECOVER_DELAYS_MS) {
      const existing = await recover();

      if (existing) {
        logger.info("Takroriy so'rov — mavjud natija qaytarildi");

        return existing;
      }

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const last = await recover();

    if (last) return last;

    /**
     * Hali ham topilmadi.
     *
     * Bu holat kamdan-kam bo'ladi, lekin bo'lsa ham 500 qaytarish
     * NOTO'G'RI: biz aniq bilamizki, xuddi shu kalit bilan so'rov
     * allaqachon ketmoqda. Mijozga tushunarli javob beriladi va u
     * pul ikki marta ketdimi deb qo'rqmaydi.
     */
    logger.warn("Takroriy so'rov natijasi topilmadi — hali yakunlanmagan");

    throw new ConflictError(
      "Bu amal allaqachon bajarilmoqda. Bir necha soniyadan keyin tarixni tekshiring — takrorlamang.",
    );
  }
}

/**
 * Qayta urinishlar orasidagi kutish.
 *
 * Umumiy kutish ~350 ms: odam sezmaydi, tranzaksiya esa yakunlanishga
 * ulguradi. Cheksiz kutish javobni osib qo'yardi.
 */
const RECOVER_DELAYS_MS = [30, 80, 200] as const;
