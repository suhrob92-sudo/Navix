import { prisma } from '@/lib/prisma';
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_VARIANTS } from '@/modules/courier/courier.types';
import { FOOD_ORDER_STATUS_LABELS, FOOD_ORDER_STATUS_VARIANTS } from '@/modules/food/food.types';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_VARIANTS, isBookingFinished } from '@/modules/hotel/hotel.types';
import { MARKET_ORDER_STATUS_LABELS, MARKET_ORDER_STATUS_VARIANTS } from '@/modules/market/market.types';
import { isTicketFinished, TICKET_STATUS_LABELS, TICKET_STATUS_VARIANTS } from '@/modules/travel/travel.types';
import type { OrdersQuery } from '@/modules/orders/orders.schemas';
import type { OrderKind, OrdersResponse, UnifiedOrder } from '@/modules/orders/orders.types';

/**
 * Beshta modulning buyurtmalarini BITTA ro'yxatga yig'adi.
 *
 * ── Nima uchun XOTIRADA birlashtiriladi ───────────────────────────────
 * Buyurtmalar beshta ALOHIDA jadvalda va ular bir-biriga o'xshamaydi:
 * ovqatda taomlar, mehmonxonada sanalar, chiptada reys bor. Ularni
 * bitta SQL so'rovga birlashtirish uchun `UNION` yozish kerak bo'lardi
 * — u har bir modul o'zgarganda qo'lda tuzatiladi va tez orada
 * haqiqatdan ajralib qolardi.
 *
 * Bu yerda esa har bir modul o'z so'rovini beradi, natijalar umumiy
 * ko'rinishga o'giriladi va vaqt bo'yicha saralanadi.
 *
 * ── Nima uchun bu USUL TO'G'RI natija beradi ──────────────────────────
 * Har manbadan `need` tadan olinadi, bu yerda `need` — kerakli
 * sahifagacha bo'lgan yozuvlar soni. Umumiy ro'yxatdagi N-o'rindagi
 * yozuv, albatta, kamida bitta manbaning birinchi N tasi ichida
 * bo'ladi. Ya'ni natija taxminiy emas, ANIQ.
 */

/** Bitta manbadan olinadigan eng ko'p yozuv — himoya chegarasi. */
const MAX_PER_SOURCE = 200;

/** Bir sahifada nechta buyurtma. */
const PAGE_SIZE = 20;

export async function listOrders(userId: string, query: OrdersQuery): Promise<OrdersResponse> {
  const page = query.page ?? 1;
  const skip = (page - 1) * PAGE_SIZE;
  const need = Math.min(skip + PAGE_SIZE, MAX_PER_SOURCE);

  const wanted = (kind: OrderKind): boolean => query.kind === 'ALL' || query.kind === kind;

  const [food, market, hotel, travel, parcel, counts] = await Promise.all([
    wanted('FOOD') ? loadFood(userId, need) : Promise.resolve([]),
    wanted('MARKET') ? loadMarket(userId, need) : Promise.resolve([]),
    wanted('HOTEL') ? loadHotel(userId, need) : Promise.resolve([]),
    wanted('TRAVEL') ? loadTravel(userId, need) : Promise.resolve([]),
    wanted('PARCEL') ? loadParcel(userId, need) : Promise.resolve([]),
    countByKind(userId),
  ]);

  let merged = [...food, ...market, ...hotel, ...travel, ...parcel];

  /**
   * Saralash — ISO vaqt satrlarini taqqoslash orqali.
   *
   * `Date` obyektlarini yasash shart emas: ISO ko'rinish leksikografik
   * taqqoslashda ham to'g'ri tartib beradi.
   */
  merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (query.filter === 'ACTIVE') {
    merged = merged.filter((order) => !order.isFinished);
  } else if (query.filter === 'FINISHED') {
    merged = merged.filter((order) => order.isFinished);
  }

  return {
    orders: merged.slice(skip, skip + PAGE_SIZE),
    /**
     * `total` — FILTRDAN keyingi soni.
     *
     * Filtr xotirada qo'llanadi, shuning uchun bazadagi umumiy sanoq
     * bu yerda noto'g'ri bo'lardi: odam "Faol" ni tanlaganda 3 ta
     * buyurtma ko'rib, "jami 40" degan yozuvni o'qirdi.
     */
    total: merged.length,
    counts,
  };
}

/** Har bir tur bo'yicha umumiy soni — filtr tugmalari uchun. */
async function countByKind(userId: string): Promise<Record<OrderKind, number>> {
  const [food, market, hotel, travel, parcel] = await Promise.all([
    prisma.foodOrder.count({ where: { userId } }),
    prisma.marketOrder.count({ where: { userId } }),
    prisma.hotelBooking.count({ where: { userId } }),
    prisma.tripBooking.count({ where: { userId } }),
    prisma.parcel.count({ where: { senderId: userId } }),
  ]);

  return { FOOD: food, MARKET: market, HOTEL: hotel, TRAVEL: travel, PARCEL: parcel };
}

/** "3 ta taom" kabi qisqa matn. */
function itemsText(count: number, word: string): string {
  return `${count} ta ${word}`;
}

/**
 * Grammni odam o'qiydigan ko'rinishga o'giradi.
 *
 * Og'irlik GRAMMDA saqlanadi (kasr son pul kabi xato manbai), lekin
 * ekranda "2500 g" emas, "2.5 kg" ko'rinishi kerak.
 */
function formatWeight(grams: number): string {
  if (grams < 1_000) return `${grams} g`;

  const kilos = grams / 1_000;

  // Butun bo'lsa kasr qismi yozilmaydi: "3 kg", "2.5 kg" emas.
  return `${Number.isInteger(kilos) ? kilos : kilos.toFixed(1)} kg`;
}

async function loadFood(userId: string, take: number): Promise<UnifiedOrder[]> {
  const rows = await prisma.foodOrder.findMany({
    where: { userId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
      restaurant: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });

  return rows.map((row) => ({
    id: row.id,
    kind: 'FOOD' as const,
    number: row.orderNumber,
    title: row.restaurant.name,
    subtitle: itemsText(row._count.items, 'taom'),
    totalTiyin: Number(row.total),
    statusLabel: FOOD_ORDER_STATUS_LABELS[row.status],
    statusVariant: FOOD_ORDER_STATUS_VARIANTS[row.status],
    isFinished: row.status === 'DELIVERED' || row.status === 'CANCELLED',
    createdAt: row.createdAt.toISOString(),
    href: `/orders/${row.id}`,
  }));
}

async function loadMarket(userId: string, take: number): Promise<UnifiedOrder[]> {
  const rows = await prisma.marketOrder.findMany({
    where: { userId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
      shop: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });

  return rows.map((row) => ({
    id: row.id,
    kind: 'MARKET' as const,
    number: row.orderNumber,
    title: row.shop.name,
    subtitle: itemsText(row._count.items, 'mahsulot'),
    totalTiyin: Number(row.total),
    statusLabel: MARKET_ORDER_STATUS_LABELS[row.status],
    statusVariant: MARKET_ORDER_STATUS_VARIANTS[row.status],
    isFinished: row.status === 'DELIVERED' || row.status === 'CANCELLED',
    createdAt: row.createdAt.toISOString(),
    href: `/marketplace/orders/${row.id}`,
  }));
}

async function loadHotel(userId: string, take: number): Promise<UnifiedOrder[]> {
  const rows = await prisma.hotelBooking.findMany({
    where: { userId },
    select: {
      id: true,
      bookingNumber: true,
      status: true,
      totalTiyin: true,
      nights: true,
      checkOut: true,
      createdAt: true,
      room: { select: { hotel: { select: { name: true, city: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });

  return rows.map((row) => ({
    id: row.id,
    kind: 'HOTEL' as const,
    number: row.bookingNumber,
    title: row.room.hotel.name,
    subtitle: `${row.room.hotel.city} · ${row.nights} kecha`,
    totalTiyin: Number(row.totalTiyin),
    statusLabel: BOOKING_STATUS_LABELS[row.status],
    statusVariant: BOOKING_STATUS_VARIANTS[row.status],
    /**
     * Holat YETARLI EMAS — sana ham kerak.
     *
     * Bandlov bazada `CONFIRMED` bo'lib qoladi: uni `COMPLETED` ga
     * o'tkazadigan fon jarayoni yo'q. Faqat holatga qaralsa, ikki
     * yil oldingi mehmonxona "Faol" bo'limida turaverardi.
     */
    isFinished: isBookingFinished(row),
    createdAt: row.createdAt.toISOString(),
    href: `/hotel/bookings/${row.id}`,
  }));
}

async function loadTravel(userId: string, take: number): Promise<UnifiedOrder[]> {
  const rows = await prisma.tripBooking.findMany({
    where: { userId },
    select: {
      id: true,
      ticketNumber: true,
      status: true,
      totalTiyin: true,
      seats: true,
      departAt: true,
      createdAt: true,
      schedule: { select: { fromCity: true, toCity: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });

  return rows.map((row) => ({
    id: row.id,
    kind: 'TRAVEL' as const,
    number: row.ticketNumber,
    title: `${row.schedule.fromCity} → ${row.schedule.toCity}`,
    subtitle: itemsText(row.seats, "o'rin"),
    totalTiyin: Number(row.totalTiyin),
    statusLabel: TICKET_STATUS_LABELS[row.status],
    statusVariant: TICKET_STATUS_VARIANTS[row.status],
    // Bandlov bilan bir xil sabab: jo'nab ketgan reys "faol" emas.
    isFinished: isTicketFinished(row),
    createdAt: row.createdAt.toISOString(),
    href: `/travel/tickets/${row.id}`,
  }));
}

async function loadParcel(userId: string, take: number): Promise<UnifiedOrder[]> {
  const rows = await prisma.parcel.findMany({
    where: { senderId: userId },
    select: {
      id: true,
      parcelNumber: true,
      fromRegion: true,
      toRegion: true,
      description: true,
      weightGrams: true,
      priceTiyin: true,
      createdAt: true,
      cancelledAt: true,
      delivery: { select: { status: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });

  return rows.map((row) => {
    /**
     * Posilkaning o'z holati YO'Q — u yetkazish yozuvida turadi.
     *
     * Yetkazish hali ochilmagan bo'lsa, posilka "topshiriq kutmoqda"
     * holatida: kuryerga taklif qilingan, lekin hech kim olmagan.
     */
    const status = row.cancelledAt ? 'CANCELLED' : (row.delivery?.status ?? 'OFFERED');

    return {
      id: row.id,
      kind: 'PARCEL' as const,
      number: row.parcelNumber,
      title: `${row.fromRegion} → ${row.toRegion}`,
      /**
       * Tavsif va OG'IRLIK — turining nomi emas.
       *
       * Ro'yxatda tur allaqachon yozilgan ("Posilka · ..."), shuning
       * uchun uni takrorlash "Posilka · Posilka" degan ma'nosiz
       * qator berardi.
       */
      subtitle: `${row.description} · ${formatWeight(row.weightGrams)}`,
      totalTiyin: Number(row.priceTiyin),
      statusLabel: DELIVERY_STATUS_LABELS[status],
      statusVariant: DELIVERY_STATUS_VARIANTS[status],
      isFinished: status === 'DELIVERED' || status === 'CANCELLED',
      createdAt: row.createdAt.toISOString(),
      href: `/delivery/${row.id}`,
    };
  });
}
