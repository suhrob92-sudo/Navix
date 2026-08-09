import { BookingStatus, Prisma, TransportType } from '@/generated/prisma/client';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { isoWeekday, toDateKey } from '@/lib/date';
import { logger } from '@/lib/logger';
import { tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/modules/notification/notification.service';
import {
  chargeWallet,
  findTransactionByIdempotencyKey,
  getOrCreateWallet,
  refundWallet,
} from '@/modules/wallet/wallet.service';
import { arrivalAt, calculateRefundTiyin, canCancelTicket, departureAt } from '@/modules/travel/travel.types';
import type { TicketView, TransportName, TripView } from '@/modules/travel/travel.types';
import type {
  CancelTicketInput,
  CreateTicketInput,
  TicketQuery,
  TripQuery,
} from '@/modules/travel/travel.schemas';

/**
 * Sayohat moduli.
 *
 * ── Modulning ENG NOZIK joyi: bo'sh o'rinlar ──────────────────────────
 * Bitta o'rinni ikki kishiga sotib bo'lmaydi. Reys esa bazada qator
 * sifatida yo'q — u "jadval + sana" dan hisoblanadi. Shuning uchun
 * bo'sh o'rinlar SOTILGAN chiptalarni qo'shib chiqarish orqali
 * topiladi:
 *
 *     bo'sh = jadval.totalSeats − Σ(shu jadval, shu sanadagi chiptalar)
 *
 * ── Raqobatdan himoya ─────────────────────────────────────────────────
 * Ikki so'rov bir vaqtda kelsa, ikkalasi ham "oxirgi o'rin bor" deb
 * ko'rishi mumkin. Shuning uchun JADVAL qatori `SELECT ... FOR UPDATE`
 * bilan qulflanadi — hamyon va mehmonxonadagi bilan bir xil naqsh.
 *
 * Qulf jadval darajasida, ya'ni bitta reysning turli KUNLARIGA
 * kelgan so'rovlar ham navbatga turadi. Bu ataylab: sana bo'yicha
 * qulflash uchun har kun uchun alohida qator kerak bo'lardi va butun
 * "jadval" g'oyasi buzilardi. Bir jadvalga soniyasiga o'nlab chipta
 * sotilmaydi, shuning uchun navbatning zarari sezilmaydi.
 */

const MODULE = 'travel';

/**
 * Bitta qidiruvda ko'riladigan jadvallar chegarasi.
 *
 * Reyslar ro'yxati sahifalanmaydi: bitta yo'nalishda kuniga o'nlab
 * reys bo'lmaydi, sahifalash esa "o'tib ketgan reyslarni yashirish"
 * bilan chalkashardi (birinchi sahifada 3 ta ko'rinib, "5 ta topildi"
 * deb yozilardi). Chegara faqat kutilmagan ulkan jadvaldan himoya.
 */
const MAX_TRIPS_PER_SEARCH = 100;

const SCHEDULE_SELECT = {
  id: true,
  code: true,
  carrier: true,
  transport: true,
  fromCity: true,
  toCity: true,
  departTime: true,
  durationMinutes: true,
  weekdays: true,
  priceTiyin: true,
  totalSeats: true,
} as const;

type ScheduleRow = Prisma.TripScheduleGetPayload<{ select: typeof SCHEDULE_SELECT }>;

/**
 * Jadval va sanadan bitta reys yasaydi.
 *
 * @param soldSeats Shu kuni sotilgan o'rinlar soni.
 */
function toTripView(row: ScheduleRow, departDate: string, soldSeats: number): TripView {
  const departAt = departureAt(departDate, row.departTime);
  const arriveAt = arrivalAt(departAt, row.durationMinutes);

  return {
    scheduleId: row.id,
    code: row.code,
    carrier: row.carrier,
    transport: row.transport as TransportName,
    fromCity: row.fromCity,
    toCity: row.toCity,
    departDate,
    departAt: departAt.toISOString(),
    arriveAt: arriveAt.toISOString(),
    durationMinutes: row.durationMinutes,
    priceTiyin: tiyinToNumber(row.priceTiyin),
    totalSeats: row.totalSeats,
    availableSeats: Math.max(0, row.totalSeats - soldSeats),
  };
}

/**
 * Berilgan sanada har bir jadvaldan nechta o'rin sotilgan.
 *
 * BITTA so'rovda hisoblanadi: har reys uchun alohida so'rov yuborilsa,
 * o'nta reysli qidiruv o'n bitta so'rov qilardi.
 */
async function countSoldSeats(scheduleIds: string[], departDate: string): Promise<Map<string, number>> {
  if (scheduleIds.length === 0) return new Map();

  const rows = await prisma.tripBooking.groupBy({
    by: ['scheduleId'],
    where: {
      scheduleId: { in: scheduleIds },
      departDate: new Date(`${departDate}T00:00:00Z`),
      status: BookingStatus.CONFIRMED,
    },
    _sum: { seats: true },
  });

  return new Map(rows.map((row) => [row.scheduleId, row._sum.seats ?? 0]));
}

export async function listTrips(
  query: TripQuery,
): Promise<{ trips: TripView[]; total: number; cities: string[] }> {
  const weekday = isoWeekday(query.date);

  const where: Prisma.TripScheduleWhereInput = {
    isActive: true,
    fromCity: { equals: query.from, mode: 'insensitive' },
    toCity: { equals: query.to, mode: 'insensitive' },
    // Reys shu hafta kunida qatnaydimi — PostgreSQL massivni o'zi qidiradi.
    weekdays: { has: weekday },
    ...(query.transport ? { transport: query.transport as TransportType } : {}),
  };

  const [rows, cityRows] = await Promise.all([
    prisma.tripSchedule.findMany({
      where,
      select: SCHEDULE_SELECT,
      orderBy: query.sort === 'price' ? [{ priceTiyin: 'asc' }] : [{ departTime: 'asc' }],
      take: MAX_TRIPS_PER_SEARCH,
    }),
    prisma.tripSchedule.groupBy({ by: ['fromCity'], where: { isActive: true }, _count: { _all: true } }),
  ]);

  const sold = await countSoldSeats(
    rows.map((row) => row.id),
    query.date,
  );

  const now = Date.now();

  const trips = rows
    .map((row) => toTripView(row, query.date, sold.get(row.id) ?? 0))
    /**
     * Jo'nab ketgan reyslarni yashiramiz.
     *
     * Bugungi sana tanlanganda jadvaldagi ertalabki reys allaqachon
     * ketgan bo'lishi mumkin. Uni ro'yxatda qoldirish foydalanuvchini
     * chalg'itardi: u chiptani tanlab, keyin rad javobini olardi.
     */
    .filter((trip) => Date.parse(trip.departAt) > now);

  return { trips, total: trips.length, cities: cityRows.map((row) => row.fromCity).sort() };
}

export async function getTrip(scheduleId: string, departDate: string): Promise<TripView> {
  const row = await prisma.tripSchedule.findFirst({
    where: { id: scheduleId, isActive: true },
    select: SCHEDULE_SELECT,
  });

  if (!row || !row.weekdays.includes(isoWeekday(departDate))) {
    /**
     * Jadval bor, lekin shu kuni qatnamaydi — bu ham "topilmadi".
     *
     * Alohida xato matni kerak emas: foydalanuvchi uchun natija bir
     * xil — bu kuni bu reys yo'q.
     */
    throw new NotFoundError('Reys');
  }

  const sold = await countSoldSeats([row.id], departDate);

  return toTripView(row, departDate, sold.get(row.id) ?? 0);
}

// ── Chiptalar ─────────────────────────────────────────────────────────

const TICKET_SELECT = {
  id: true,
  ticketNumber: true,
  status: true,
  departDate: true,
  departAt: true,
  arriveAt: true,
  seats: true,
  pricePerSeat: true,
  totalTiyin: true,
  refundTiyin: true,
  passengerName: true,
  passengerPhone: true,
  cancelReason: true,
  createdAt: true,
  schedule: {
    select: { id: true, code: true, carrier: true, transport: true, fromCity: true, toCity: true },
  },
} as const;

type TicketRow = Prisma.TripBookingGetPayload<{ select: typeof TICKET_SELECT }>;

function toTicketView(row: TicketRow): TicketView {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    status: row.status,
    departDate: toDateKey(row.departDate),
    departAt: row.departAt.toISOString(),
    arriveAt: row.arriveAt.toISOString(),
    seats: row.seats,
    pricePerSeat: tiyinToNumber(row.pricePerSeat),
    totalTiyin: tiyinToNumber(row.totalTiyin),
    refundTiyin: row.refundTiyin === null ? null : tiyinToNumber(row.refundTiyin),
    passengerName: row.passengerName,
    passengerPhone: row.passengerPhone,
    cancelReason: row.cancelReason,
    createdAt: row.createdAt.toISOString(),
    trip: {
      scheduleId: row.schedule.id,
      code: row.schedule.code,
      carrier: row.schedule.carrier,
      transport: row.schedule.transport as TransportName,
      fromCity: row.schedule.fromCity,
      toCity: row.schedule.toCity,
    },
  };
}

/** Chipta raqami: NVX-T-20260810-A1B2C3 */
function generateTicketNumber(): string {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('');

  return `NVX-T-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createTicket(
  userId: string,
  input: CreateTicketInput,
  meta: OperationMeta = {},
): Promise<TicketView> {
  /**
   * TAKRORIY so'rov — tugma ikki marta bosilgan.
   *
   * Xato ko'rsatish o'rniga birinchi chiptaning O'ZI qaytariladi:
   * bu foydalanuvchining aybi emas va unga xato ko'rsatish "pul
   * ikki marta yechildimi?" degan qo'rquv tug'diradi.
   */
  const duplicate = await findTransactionByIdempotencyKey(input.idempotencyKey);

  if (duplicate?.sourceId) {
    return getTicket(userId, duplicate.sourceId);
  }

  const schedule = await prisma.tripSchedule.findFirst({
    where: { id: input.scheduleId, isActive: true },
    select: SCHEDULE_SELECT,
  });

  if (!schedule) {
    throw new NotFoundError('Reys');
  }

  if (!schedule.weekdays.includes(isoWeekday(input.departDate))) {
    throw new ConflictError('Bu reys tanlangan kuni qatnamaydi. Boshqa sana tanlang.');
  }

  const departAt = departureAt(input.departDate, schedule.departTime);

  /**
   * Aniq SOAT tekshiruvi.
   *
   * Validatsiya faqat kunni ko'radi, shuning uchun bugungi ertalabki
   * reys u yerdan o'tib ketadi. Haqiqiy chegara shu yerda.
   */
  if (departAt.getTime() <= Date.now()) {
    throw new ConflictError("Bu reys allaqachon jo'nab ketgan. Keyingi reysni tanlang.");
  }

  const arriveAt = arrivalAt(departAt, schedule.durationMinutes);

  /**
   * Summa SERVERDA hisoblanadi — mijozdan kelgan narxga ishonilmaydi.
   */
  const totalTiyin = schedule.priceTiyin * BigInt(input.seats);

  const wallet = await getOrCreateWallet(userId);
  const ticketNumber = generateTicketNumber();
  const departDate = new Date(`${input.departDate}T00:00:00Z`);

  const created = await prisma.$transaction(async (tx) => {
    /**
     * Jadval qatorini QULFLAYMIZ.
     *
     * Qulfsiz ikki so'rov bir vaqtda "oxirgi o'rin bor" deb ko'rib,
     * ikkalasi ham sotib olardi. Qulf bilan ikkinchisi birinchisi
     * tugaguncha kutadi va allaqachon yangilangan holatni ko'radi.
     */
    await tx.$queryRaw`SELECT id FROM trip_schedules WHERE id = ${schedule.id}::uuid FOR UPDATE`;

    const sold = await tx.tripBooking.aggregate({
      where: { scheduleId: schedule.id, departDate, status: BookingStatus.CONFIRMED },
      _sum: { seats: true },
    });

    const soldSeats = sold._sum.seats ?? 0;
    const free = schedule.totalSeats - soldSeats;

    if (free < input.seats) {
      throw new ConflictError(
        free <= 0
          ? "Bu reysda bo'sh o'rin qolmadi. Boshqa reys yoki sana tanlang."
          : `Bu reysda faqat ${free} ta o'rin qoldi.`,
      );
    }

    const ticket = await tx.tripBooking.create({
      data: {
        userId,
        scheduleId: schedule.id,
        ticketNumber,
        departDate,
        departAt,
        arriveAt,
        seats: input.seats,
        pricePerSeat: schedule.priceTiyin,
        totalTiyin,
        passengerName: input.passengerName,
        passengerPhone: input.passengerPhone,
      },
      select: { id: true },
    });

    const charge = await chargeWallet(tx, {
      userId,
      walletId: wallet.id,
      amountTiyin: totalTiyin,
      description: `${schedule.fromCity} → ${schedule.toCity} · ${schedule.code}`,
      sourceModule: MODULE,
      sourceId: ticket.id,
      idempotencyKey: input.idempotencyKey,
    });

    return tx.tripBooking.update({
      where: { id: ticket.id },
      data: { walletTransactionId: charge.id },
      select: TICKET_SELECT,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.TRAVEL_TICKET_CREATED,
    resourceType: 'TripBooking',
    resourceId: created.id,
    module: MODULE,
    metadata: {
      ticketNumber,
      route: `${schedule.fromCity} → ${schedule.toCity}`,
      code: schedule.code,
      seats: input.seats,
      amountTiyin: totalTiyin.toString(),
    },
    ...meta,
  });

  await notifyUser(userId, 'travel.ticket_created', {
    ticketId: created.id,
    ticketNumber,
    fromCity: schedule.fromCity,
    toCity: schedule.toCity,
    departDate: input.departDate,
    departTime: schedule.departTime,
    seats: input.seats,
    amountTiyin: tiyinToNumber(totalTiyin),
  });

  logger.info({ userId, ticketId: created.id, ticketNumber }, 'Chipta sotib olindi');

  return toTicketView(created);
}

function buildTicketFilter(status: TicketQuery['status']): Prisma.TripBookingWhereInput {
  if (status === 'ALL') return {};

  /**
   * "Kelgusi" — hali jo'namagan reyslar.
   *
   * Holat bo'yicha emas, VAQT bo'yicha aniqlanadi: chipta tasdiqlangan
   * bo'lsa-yu, reys kecha ketgan bo'lsa, u endi kelgusi emas.
   */
  if (status === 'UPCOMING') {
    return { status: BookingStatus.CONFIRMED, departAt: { gt: new Date() } };
  }

  if (status === 'COMPLETED') {
    return {
      status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
      departAt: { lte: new Date() },
    };
  }

  return { status: BookingStatus.CANCELLED };
}

export async function listTickets(
  userId: string,
  query: TicketQuery,
): Promise<{ tickets: TicketView[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  const where: Prisma.TripBookingWhereInput = { userId, ...buildTicketFilter(query.status) };

  const [rows, total] = await Promise.all([
    prisma.tripBooking.findMany({
      where,
      select: TICKET_SELECT,
      orderBy: { departAt: query.order },
      skip,
      take,
    }),
    prisma.tripBooking.count({ where }),
  ]);

  return { tickets: rows.map(toTicketView), total };
}

/**
 * Bitta chipta.
 *
 * Egalik sharti shu yerda: begona chiptada yo'lovchining ismi va
 * telefon raqami bor.
 */
export async function getTicket(userId: string, ticketId: string): Promise<TicketView> {
  const row = await prisma.tripBooking.findFirst({
    where: { id: ticketId, userId },
    select: TICKET_SELECT,
  });

  if (!row) {
    throw new NotFoundError('Chipta');
  }

  return toTicketView(row);
}

/**
 * Chiptani bekor qiladi va pulni (to'liq yoki qisman) qaytaradi.
 *
 * Qaytariladigan summa qoidasi `travel.types.ts` da — u yerda, chunki
 * brauzer ham xuddi shu hisobni ko'rsatadi.
 */
export async function cancelTicket(
  userId: string,
  ticketId: string,
  input: CancelTicketInput,
  meta: OperationMeta = {},
): Promise<TicketView> {
  const ticket = await prisma.tripBooking.findFirst({
    where: { id: ticketId, userId },
    select: {
      id: true,
      ticketNumber: true,
      status: true,
      departAt: true,
      totalTiyin: true,
      schedule: { select: { fromCity: true, toCity: true } },
    },
  });

  if (!ticket) {
    throw new NotFoundError('Chipta');
  }

  if (!canCancelTicket({ status: ticket.status, departAt: ticket.departAt })) {
    throw new ConflictError(
      ticket.status === BookingStatus.CANCELLED
        ? 'Bu chipta allaqachon bekor qilingan.'
        : "Reys jo'nab ketgan — chiptani bekor qilib bo'lmaydi.",
    );
  }

  const refundTiyin = calculateRefundTiyin(ticket.totalTiyin, ticket.departAt);

  await prisma.$transaction(async (tx) => {
    // Eski holat sharti — shu oniyda boshqa so'rov bekor qilgan bo'lishi mumkin.
    const updated = await tx.tripBooking.updateMany({
      where: { id: ticket.id, status: BookingStatus.CONFIRMED },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: input.reason ?? null,
        refundTiyin,
      },
    });

    if (updated.count === 0) {
      throw new ConflictError("Chipta holati o'zgardi. Sahifani yangilang.");
    }

    /**
     * Nol summani qaytarmaymiz.
     *
     * Hozirgi qoidada bu holat yuz bermaydi (bekor qilish faqat
     * jo'nashdan oldin mumkin, jarima esa 100% emas). Lekin qoida
     * ertaga o'zgarishi mumkin, hamyonga esa nol summali yozuv
     * tushmasligi kerak — u tarixni chalg'itardi.
     */
    if (refundTiyin > 0n) {
      const wallet = await getOrCreateWallet(userId);

      await refundWallet(tx, {
        walletId: wallet.id,
        amountTiyin: refundTiyin,
        description: `Chipta ${ticket.ticketNumber} bekor qilindi`,
        sourceModule: MODULE,
        sourceId: ticket.id,
        idempotencyKey: `ticket-refund-${ticket.id}`,
      });
    }
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.TRAVEL_TICKET_CANCELLED,
    resourceType: 'TripBooking',
    resourceId: ticket.id,
    module: MODULE,
    metadata: {
      ticketNumber: ticket.ticketNumber,
      paidTiyin: ticket.totalTiyin.toString(),
      refundTiyin: refundTiyin.toString(),
    },
    ...meta,
  });

  await notifyUser(userId, 'travel.ticket_cancelled', {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    fromCity: ticket.schedule.fromCity,
    toCity: ticket.schedule.toCity,
    refundTiyin: tiyinToNumber(refundTiyin),
    paidTiyin: tiyinToNumber(ticket.totalTiyin),
  });

  logger.info({ userId, ticketId: ticket.id, refundTiyin: refundTiyin.toString() }, 'Chipta bekor qilindi');

  return getTicket(userId, ticket.id);
}
