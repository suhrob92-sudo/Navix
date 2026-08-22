import { z } from 'zod';

/** GET /api/v1/referral/invited */
export const invitedQuerySchema = z.object({
  /*
    Sahifa raqami — chegarasi bilan.

    Chegarasiz katta son bilan bazaga "million qatordan keyingisini
    ber" degan so'rov yuborish mumkin bo'lardi. Bunday so'rov
    natijasiz, lekin bazani ancha ishlatadi.
  */
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export type InvitedQuery = z.infer<typeof invitedQuerySchema>;
