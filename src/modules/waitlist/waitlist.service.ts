import { Prisma } from '@/generated/prisma/client';
import { WAITLIST_RULES } from '@/config/waitlist';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import type { JoinWaitlistInput } from '@/modules/waitlist/waitlist.schemas';
import type { WaitlistJoinResult, WaitlistStats } from '@/modules/waitlist/waitlist.types';

/**
 * Navbat moduli.
 *
 * ── Nima uchun bu modul ODDIY ─────────────────────────────────────────
 * Bu yerda pul ham, holat mashinasi ham yo'q: bitta yozuv qo'shiladi va
 * o'rin qaytariladi. Murakkablik faqat ikki joyda:
 *
 *   1. O'RIN — ikki odam bir vaqtda yozilganda bir xil raqam
 *      olmasligi kerak (baza ketma-ketligi hal qiladi);
 *   2. TAKROR — bir raqam ikki marta yozilsa xato emas, eski o'rin
 *      qaytariladi.
 */

export interface JoinMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function joinWaitlist(input: JoinWaitlistInput, meta: JoinMeta = {}): Promise<WaitlistJoinResult> {
  const existing = await prisma.waitlistEntry.findUnique({
    where: { phone: input.phone },
    select: { position: true },
  });

  if (existing) {
    return { position: existing.position, alreadyJoined: true };
  }

  try {
    const created = await prisma.waitlistEntry.create({
      data: {
        phone: input.phone,
        name: input.name ?? null,
        city: input.city ?? null,
        source: input.source ?? null,
        ipAddress: meta.ipAddress ?? null,
        /**
         * Brauzer satri qirqiladi.
         *
         * Ustun 300 belgi, ba'zi brauzerlar esa undan uzun satr
         * yuboradi — qirqilmasa baza yozuvni butunlay rad etardi va
         * odam navbatga tusha olmasdi.
         */
        userAgent: meta.userAgent?.slice(0, 300) ?? null,
      },
      select: { position: true },
    });

    logger.info({ position: created.position, source: input.source }, 'Navbatga yangi odam yozildi');

    return { position: created.position, alreadyJoined: false };
  } catch (error) {
    /**
     * Ayni shu oniyda boshqa so'rov shu raqamni yozib ulgurdi.
     *
     * Yuqoridagi tekshiruv bu holatni ushlay olmaydi: o'qish va yozish
     * orasida vaqt bor. Bunda ham xato ko'rsatmaymiz — yozilgan o'rinni
     * o'qib qaytaramiz.
     */
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const row = await prisma.waitlistEntry.findUnique({
        where: { phone: input.phone },
        select: { position: true },
      });

      if (row) {
        return { position: row.position, alreadyJoined: true };
      }
    }

    throw error;
  }
}

/**
 * Navbat statistikasi.
 *
 * Son kam bo'lganda `null` qaytariladi — sabab `src/config/waitlist.ts` da.
 */
export async function getWaitlistStats(): Promise<WaitlistStats> {
  const total = await prisma.waitlistEntry.count();

  return { total: total >= WAITLIST_RULES.showCountFrom ? total : null };
}
