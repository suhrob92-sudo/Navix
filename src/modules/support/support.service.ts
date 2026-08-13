import { SupportTicketStatus, type SupportTicketCategory } from '@/generated/prisma/client';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/modules/notification/notification.service';
import {
  MAX_OPEN_TICKETS,
  isTicketClosed,
  type SupportCategoryName,
  type SupportStatusName,
  type SupportTicketListItem,
  type SupportTicketView,
} from '@/modules/support/support.types';
import type {
  AdminTicketQuery,
  CreateTicketInput,
  ReplyTicketInput,
  TicketQuery,
  UpdateTicketStatusInput,
} from '@/modules/support/support.schemas';

/**
 * Yordam xizmati.
 *
 * ── Nima uchun bu bo'lim kerak ────────────────────────────────────────
 * Shu paytgacha odamning savoli bo'lsa, boradigan joyi yo'q edi:
 * faqat elektron pochta manzili ko'rsatilgan. Telefonda ishlaydigan
 * odam esa pochta ilovasini ochib, xat yozib, javobini kutishi
 * kerak edi — bu amalda "murojaat yo'q" degani.
 *
 * ── Holat KIM yozganidan kelib chiqadi ────────────────────────────────
 * Holatni qo'lda qo'yish shart emas va bu ataylab shunday:
 *
 *   foydalanuvchi yozdi  → OPEN     (javob kutilmoqda)
 *   xodim javob yozdi    → ANSWERED (javob berilgan)
 *   xodim yakunladi      → RESOLVED yoki CLOSED
 *
 * Qo'lda qo'yiladigan holat ertami-kechmi haqiqatdan ajralib qoladi:
 * xodim javob yozib, holatni almashtirishni unutadi va murojaat
 * "javobsiz" bo'lib turaveradi.
 */

const MODULE = 'support';

/** Murojaat raqami: NVX-S-20260813-A1B2C3 */
function generateTicketNumber(): string {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('');

  return `NVX-S-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/** Ism va familiyani birlashtiradi. */
function personName(user: { firstName: string | null; lastName: string | null } | null): string | null {
  if (!user) return null;

  return [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
}

const TICKET_SELECT = {
  id: true,
  ticketNumber: true,
  subject: true,
  category: true,
  status: true,
  lastMessageAt: true,
  createdAt: true,
  _count: { select: { messages: true } },
} as const;

function toListItem(row: {
  id: string;
  ticketNumber: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  lastMessageAt: Date;
  createdAt: Date;
  _count: { messages: number };
}): SupportTicketListItem {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    subject: row.subject,
    category: row.category as SupportCategoryName,
    status: row.status as SupportStatusName,
    lastMessageAt: row.lastMessageAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    messageCount: row._count.messages,
  };
}

// ── Foydalanuvchi tomoni ──────────────────────────────────────────────

/**
 * Yangi murojaat ochadi.
 *
 * Murojaat va uning BIRINCHI xabari bitta tranzaksiyada yaratiladi:
 * xabarsiz murojaat xodimga bo'sh ko'rinardi va u nima haqida
 * ekanini bilmasdi.
 */
export async function createTicket(
  userId: string,
  input: CreateTicketInput,
  meta: OperationMeta = {},
): Promise<SupportTicketView> {
  const openCount = await prisma.supportTicket.count({
    where: { userId, status: { in: [SupportTicketStatus.OPEN, SupportTicketStatus.ANSWERED] } },
  });

  if (openCount >= MAX_OPEN_TICKETS) {
    throw new ConflictError(
      `Sizda ${MAX_OPEN_TICKETS} ta ochiq murojaat bor. Javobni kuting yoki eskisini yakunlang.`,
    );
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.supportTicket.create({
      data: {
        userId,
        ticketNumber: generateTicketNumber(),
        subject: input.subject,
        category: input.category as SupportTicketCategory,
      },
      select: { id: true },
    });

    await tx.supportMessage.create({
      data: { ticketId: created.id, authorId: userId, isStaff: false, body: input.message },
    });

    return created;
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.SUPPORT_TICKET_CREATED,
    resourceType: 'SupportTicket',
    resourceId: ticket.id,
    module: MODULE,
    /** Murojaat MATNI yozilmaydi — u jurnalda emas, o'z joyida turadi. */
    metadata: { category: input.category },
    ...meta,
  });

  logger.info({ userId, ticketId: ticket.id, category: input.category }, 'Yangi murojaat ochildi');

  return getMyTicket(userId, ticket.id);
}

export async function listMyTickets(userId: string, query: TicketQuery): Promise<SupportTicketListItem[]> {
  const active = [SupportTicketStatus.OPEN, SupportTicketStatus.ANSWERED];
  const finished = [SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED];

  const rows = await prisma.supportTicket.findMany({
    where: {
      userId,
      ...(query.status === 'ACTIVE' ? { status: { in: active } } : {}),
      ...(query.status === 'FINISHED' ? { status: { in: finished } } : {}),
    },
    select: TICKET_SELECT,
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
  });

  return rows.map(toListItem);
}

/**
 * Foydalanuvchining O'Z murojaati.
 *
 * So'rov `userId` bilan cheklangan: begona murojaatni ko'rish u
 * yoqda tursin, uning mavjudligini ham bilib bo'lmaydi (404).
 */
export async function getMyTicket(userId: string, ticketId: string): Promise<SupportTicketView> {
  const row = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
    select: {
      ...TICKET_SELECT,
      messages: {
        select: {
          id: true,
          body: true,
          isStaff: true,
          createdAt: true,
          author: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!row) {
    throw new NotFoundError('Murojaat');
  }

  return {
    ...toListItem(row),
    messages: row.messages.map((message) => ({
      id: message.id,
      body: message.body,
      isStaff: message.isStaff,
      /**
       * Xodimning ISMI ko'rsatilmaydi — "Navix jamoasi" deb yoziladi.
       *
       * Xodim ismi ko'rinsa, norozi odam uni ijtimoiy tarmoqdan topib
       * shaxsan bezovta qilishi mumkin. Javob esa jamoa nomidan
       * beriladi: xodim almashsa ham yozishma bir butun bo'lib
       * qolaveradi.
       */
      authorName: message.isStaff ? 'Navix jamoasi' : personName(message.author),
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

/** Foydalanuvchi o'z murojaatiga javob yozadi. */
export async function replyAsUser(
  userId: string,
  ticketId: string,
  input: ReplyTicketInput,
): Promise<SupportTicketView> {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
    select: { id: true, status: true },
  });

  if (!ticket) {
    throw new NotFoundError('Murojaat');
  }

  if (isTicketClosed(ticket.status as SupportStatusName)) {
    /**
     * Yopilgan murojaatga yozib bo'lmaydi.
     *
     * Aks holda oylar oldin yopilgan murojaat birdan "tirilib",
     * xodimlar navbatining tepasiga chiqib qolardi. Yangi masala —
     * yangi murojaat.
     */
    throw new ConflictError('Bu murojaat yakunlangan. Yangi murojaat oching.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.supportMessage.create({
      data: { ticketId, authorId: userId, isStaff: false, body: input.message },
    });

    await tx.supportTicket.update({
      where: { id: ticketId },
      // Foydalanuvchi yozdi — endi javob KUTILMOQDA.
      data: { status: SupportTicketStatus.OPEN, lastMessageAt: new Date() },
    });
  });

  logger.info({ userId, ticketId }, 'Foydalanuvchi murojaatga javob yozdi');

  return getMyTicket(userId, ticketId);
}

// ── Xodim tomoni ──────────────────────────────────────────────────────

export interface AdminTicketListResult {
  tickets: (SupportTicketListItem & { customerName: string; customerPhone: string })[];
  total: number;
  /** Javob kutayotgan murojaatlar soni — nishon (badge) uchun. */
  openCount: number;
}

export async function listAdminTickets(query: AdminTicketQuery): Promise<AdminTicketListResult> {
  const { skip, take } = toPrismaPagination(query);

  const where = {
    ...(query.status === 'ALL' ? {} : { status: query.status as SupportTicketStatus }),
    ...(query.category === 'ALL' ? {} : { category: query.category as SupportTicketCategory }),
    ...(query.search
      ? {
          OR: [
            { ticketNumber: { contains: query.search, mode: 'insensitive' as const } },
            { subject: { contains: query.search, mode: 'insensitive' as const } },
            { user: { phone: { contains: query.search } } },
          ],
        }
      : {}),
  };

  const [rows, total, openCount] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      select: {
        ...TICKET_SELECT,
        user: { select: { firstName: true, lastName: true, phone: true } },
      },
      /**
       * Saralash: OCHIQ murojaatlar birinchi, keyin vaqt bo'yicha.
       *
       * Faqat vaqt bo'yicha saralansa, javob berilgan murojaat
       * yangi kelgan murojaatdan yuqorida turardi — xodim esa
       * javob kutayotganini pastda qidirardi.
       */
      orderBy: [{ status: 'asc' }, { lastMessageAt: 'desc' }],
      skip,
      take,
    }),
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.count({ where: { status: SupportTicketStatus.OPEN } }),
  ]);

  return {
    tickets: rows.map((row) => ({
      ...toListItem(row),
      customerName: personName(row.user) ?? 'Nomsiz',
      customerPhone: row.user.phone,
    })),
    total,
    openCount,
  };
}

/** Xodim uchun murojaat — foydalanuvchi ma'lumoti bilan. */
export async function getAdminTicket(ticketId: string): Promise<SupportTicketView> {
  const row = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      ...TICKET_SELECT,
      user: { select: { id: true, firstName: true, lastName: true, phone: true } },
      assignee: { select: { firstName: true, lastName: true } },
      messages: {
        select: {
          id: true,
          body: true,
          isStaff: true,
          createdAt: true,
          author: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!row) {
    throw new NotFoundError('Murojaat');
  }

  return {
    ...toListItem(row),
    customer: {
      id: row.user.id,
      name: personName(row.user) ?? 'Nomsiz',
      phone: row.user.phone,
    },
    assigneeName: personName(row.assignee),
    messages: row.messages.map((message) => ({
      id: message.id,
      body: message.body,
      isStaff: message.isStaff,
      // Xodim panelida esa ismlar ko'rinadi — kim javob berganini
      // bilish ish taqsimoti uchun kerak.
      authorName: personName(message.author),
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

/**
 * Xodim javob yozadi.
 *
 * Javob yozgan xodim murojaatni O'ZIGA biriktiradi — shunda ikki
 * xodim bir murojaatga ikki xil javob yozib qo'ymaydi.
 */
export async function replyAsStaff(
  staffId: string,
  ticketId: string,
  input: ReplyTicketInput,
  meta: OperationMeta = {},
): Promise<SupportTicketView> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, status: true, userId: true, ticketNumber: true, subject: true, assigneeId: true },
  });

  if (!ticket) {
    throw new NotFoundError('Murojaat');
  }

  if (isTicketClosed(ticket.status as SupportStatusName)) {
    throw new ConflictError("Bu murojaat yakunlangan — unga javob yozib bo'lmaydi.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.supportMessage.create({
      data: { ticketId, authorId: staffId, isStaff: true, body: input.message },
    });

    await tx.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: SupportTicketStatus.ANSWERED,
        lastMessageAt: new Date(),
        // Egasiz bo'lsa — javob yozgan xodimniki.
        ...(ticket.assigneeId ? {} : { assigneeId: staffId }),
      },
    });
  });

  await recordAudit({
    actorId: staffId,
    action: AuditAction.SUPPORT_TICKET_ANSWERED,
    resourceType: 'SupportTicket',
    resourceId: ticketId,
    module: MODULE,
    metadata: { ticketNumber: ticket.ticketNumber, customerId: ticket.userId },
    ...meta,
  });

  // Odam javobni KUTIB o'tirmasligi kerak — unga xabar boradi.
  await notifyUser(ticket.userId, 'support.replied', {
    ticketId,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
  });

  logger.info({ staffId, ticketId }, 'Xodim murojaatga javob berdi');

  return getAdminTicket(ticketId);
}

/** Murojaatni yakunlaydi. */
export async function updateTicketStatus(
  staffId: string,
  ticketId: string,
  input: UpdateTicketStatusInput,
  meta: OperationMeta = {},
): Promise<SupportTicketView> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, status: true, userId: true, ticketNumber: true, subject: true },
  });

  if (!ticket) {
    throw new NotFoundError('Murojaat');
  }

  if (isTicketClosed(ticket.status as SupportStatusName)) {
    throw new ConflictError('Bu murojaat allaqachon yakunlangan.');
  }

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: input.status as SupportTicketStatus, resolvedAt: new Date() },
  });

  await recordAudit({
    actorId: staffId,
    action: AuditAction.SUPPORT_TICKET_CLOSED,
    resourceType: 'SupportTicket',
    resourceId: ticketId,
    module: MODULE,
    metadata: { ticketNumber: ticket.ticketNumber, status: input.status },
    ...meta,
  });

  /**
   * Xabar faqat HAL QILINGANDA yuboriladi.
   *
   * `CLOSED` — bu spam yoki takroriy murojaat uchun. Bunday
   * murojaat egasiga "sizning murojaatingiz yopildi" degan xabar
   * yuborish faqat yangi savol tug'dirardi.
   */
  if (input.status === 'RESOLVED') {
    await notifyUser(ticket.userId, 'support.resolved', {
      ticketId,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
    });
  }

  logger.info({ staffId, ticketId, status: input.status }, 'Murojaat yakunlandi');

  return getAdminTicket(ticketId);
}
