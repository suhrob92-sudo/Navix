import { z } from 'zod';

import { paginationQuerySchema } from '@/lib/api/pagination';
import { BOOKING_RULES, HOTEL_AMENITIES } from '@/config/hotels';
import { MAX_PRICE_SOM } from '@/config/hotel-filters';
import { phoneSchema } from '@/modules/auth/auth.schemas';
import { countNights, dateKeyFromToday, toDateKey } from '@/modules/hotel/hotel.types';

/**
 * Mehmonxona moduli uchun validatsiya.
 *
 * ── Bosh qoida: NARX MIJOZDAN KELMAYDI ────────────────────────────────
 * So'rovda summa ham, kechalar soni ham yo'q. Ikkalasi serverda
 * sanalardan qayta hisoblanadi.
 *
 * Aks holda so'rovni tahrirlab, 10 kechani 1 kecha narxiga band
 * qilish mumkin bo'lardi.
 */

/**
 * Sana — faqat `2026-08-07` ko'rinishida.
 *
 * ── Nima uchun vaqtsiz ────────────────────────────────────────────────
 * Mehmon "7-avgustda kelaman" deydi. Vaqt qabul qilinsa, Toshkent
 * (UTC+5) da yarim tundan keyingi so'rov bir kunga surilib ketishi
 * mumkin edi.
 */
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Sana 2026-08-07 ko'rinishida bo'lishi kerak")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Bunday sana yo\'q');

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, 'Kalit juda qisqa')
  .max(100, 'Kalit juda uzun')
  .regex(/^[A-Za-z0-9_-]+$/, "Kalitda faqat harf, raqam, '-' va '_' ishlatiladi");

/**
 * Sana oralig'ining umumiy qoidalari.
 *
 * Uchta savolga javob beradi: chiqish kirishdan keyinmi, sana
 * o'tmishda emasmi va muddat juda uzun emasmi.
 */
function checkDateRange(value: { checkIn: string; checkOut: string }, ctx: z.RefinementCtx): void {
  const nights = countNights(value.checkIn, value.checkOut);

  if (nights <= 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['checkOut'],
      message: "Chiqish sanasi kirishdan keyin bo'lishi kerak",
    });
    return;
  }

  if (nights > BOOKING_RULES.maxNights) {
    ctx.addIssue({
      code: 'custom',
      path: ['checkOut'],
      message: `Eng ko'pi ${BOOKING_RULES.maxNights} kecha — uzoqroq muddat uchun mehmonxona bilan bog'laning`,
    });
  }

  /**
   * O'tmishdagi sanani rad etamiz.
   *
   * Solishtiruv SATRLAR bo'yicha: `2026-08-07` ko'rinishidagi
   * sanalarni oddiy taqqoslash to'g'ri natija beradi va vaqt
   * zonasi umuman aralashmaydi.
   */
  const today = toDateKey(new Date());

  if (value.checkIn < today) {
    ctx.addIssue({ code: 'custom', path: ['checkIn'], message: "O'tmishdagi sanaga band qilib bo'lmaydi" });
  }

  const limit = dateKeyFromToday(BOOKING_RULES.maxDaysAhead);

  if (value.checkIn > limit) {
    ctx.addIssue({
      code: 'custom',
      path: ['checkIn'],
      message: `Eng uzog'i ${BOOKING_RULES.maxDaysAhead} kun oldin band qilinadi`,
    });
  }
}

/** GET /api/v1/hotels */
export const hotelQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  district: z.string().trim().min(1).max(80).optional(),
  /** Bir kecha narxi — SO'MDA. */
  minPriceSom: z.coerce.number().int().min(0).max(MAX_PRICE_SOM).optional(),
  maxPriceSom: z.coerce.number().int().min(0).max(MAX_PRICE_SOM).optional(),
  /** Kamida shuncha yulduz. */
  minStars: z.coerce.number().int().min(1).max(5).optional(),
  /**
   * Talab qilinadigan qulayliklar — vergul bilan.
   *
   * ── Nima uchun RO'YXAT bilan tekshiriladi ───────────────────────────
   * Bu qiymat bazaga massiv qidiruviga tushadi. Ro'yxatsiz bo'lsa,
   * so'rovga istalgan matn yozib yuborish mumkin edi: xavfsizlik
   * xatosi emas (Prisma parametr qo'yadi), lekin har xil yozilgan
   * qiymatlar keshni buzardi va natija har safar bo'sh chiqardi.
   */
  amenities: z
    .string()
    .trim()
    .max(400)
    .optional()
    .transform((value) =>
      value === undefined
        ? undefined
        : [
            ...new Set(
              value
                .split(',')
                .map((item) => item.trim())
                .filter((item) => (HOTEL_AMENITIES as readonly string[]).includes(item)),
            ),
          ],
    )
    .transform((list) => (list && list.length > 0 ? list : undefined)),
  sort: z.enum(['popular', 'price', 'rating']).default('popular'),
});

export type HotelQuery = z.infer<typeof hotelQuerySchema>;

/**
 * GET /api/v1/hotels/{slug}
 *
 * Sanalar IXTIYORIY: foydalanuvchi avval mehmonxonani ko'rib,
 * keyin sana tanlashi mumkin. Sana berilmasa bo'sh joy hisoblanmaydi.
 */
export const hotelDetailQuerySchema = z
  .object({
    checkIn: dateSchema.optional(),
    checkOut: dateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.checkIn === undefined || value.checkOut === undefined) return;

    checkDateRange({ checkIn: value.checkIn, checkOut: value.checkOut }, ctx);
  });

export type HotelDetailQuery = z.infer<typeof hotelDetailQuerySchema>;

/** POST /api/v1/hotels/bookings */
export const createBookingSchema = z
  .object({
    roomId: z.uuid({ message: "Xona noto'g'ri tanlangan" }),
    checkIn: dateSchema,
    checkOut: dateSchema,
    guests: z
      .number({ message: 'Mehmonlar sonini kiriting' })
      .int('Son butun bo\'lishi kerak')
      .min(1, 'Kamida bitta mehmon')
      .max(BOOKING_RULES.maxGuests, `Eng ko'pi ${BOOKING_RULES.maxGuests} mehmon`),
    /**
     * Kim yashaydi.
     *
     * Bandlov boshqa odam uchun bo'lishi mumkin (masalan ota-onaga),
     * shuning uchun ism va telefon alohida so'raladi.
     */
    guestName: z.string().trim().min(2, 'Mehmonning ismini yozing').max(120, 'Ism juda uzun'),
    guestPhone: phoneSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .superRefine((value, ctx) => {
    checkDateRange({ checkIn: value.checkIn, checkOut: value.checkOut }, ctx);
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/** GET /api/v1/hotels/bookings */
export const bookingQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ALL', 'UPCOMING', 'COMPLETED', 'CANCELLED']).default('ALL'),
});

export type BookingQuery = z.infer<typeof bookingQuerySchema>;

/** POST /api/v1/hotels/bookings/{id}/cancel */
export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(3, 'Sababni yozing').max(255, 'Sabab juda uzun').optional(),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
