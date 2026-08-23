import { BookingStatus, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { runIdempotent } from '@/lib/idempotency';
import { logger } from '@/lib/logger';
import { somToTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { toSearchText } from '@/lib/search';
import type { ServiceColor } from '@/config/modules';
import { notifyUser } from '@/modules/notification/notification.service';
import {
  chargeWallet,
  findTransactionByIdempotencyKey,
  getOrCreateWallet,
  refundWallet,
} from '@/modules/wallet/wallet.service';
import { canCancelBooking, countNights, toDateKey } from '@/modules/hotel/hotel.types';
import {
  GALLERY_SELECT,
  THUMB_SELECT,
  toGallery,
  toThumb,
} from '@/modules/catalog/catalog-image.select';
import type { BookingView, HotelDetail, HotelListItem, HotelRoomView } from '@/modules/hotel/hotel.types';
import type {
  BookingQuery,
  CancelBookingInput,
  CreateBookingInput,
  HotelQuery,
} from '@/modules/hotel/hotel.schemas';

/**
 * Mehmonxona moduli.
 *
 * ── Modulning ENG NOZIK joyi: bo'sh joy ───────────────────────────────
 * Bitta xonani ikki kishiga sotib bo'lmaydi. Buni tekshirish esa
 * oddiy "bormi?" savoli emas: bandlovlar SANA ORALIG'I bo'yicha
 * kesishadi.
 *
 * Ikki oraliq kesishadi, agar:
 *
 *     yangi.kirish < mavjud.chiqish  VA  yangi.chiqish > mavjud.kirish
 *
 * Chegaralar ATAYLAB qat'iy (`<`, `>`): bir mehmon 9-avgustda
 * chiqsa, ikkinchisi o'sha kuni kirishi mumkin — xona bo'shaydi.
 *
 * ── Raqobatdan himoya ─────────────────────────────────────────────────
 * Ikki so'rov bir vaqtda kelsa, ikkalasi ham "bitta xona bor" deb
 * ko'rishi mumkin. Shuning uchun xona qatori `SELECT ... FOR UPDATE`
 * bilan QULFLANADI — hamyondagi bilan bir xil naqsh.
 *
 * ── Nima uchun mehmonxona kabineti yo'q ───────────────────────────────
 * Ovqat va Marketplace'da sotuvchi buyurtmani qabul qilishi kerak edi.
 * Bu yerda esa xona bo'shligi bandlov paytida tekshiriladi va darhol
 * biriktiriladi — kutadigan hech kim yo'q.
 */

const MODULE = 'hotel';

// ── Mehmonxonalar ─────────────────────────────────────────────────────

const HOTEL_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  city: true,
  address: true,
  stars: true,
  rating: true,
  ratingCount: true,
  amenities: true,
  color: true,
  images: THUMB_SELECT,
  rooms: {
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      capacity: true,
      pricePerNight: true,
      totalRooms: true,
      images: THUMB_SELECT,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

type HotelRow = Prisma.HotelGetPayload<{ select: typeof HOTEL_SELECT }>;

function cheapestPrice(rooms: HotelRow['rooms']): number | null {
  if (rooms.length === 0) return null;

  return rooms.reduce(
    (min, room) => Math.min(min, tiyinToNumber(room.pricePerNight)),
    Number.POSITIVE_INFINITY,
  );
}

function toHotelListItem(row: HotelRow): HotelListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    city: row.city,
    address: row.address,
    stars: row.stars,
    rating: row.rating,
    ratingCount: row.ratingCount,
    amenities: row.amenities,
    color: row.color as ServiceColor,
    fromPrice: cheapestPrice(row.rooms),
    image: toThumb(row.images),
  };
}

function buildHotelOrder(sort: HotelQuery['sort']): Prisma.HotelOrderByWithRelationInput[] {
  if (sort === 'rating') return [{ rating: 'desc' }, { ratingCount: 'desc' }];

  /**
   * Narx bo'yicha saralash bu yerda TO'LIQ emas.
   *
   * "Eng arzon xona" mehmonxonaning o'zida emas, xonalarida — va
   * Prisma bog'langan jadval bo'yicha saralay olmaydi. Shuning uchun
   * tartib xotirada beriladi (`sortByPrice`), bu esa faqat joriy
   * sahifaga ta'sir qiladi.
   *
   * Bu ataylab: to'liq saralash uchun "eng arzon narx" ustuni kerak
   * bo'lardi va u har narx o'zgarganda yangilanishi shart edi —
   * hozircha bu murakkablik oqlanmaydi.
   */
  return [{ sortOrder: 'asc' }, { rating: 'desc' }];
}

export async function listHotels(
  query: HotelQuery,
): Promise<{ hotels: HotelListItem[]; total: number; cities: string[] }> {
  const { skip, take } = toPrismaPagination(query);
  const needle = query.search ? toSearchText(query.search) : null;

  const where: Prisma.HotelWhereInput = {
    isActive: true,
    ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
    ...(query.maxPriceSom === undefined
      ? {}
      : { rooms: { some: { isActive: true, pricePerNight: { lte: somToTiyin(query.maxPriceSom) } } } }),
    ...(needle && needle.length > 0
      ? {
          OR: [
            // So'z boshidan moslik — sabab `src/lib/search.ts` da.
            { searchName: { startsWith: needle } },
            { searchName: { contains: ` ${needle}` } },
            { city: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, total, cityRows] = await Promise.all([
    prisma.hotel.findMany({ where, select: HOTEL_SELECT, orderBy: buildHotelOrder(query.sort), skip, take }),
    prisma.hotel.count({ where }),
    prisma.hotel.groupBy({ by: ['city'], where: { isActive: true }, _count: { _all: true } }),
  ]);

  const hotels = rows.map(toHotelListItem);

  if (query.sort === 'price') {
    hotels.sort((a, b) => (a.fromPrice ?? Number.POSITIVE_INFINITY) - (b.fromPrice ?? Number.POSITIVE_INFINITY));
  }

  return { hotels, total, cities: cityRows.map((row) => row.city).sort() };
}

/**
 * Berilgan sanalarda har bir xonadan nechtasi band.
 *
 * BITTA so'rovda hisoblanadi: har xona uchun alohida so'rov
 * yuborilsa, beshta xonali mehmonxona oltita so'rov qilardi.
 */
async function countBookedRooms(roomIds: string[], checkIn: string, checkOut: string): Promise<Map<string, number>> {
  if (roomIds.length === 0) return new Map();

  const rows = await prisma.hotelBooking.groupBy({
    by: ['roomId'],
    where: {
      roomId: { in: roomIds },
      status: BookingStatus.CONFIRMED,
      // Kesishish sharti — sabab fayl boshida.
      checkIn: { lt: new Date(`${checkOut}T00:00:00Z`) },
      checkOut: { gt: new Date(`${checkIn}T00:00:00Z`) },
    },
    _count: { _all: true },
  });

  return new Map(rows.map((row) => [row.roomId, row._count._all]));
}

export async function getHotel(
  slug: string,
  dates: { checkIn?: string; checkOut?: string },
): Promise<HotelDetail> {
  /**
   * Batafsil sahifada butun galereya olinadi.
   *
   * Ro'yxatdagi `HOTEL_SELECT` faqat bitta rasm oladi — u yerda
   * ko'proq rasm bekorga trafik sarflardi. Bu yerda esa odam aynan
   * rasmlarni ko'rish uchun kirgan.
   */
  const row = await prisma.hotel.findFirst({
    where: { slug, isActive: true },
    select: { ...HOTEL_SELECT, images: GALLERY_SELECT },
  });

  if (!row) {
    throw new NotFoundError('Mehmonxona');
  }

  const hasDates = dates.checkIn !== undefined && dates.checkOut !== undefined;

  const booked = hasDates
    ? await countBookedRooms(
        row.rooms.map((room) => room.id),
        dates.checkIn!,
        dates.checkOut!,
      )
    : new Map<string, number>();

  const rooms: HotelRoomView[] = row.rooms.map((room) => ({
    id: room.id,
    name: room.name,
    description: room.description,
    capacity: room.capacity,
    pricePerNight: tiyinToNumber(room.pricePerNight),
    /**
     * Sana berilmagan bo'lsa `null` — "hali hisoblanmagan".
     *
     * `0` esa "band" degani. Ikkalasini bir xil ko'rsatish
     * foydalanuvchini chalg'itardi.
     */
    availableRooms: hasDates ? Math.max(0, room.totalRooms - (booked.get(room.id) ?? 0)) : null,
    image: toThumb(room.images),
  }));

    /**
   * Ro'yxat ko'rinishi asosiy rasmni kutadi, bu yerda esa butun
   * galereya bor — birinchisi aynan asosiysi (tartib bo'yicha).
   */
  return { ...toHotelListItem({ ...row, images: row.images.slice(0, 1) }), rooms, images: toGallery(row.images) };
}

// ── Bandlovlar ────────────────────────────────────────────────────────

const BOOKING_SELECT = {
  id: true,
  bookingNumber: true,
  status: true,
  checkIn: true,
  checkOut: true,
  nights: true,
  guests: true,
  pricePerNight: true,
  totalTiyin: true,
  guestName: true,
  guestPhone: true,
  cancelReason: true,
  createdAt: true,
  room: {
    select: {
      id: true,
      name: true,
      hotel: { select: { id: true, slug: true, name: true, city: true, address: true, color: true } },
    },
  },
} as const;

type BookingRow = Prisma.HotelBookingGetPayload<{ select: typeof BOOKING_SELECT }>;

function toBookingView(row: BookingRow): BookingView {
  return {
    id: row.id,
    bookingNumber: row.bookingNumber,
    status: row.status,
    checkIn: toDateKey(row.checkIn),
    checkOut: toDateKey(row.checkOut),
    nights: row.nights,
    guests: row.guests,
    pricePerNight: tiyinToNumber(row.pricePerNight),
    totalTiyin: tiyinToNumber(row.totalTiyin),
    guestName: row.guestName,
    guestPhone: row.guestPhone,
    cancelReason: row.cancelReason,
    createdAt: row.createdAt.toISOString(),
    hotel: {
      id: row.room.hotel.id,
      slug: row.room.hotel.slug,
      name: row.room.hotel.name,
      city: row.room.hotel.city,
      address: row.room.hotel.address,
      color: row.room.hotel.color as ServiceColor,
    },
    room: { id: row.room.id, name: row.room.name },
  };
}

/** Bandlov raqami: NVX-H-20260806-A1B2C3 */
function generateBookingNumber(): string {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('');

  return `NVX-H-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createBooking(
  userId: string,
  input: CreateBookingInput,
  meta: OperationMeta = {},
): Promise<BookingView> {
  /**
   * Bir vaqtda kelgan takroriy so'rov.
   *
   * Pastdagi tekshiruv ketma-ket so'rovlar uchun yetarli. Ikkita
   * so'rov BIR VAQTDA kelsa esa ikkalasi ham "yo'q" deb ko'radi va
   * ikkinchisi yagona indeksga urilib, 500 qaytarardi.
   */
  return runIdempotent(
    () => performCreateBooking(userId, input, meta),
    async () => {
      const duplicate = await findTransactionByIdempotencyKey(input.idempotencyKey);

      return duplicate?.sourceId ? getBooking(userId, duplicate.sourceId) : null;
    },
  );
}

async function performCreateBooking(
  userId: string,
  input: CreateBookingInput,
  meta: OperationMeta,
): Promise<BookingView> {
  /**
   * TAKRORIY so'rov — tugma ikki marta bosilgan.
   *
   * Xato ko'rsatish o'rniga birinchi bandlovning O'ZI qaytariladi.
   * Sabab posilka modulida batafsil yozilgan: bu foydalanuvchining
   * aybi emas va unga xato ko'rsatish qo'rquv tug'diradi.
   */
  const duplicate = await findTransactionByIdempotencyKey(input.idempotencyKey);

  if (duplicate?.sourceId) {
    return getBooking(userId, duplicate.sourceId);
  }

  const room = await prisma.hotelRoom.findFirst({
    where: { id: input.roomId, isActive: true, hotel: { isActive: true } },
    select: {
      id: true,
      name: true,
      capacity: true,
      pricePerNight: true,
      totalRooms: true,
      hotel: { select: { name: true } },
    },
  });

  if (!room) {
    throw new NotFoundError('Xona');
  }

  if (input.guests > room.capacity) {
    throw new ConflictError(`Bu xonaga ${room.capacity} kishi sig'adi. Kattaroq xona tanlang.`);
  }

  /**
   * Kechalar va summa SERVERDA hisoblanadi.
   *
   * Mijozdan kelgan summaga ishonib bo'lmaydi — so'rovni tahrirlab
   * 10 kechani bir kecha narxiga band qilish mumkin bo'lardi.
   */
  const nights = countNights(input.checkIn, input.checkOut);
  const totalTiyin = room.pricePerNight * BigInt(nights);

  const wallet = await getOrCreateWallet(userId);
  const bookingNumber = generateBookingNumber();

  const checkInDate = new Date(`${input.checkIn}T00:00:00Z`);
  const checkOutDate = new Date(`${input.checkOut}T00:00:00Z`);

  const created = await prisma.$transaction(async (tx) => {
    /**
     * Xona qatorini QULFLAYMIZ.
     *
     * Qulfsiz ikki so'rov bir vaqtda "bitta xona bor" deb ko'rib,
     * ikkalasi ham band qilardi. Qulf bilan ikkinchisi birinchisi
     * tugaguncha kutadi va allaqachon yangilangan holatni ko'radi.
     */
    await tx.$queryRaw`SELECT id FROM hotel_rooms WHERE id = ${room.id}::uuid FOR UPDATE`;

    const overlapping = await tx.hotelBooking.count({
      where: {
        roomId: room.id,
        status: BookingStatus.CONFIRMED,
        checkIn: { lt: checkOutDate },
        checkOut: { gt: checkInDate },
      },
    });

    if (overlapping >= room.totalRooms) {
      throw new ConflictError('Bu sanalarda bo\'sh xona qolmadi. Boshqa sana yoki xona tanlang.');
    }

    const booking = await tx.hotelBooking.create({
      data: {
        userId,
        roomId: room.id,
        bookingNumber,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        nights,
        guests: input.guests,
        pricePerNight: room.pricePerNight,
        totalTiyin,
        guestName: input.guestName,
        guestPhone: input.guestPhone,
      },
      select: { id: true },
    });

    const charge = await chargeWallet(tx, {
      userId,
      walletId: wallet.id,
      amountTiyin: totalTiyin,
      description: `${room.hotel.name} — ${nights} kecha`,
      sourceModule: MODULE,
      sourceId: booking.id,
      idempotencyKey: input.idempotencyKey,
    });

    return tx.hotelBooking.update({
      where: { id: booking.id },
      data: { walletTransactionId: charge.id },
      select: BOOKING_SELECT,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.HOTEL_BOOKING_CREATED,
    resourceType: 'HotelBooking',
    resourceId: created.id,
    module: MODULE,
    metadata: {
      bookingNumber,
      hotel: room.hotel.name,
      nights,
      amountTiyin: totalTiyin.toString(),
    },
    ...meta,
  });

  await notifyUser(userId, 'hotel.booking_created', {
    bookingId: created.id,
    bookingNumber,
    hotelName: room.hotel.name,
    checkIn: input.checkIn,
    nights,
    amountTiyin: tiyinToNumber(totalTiyin),
  });

  logger.info({ userId, bookingId: created.id, bookingNumber }, 'Mehmonxona band qilindi');

  return toBookingView(created);
}

function buildBookingFilter(status: BookingQuery['status']): Prisma.HotelBookingWhereInput {
  if (status === 'ALL') return {};

  /**
   * "Kelgusi" — hali boshlanmagan yoki davom etayotgan bandlovlar.
   *
   * Holat bo'yicha emas, SANA bo'yicha aniqlanadi: bandlov
   * tasdiqlangan bo'lsa-yu, chiqish sanasi o'tgan bo'lsa, u endi
   * kelgusi emas.
   */
  if (status === 'UPCOMING') {
    return { status: BookingStatus.CONFIRMED, checkOut: { gte: new Date(`${toDateKey(new Date())}T00:00:00Z`) } };
  }

  if (status === 'COMPLETED') {
    return {
      status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
      checkOut: { lt: new Date(`${toDateKey(new Date())}T00:00:00Z`) },
    };
  }

  return { status: BookingStatus.CANCELLED };
}

export async function listBookings(
  userId: string,
  query: BookingQuery,
): Promise<{ bookings: BookingView[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  const where: Prisma.HotelBookingWhereInput = { userId, ...buildBookingFilter(query.status) };

  const [rows, total] = await Promise.all([
    prisma.hotelBooking.findMany({
      where,
      select: BOOKING_SELECT,
      orderBy: { checkIn: query.order },
      skip,
      take,
    }),
    prisma.hotelBooking.count({ where }),
  ]);

  return { bookings: rows.map(toBookingView), total };
}

/**
 * Bitta bandlov.
 *
 * Egalik sharti shu yerda: begona bandlovda mehmonning ismi va
 * telefon raqami bor.
 */
export async function getBooking(userId: string, bookingId: string): Promise<BookingView> {
  const row = await prisma.hotelBooking.findFirst({
    where: { id: bookingId, userId },
    select: BOOKING_SELECT,
  });

  if (!row) {
    throw new NotFoundError('Bandlov');
  }

  return toBookingView(row);
}

/**
 * Bandlovni bekor qiladi va pulni qaytaradi.
 *
 * Faqat KIRISH sanasidan oldin mumkin — sabab `hotel.types.ts` da.
 */
export async function cancelBooking(
  userId: string,
  bookingId: string,
  input: CancelBookingInput,
  meta: OperationMeta = {},
): Promise<BookingView> {
  const booking = await prisma.hotelBooking.findFirst({
    where: { id: bookingId, userId },
    select: {
      id: true,
      bookingNumber: true,
      status: true,
      checkIn: true,
      totalTiyin: true,
      room: { select: { hotel: { select: { name: true } } } },
    },
  });

  if (!booking) {
    throw new NotFoundError('Bandlov');
  }

  if (!canCancelBooking({ status: booking.status, checkIn: toDateKey(booking.checkIn) })) {
    throw new ConflictError(
      booking.status === BookingStatus.CANCELLED
        ? 'Bu bandlov allaqachon bekor qilingan.'
        : "Kirish kuni boshlangan — bekor qilib bo'lmaydi. Mehmonxona bilan bog'laning.",
    );
  }

  const wallet = await getOrCreateWallet(userId);

  await prisma.$transaction(async (tx) => {
    // Eski holat sharti — shu oniyda boshqa so'rov bekor qilgan bo'lishi mumkin.
    const updated = await tx.hotelBooking.updateMany({
      where: { id: booking.id, status: BookingStatus.CONFIRMED },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: input.reason ?? null,
      },
    });

    if (updated.count === 0) {
      throw new ConflictError("Bandlov holati o'zgardi. Sahifani yangilang.");
    }

    await refundWallet(tx, {
      walletId: wallet.id,
      amountTiyin: booking.totalTiyin,
      description: `Bandlov ${booking.bookingNumber} bekor qilindi`,
      sourceModule: MODULE,
      sourceId: booking.id,
      idempotencyKey: `booking-refund-${booking.id}`,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.HOTEL_BOOKING_CANCELLED,
    resourceType: 'HotelBooking',
    resourceId: booking.id,
    module: MODULE,
    metadata: { bookingNumber: booking.bookingNumber, refundTiyin: booking.totalTiyin.toString() },
    ...meta,
  });

  await notifyUser(userId, 'hotel.booking_cancelled', {
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    hotelName: booking.room.hotel.name,
    refundTiyin: tiyinToNumber(booking.totalTiyin),
  });

  logger.info({ userId, bookingId: booking.id }, 'Bandlov bekor qilindi');

  return getBooking(userId, booking.id);
}
