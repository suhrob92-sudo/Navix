import { prisma } from '@/lib/prisma';
import { toPrismaPagination } from '@/lib/api/pagination';
import type { AdminWaitlistQuery } from '@/modules/admin/admin.schemas';

/**
 * Navbat ro'yxati — ishga tushishdan oldin yozilganlar.
 *
 * ── Nima uchun panelda kerak ──────────────────────────────────────────
 * Bu ro'yxat ilovaning BIRINCHI mijozlari. Ishga tushgan kuni ularga
 * xabar yuboriladi. Shu paytgacha ro'yxatni faqat bazaga kirib ko'rish
 * mumkin edi — ya'ni telefondan ishlayotgan odam uni umuman ko'ra
 * olmasdi.
 *
 * ── Nima uchun faqat KO'RISH ──────────────────────────────────────────
 * Yozuvni tahrirlash yoki o'chirish tugmasi ataylab yo'q. Navbatdagi
 * o'rin — odamga berilgan va'da; uni qo'lda o'zgartirish mumkin bo'lsa,
 * o'sha va'daning ma'nosi qolmaydi.
 */

export interface AdminWaitlistItem {
  id: string;
  position: number;
  phone: string;
  name: string | null;
  city: string | null;
  source: string | null;
  createdAt: string;
}

export interface AdminWaitlistResult {
  entries: AdminWaitlistItem[];
  total: number;
  /** Qayerdan kelgani bo'yicha sanoq — reklama qayerda ishlaganini ko'rsatadi. */
  bySource: { source: string; count: number }[];
}

export async function listWaitlist(query: AdminWaitlistQuery): Promise<AdminWaitlistResult> {
  const { skip, take } = toPrismaPagination(query);

  const where = query.search
    ? {
        OR: [
          { phone: { contains: query.search } },
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { city: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [rows, total, grouped] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where,
      select: { id: true, position: true, phone: true, name: true, city: true, source: true, createdAt: true },
      orderBy: { position: 'asc' },
      skip,
      take,
    }),
    prisma.waitlistEntry.count({ where }),
    /**
     * Sanoq FILTRSIZ hisoblanadi.
     *
     * "Instagram'dan nechta odam keldi?" degan savolga javob qidiruv
     * so'ziga bog'liq bo'lmasligi kerak — bu umumiy ko'rsatkich.
     */
    prisma.waitlistEntry.groupBy({ by: ['source'], _count: { _all: true } }),
  ]);

  return {
    entries: rows.map((row) => ({
      id: row.id,
      position: row.position,
      phone: row.phone,
      name: row.name,
      city: row.city,
      source: row.source,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    bySource: grouped
      .map((item) => ({ source: item.source ?? "noma'lum", count: item._count._all }))
      .sort((a, b) => b.count - a.count),
  };
}
