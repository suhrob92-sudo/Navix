import { z } from 'zod';

import { TRIP_RULES } from '@/config/travel';
import { dateKeyFromToday, toDateKey } from '@/lib/date';
import { paginationQuerySchema } from '@/lib/api/pagination';
import { phoneSchema } from '@/modules/auth/auth.schemas';

/**
 * Sayohat moduli uchun validatsiya.
 *
 * ── Bosh qoida: NARX MIJOZDAN KELMAYDI ────────────────────────────────
 * So'rovda summa ham, jo'nash vaqti ham yo'q. Ikkalasi serverda
 * jadvaldan va sanadan qayta hisoblanadi.
 *
 * Aks holda so'rovni tahrirlab, olti o'rinni bitta o'rin narxiga sotib
 * olish mumkin bo'lardi.
 */

/**
 * Sana — faqat `2026-08-10` ko'rinishida.
 *
 * Vaqt qabul qilinmaydi: reys vaqti jadvalda turadi va foydalanuvchi
 * faqat KUNNI tanlaydi.
 */
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Sana 2026-08-10 ko'rinishida bo'lishi kerak")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Bunday sana yo'q");

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, 'Kalit juda qisqa')
  .max(100, 'Kalit juda uzun')
  .regex(/^[A-Za-z0-9_-]+$/, "Kalitda faqat harf, raqam, '-' va '_' ishlatiladi");

const citySchema = z.string().trim().min(2, 'Shahar nomi juda qisqa').max(80, 'Shahar nomi juda uzun');

const transportSchema = z.enum(['PLANE', 'TRAIN', 'BUS']);

/**
 * Jo'nash sanasi juda uzoq o'tmishda yoki kelajakda emasligini tekshiradi.
 *
 * ── Nima uchun O'TGAN KUN ham rad etiladi ─────────────────────────────
 * Kecha jo'nab ketgan reysga chipta sotish ma'nosiz. Aniq soat
 * tekshiruvi (bugungi reys allaqachon ketganmi) SERVERDA, jo'nash payti
 * bo'yicha qilinadi — bu yerda faqat kun darajasidagi qo'pol filtr.
 *
 * Solishtiruv SATRLAR bo'yicha: `2026-08-10` ko'rinishidagi sanalarni
 * oddiy taqqoslash to'g'ri natija beradi va vaqt zonasi aralashmaydi.
 */
function checkDepartDate(value: string, ctx: z.RefinementCtx, path: string): void {
  if (value < toDateKey(new Date())) {
    ctx.addIssue({ code: 'custom', path: [path], message: "O'tgan kunga chipta olib bo'lmaydi" });
    return;
  }

  if (value > dateKeyFromToday(TRIP_RULES.maxDaysAhead)) {
    ctx.addIssue({
      code: 'custom',
      path: [path],
      message: `Eng uzog'i ${TRIP_RULES.maxDaysAhead} kun oldin chipta olinadi`,
    });
  }
}

/**
 * GET /api/v1/travel/trips — reys qidirish.
 *
 * `from`, `to` va `date` — SHART. Reys qidiruvi mehmonxonadan farq
 * qiladi: "qayerdan qayerga, qachon" degan uchta javobsiz ro'yxatning
 * ma'nosi yo'q, chunki jadvalda yuzlab yo'nalish bo'lishi mumkin.
 */
export const tripQuerySchema = z
  .object({
    from: citySchema,
    to: citySchema,
    date: dateSchema,
    transport: transportSchema.optional(),
    sort: z.enum(['time', 'price']).default('time'),
  })
  .superRefine((value, ctx) => {
    if (value.from.toLowerCase() === value.to.toLowerCase()) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: "Jo'nash va borish shahri bir xil" });
    }

    checkDepartDate(value.date, ctx, 'date');
  });

export type TripQuery = z.infer<typeof tripQuerySchema>;

/** GET /api/v1/travel/trips/{scheduleId} */
export const tripDetailQuerySchema = z
  .object({ date: dateSchema })
  .superRefine((value, ctx) => checkDepartDate(value.date, ctx, 'date'));

export type TripDetailQuery = z.infer<typeof tripDetailQuerySchema>;

/** POST /api/v1/travel/tickets */
export const createTicketSchema = z
  .object({
    scheduleId: z.uuid({ message: "Reys noto'g'ri tanlangan" }),
    departDate: dateSchema,
    seats: z
      .number({ message: "O'rinlar sonini kiriting" })
      .int("Son butun bo'lishi kerak")
      .min(1, "Kamida bitta o'rin")
      .max(TRIP_RULES.maxSeats, `Bitta chiptada eng ko'pi ${TRIP_RULES.maxSeats} o'rin`),
    /**
     * Kim ketadi.
     *
     * Chipta boshqa odam uchun bo'lishi mumkin (masalan ota-onaga),
     * shuning uchun ism va telefon alohida so'raladi.
     */
    passengerName: z.string().trim().min(2, "Yo'lovchining ismini yozing").max(120, 'Ism juda uzun'),
    passengerPhone: phoneSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .superRefine((value, ctx) => checkDepartDate(value.departDate, ctx, 'departDate'));

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

/** GET /api/v1/travel/tickets */
export const ticketQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ALL', 'UPCOMING', 'COMPLETED', 'CANCELLED']).default('ALL'),
});

export type TicketQuery = z.infer<typeof ticketQuerySchema>;

/** POST /api/v1/travel/tickets/{id}/cancel */
export const cancelTicketSchema = z.object({
  reason: z.string().trim().min(3, 'Sababni yozing').max(255, 'Sabab juda uzun').optional(),
});

export type CancelTicketInput = z.infer<typeof cancelTicketSchema>;
