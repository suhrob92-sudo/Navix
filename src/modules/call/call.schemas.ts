import { z } from 'zod';

/**
 * Qo'ng'iroq moduli uchun validatsiya.
 */

/** POST /api/v1/calls — qo'ng'iroqni boshlash. */
export const startCallSchema = z.object({
  conversationId: z.uuid("Suhbat ID noto'g'ri"),

  /**
   * Hozircha faqat ovozli qo'ng'iroq.
   *
   * Video keyingi bosqichda yoqiladi. Turni ATAYLAB hozir kiritdik:
   * shunda bazaga ham, API'ga ham keyin tegish kerak bo'lmaydi.
   */
  kind: z.enum(['AUDIO', 'VIDEO']).default('AUDIO'),
});

export type StartCallInput = z.infer<typeof startCallSchema>;

/**
 * POST /api/v1/calls/{id}/signal — ulanish ma'lumotini uzatish.
 *
 * ── Nima uchun `sdp` MATN sifatida tekshiriladi ───────────────────────
 * Uning ichini server tushunmaydi va tushunishi ham shart emas: bu ikki
 * brauzer o'rtasidagi texnik yozishma. Server faqat hajmini cheklaydi —
 * aks holda navbatga istalgancha katta ma'lumot tiqib bo'lardi.
 */
export const callSignalSchema = z
  .object({
    type: z.enum(['offer', 'answer', 'candidate']),
    sdp: z.string().max(20_000).optional(),
    /**
     * Tarmoq manzili — brauzer bergan obyekt shundayligicha uzatiladi.
     *
     * Uning tuzilishi brauzerga qarab farq qiladi, shuning uchun qat'iy
     * sxema yozilmaydi. Xavf yo'q: qiymat faqat ikkinchi brauzerga
     * qaytariladi, server uni o'qimaydi ham, bajarmaydi ham.
     */
    candidate: z.unknown().optional(),
  })
  .refine(
    (value) => (value.type === 'candidate' ? value.candidate !== undefined : Boolean(value.sdp)),
    "Signal to'liq emas",
  );

export type CallSignalInput = z.infer<typeof callSignalSchema>;

/** POST /api/v1/calls/{id}/end — tugatish sababi. */
export const endCallSchema = z.object({
  /**
   * Ulanish umuman o'rnatilmadimi.
   *
   * Shu bayroq bilan qo'ng'iroq "tugadi" emas, "ulanib bo'lmadi" deb
   * yoziladi — odam sababini bilib, qaytadan urinadi.
   */
  failed: z.boolean().default(false),
});

export type EndCallInput = z.infer<typeof endCallSchema>;
