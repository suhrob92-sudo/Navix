import { Prisma } from '@/generated/prisma/client';
import {
  MAX_RECENT_VIEWS,
  RECENT_COLUMN,
  RECENT_LABEL,
  type RecentTarget,
} from '@/config/recent';
import { NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  HOTEL_SUMMARY_SELECT,
  MENU_ITEM_SUMMARY_SELECT,
  PRODUCT_SUMMARY_SELECT,
  RESTAURANT_SUMMARY_SELECT,
  VACANCY_SUMMARY_SELECT,
  hotelSummary,
  menuItemSummary,
  productSummary,
  restaurantSummary,
  vacancySummary,
  type CatalogSummary,
} from '@/modules/catalog/catalog-summary';
import type { RecentItem, RecentResponse } from '@/modules/recent/recent.types';

/**
 * Yaqinda ko'rilganlar.
 *
 * ── Modulning ENG NOZIK joyi: YOZUV HAJMI ─────────────────────────────
 * Bu ro'yxat har bir sahifa ochilganda yoziladi — ya'ni u ilovadagi
 * ENG TEZ-TEZ takrorlanadigan yozuv amali bo'ladi.
 *
 * Shuning uchun:
 *
 *   1. takroriy ko'rish YANGI yozuv yaratmaydi, faqat vaqtni
 *      yangilaydi (`upsert`) — bitta so'rov;
 *   2. eskilarini tozalash faqat YANGI yozuv qo'shilgandagina
 *      bajariladi, har ko'rishda emas;
 *   3. so'rov sahifa chizilgandan KEYIN yuboriladi va sahifa uni
 *      kutmaydi.
 */

/** Turning ustunini `where` shartiga aylantiradi. */
function targetFilter(target: RecentTarget, targetId: string): Prisma.RecentViewWhereInput {
  return { [RECENT_COLUMN[target]]: targetId } as Prisma.RecentViewWhereInput;
}

/** Shu turdagi yozuvlarni ajratib olish sharti. */
function notNullFilter(target: RecentTarget): Prisma.RecentViewWhereInput {
  return { [RECENT_COLUMN[target]]: { not: null } } as Prisma.RecentViewWhereInput;
}

/**
 * Narsa umuman bormi.
 *
 * Tekshiruvsiz mavjud bo'lmagan ID ham ro'yxatga tushardi. Bundan
 * tashqari bu manzil har bir sahifa ochilganda chaqiriladi, ya'ni
 * u tasodifiy ma'lumot uchun ochiq eshik bo'lib qolardi.
 */
async function assertTargetExists(target: RecentTarget, targetId: string): Promise<void> {
  const notFound = () => new NotFoundError(RECENT_LABEL[target]);

  switch (target) {
    case 'PRODUCT': {
      const row = await prisma.product.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!row) throw notFound();
      return;
    }

    case 'MENU_ITEM': {
      const row = await prisma.menuItem.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!row) throw notFound();
      return;
    }

    case 'RESTAURANT': {
      const row = await prisma.restaurant.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!row) throw notFound();
      return;
    }

    case 'HOTEL': {
      const row = await prisma.hotel.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!row) throw notFound();
      return;
    }

    case 'VACANCY': {
      const row = await prisma.vacancy.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!row) throw notFound();
      return;
    }
  }
}

/**
 * Eng eski yozuvlarni o'chiradi.
 *
 * ── Nima uchun HAR SAFAR emas ─────────────────────────────────────────
 * Tozalash — qo'shimcha so'rov. Har ko'rishda bajarilsa, ro'yxat
 * hech qachon chegaraga yetmasa ham u bekorga ishlab turardi.
 *
 * Yozuv soni faqat YANGI narsa qo'shilganda o'sadi, shuning uchun
 * tozalash ham faqat o'shanda kerak.
 */
async function trimOldest(userId: string): Promise<void> {
  const total = await prisma.recentView.count({ where: { userId } });

  if (total <= MAX_RECENT_VIEWS) return;

  /**
   * Chegaradan tashqaridagilar TOPILADI va o'chiriladi.
   *
   * "Eng eski bittasini o'chir" ham mumkin edi, lekin chegara
   * keyinchalik pasaytirilsa, eski yozuvlar hech qachon
   * tozalanmasdi.
   */
  const extra = await prisma.recentView.findMany({
    where: { userId },
    orderBy: { viewedAt: 'desc' },
    skip: MAX_RECENT_VIEWS,
    select: { id: true },
  });

  await prisma.recentView.deleteMany({ where: { id: { in: extra.map((row) => row.id) } } });
}

/**
 * Ko'rilganini belgilaydi.
 *
 * ── Nima uchun `upsert` EMAS, qo'lda tekshiruv ────────────────────────
 * Prisma'ning `upsert` amali `where` uchun YAGONA kalit talab
 * qiladi. Bu yerda esa kalit turga qarab o'zgaradi
 * (`userId_productId`, `userId_menuItemId` va hokazo) va uni
 * dinamik yasash kodni o'qib bo'lmas holga keltirardi.
 *
 * Qo'lda tekshiruv esa ochiq va u ham xuddi shunday ishonchli:
 * ikki so'rov bir vaqtda kelsa, baza cheklovi ikkinchisini
 * to'xtatadi va biz uni xato deb hisoblamaymiz.
 */
export async function recordView(
  target: RecentTarget,
  targetId: string,
  userId: string,
): Promise<void> {
  await assertTargetExists(target, targetId);

  const where = targetFilter(target, targetId);

  const existing = await prisma.recentView.findFirst({
    where: { ...where, userId },
    select: { id: true },
  });

  if (existing) {
    await prisma.recentView.update({
      where: { id: existing.id },
      data: { viewedAt: new Date() },
      select: { id: true },
    });

    return;
  }

  try {
    await prisma.recentView.create({
      data: { userId, [RECENT_COLUMN[target]]: targetId } as Prisma.RecentViewUncheckedCreateInput,
      select: { id: true },
    });
  } catch (error) {
    /**
     * Ikki so'rov bir vaqtda kelgan.
     *
     * Natija baribir kerakli holat — narsa ro'yxatda. Tozalash ham
     * kerak emas, chunki yangi yozuv qo'shilmadi.
     */
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return;
    }

    throw error;
  }

  await trimOldest(userId);

  logger.debug({ target, targetId, userId }, "Ko'rilgani belgilandi");
}

/**
 * Ro'yxat.
 *
 * ── Nima uchun beshta so'rov, keyin ARALASHTIRISH ─────────────────────
 * Ro'yxat vaqt bo'yicha tartiblanadi va unda turlar aralash
 * turadi: bugun ko'rilgan mahsulot kecha ko'rilgan mehmonxonadan
 * yuqorida bo'lishi kerak.
 *
 * Bazadan bitta so'rov bilan olib bo'lmaydi (ustunlar boshqacha),
 * shuning uchun beshtasi bir vaqtda yuboriladi va natija
 * XOTIRADA tartiblanadi.
 *
 * Bu xavfsiz: yozuvlar soni chegaralangan (`MAX_RECENT_VIEWS`),
 * ya'ni tartiblanadigan ro'yxat hech qachon kattalashmaydi.
 *
 * @param target Berilsa — faqat shu tur. Bosh sahifadagi qator
 *   uchun kerak: marketplace faqat mahsulotlarni ko'rsatadi.
 */
export async function listRecentViews(
  userId: string,
  options: { target?: RecentTarget; limit: number },
): Promise<RecentResponse> {
  const wanted = (target: RecentTarget) => options.target === undefined || options.target === target;

  const take = options.limit;

  const [products, menuItems, restaurants, hotels, vacancies] = await Promise.all([
    wanted('PRODUCT')
      ? prisma.recentView.findMany({
          where: { userId, productId: { not: null } },
          orderBy: { viewedAt: 'desc' },
          take,
          select: { id: true, viewedAt: true, product: { select: PRODUCT_SUMMARY_SELECT } },
        })
      : [],
    wanted('MENU_ITEM')
      ? prisma.recentView.findMany({
          where: { userId, menuItemId: { not: null } },
          orderBy: { viewedAt: 'desc' },
          take,
          select: { id: true, viewedAt: true, menuItem: { select: MENU_ITEM_SUMMARY_SELECT } },
        })
      : [],
    wanted('RESTAURANT')
      ? prisma.recentView.findMany({
          where: { userId, restaurantId: { not: null } },
          orderBy: { viewedAt: 'desc' },
          take,
          select: { id: true, viewedAt: true, restaurant: { select: RESTAURANT_SUMMARY_SELECT } },
        })
      : [],
    wanted('HOTEL')
      ? prisma.recentView.findMany({
          where: { userId, hotelId: { not: null } },
          orderBy: { viewedAt: 'desc' },
          take,
          select: { id: true, viewedAt: true, hotel: { select: HOTEL_SUMMARY_SELECT } },
        })
      : [],
    wanted('VACANCY')
      ? prisma.recentView.findMany({
          where: { userId, vacancyId: { not: null } },
          orderBy: { viewedAt: 'desc' },
          take,
          select: { id: true, viewedAt: true, vacancy: { select: VACANCY_SUMMARY_SELECT } },
        })
      : [],
  ]);

  const items: RecentItem[] = [
    ...products.flatMap((row) =>
      row.product
        ? [toItem(row.id, 'PRODUCT', row.product.id, productSummary(row.product), row.viewedAt)]
        : [],
    ),
    ...menuItems.flatMap((row) =>
      row.menuItem
        ? [toItem(row.id, 'MENU_ITEM', row.menuItem.id, menuItemSummary(row.menuItem), row.viewedAt)]
        : [],
    ),
    ...restaurants.flatMap((row) =>
      row.restaurant
        ? [
            toItem(
              row.id,
              'RESTAURANT',
              row.restaurant.id,
              restaurantSummary(row.restaurant),
              row.viewedAt,
            ),
          ]
        : [],
    ),
    ...hotels.flatMap((row) =>
      row.hotel ? [toItem(row.id, 'HOTEL', row.hotel.id, hotelSummary(row.hotel), row.viewedAt)] : [],
    ),
    ...vacancies.flatMap((row) =>
      row.vacancy
        ? [toItem(row.id, 'VACANCY', row.vacancy.id, vacancySummary(row.vacancy), row.viewedAt)]
        : [],
    ),
  ];

  items.sort((a, b) => b.viewedAt.localeCompare(a.viewedAt));

  return { items: items.slice(0, options.limit) };
}

/**
 * Butun ro'yxatni tozalaydi.
 *
 * ── Nima uchun bu tugma KERAK ─────────────────────────────────────────
 * Ko'rish tarixi — shaxsiy ma'lumot. Odam sovg'a qidirgan bo'lishi
 * mumkin va uni telefonini olgan boshqa odam ko'rmasligi kerak.
 *
 * Bu SOZLAMA emas: ro'yxat baribir ishlab turadi, faqat hozirgi
 * mazmuni o'chadi.
 */
export async function clearRecentViews(userId: string): Promise<number> {
  const { count } = await prisma.recentView.deleteMany({ where: { userId } });

  logger.info({ userId, count }, "Ko'rish tarixi tozalandi");

  return count;
}

/** Bitta yozuvni ro'yxatdan olib tashlaydi. */
export async function removeRecentView(
  target: RecentTarget,
  targetId: string,
  userId: string,
): Promise<number> {
  const where = targetFilter(target, targetId);

  await prisma.recentView.deleteMany({ where: { ...where, userId } });

  return prisma.recentView.count({ where: { userId, ...notNullFilter(target) } });
}

/** Umumiy ko'rinishni ro'yxat yozuviga aylantiradi. */
function toItem(
  id: string,
  target: RecentTarget,
  targetId: string,
  summary: CatalogSummary,
  viewedAt: Date,
): RecentItem {
  return { id, target, targetId, ...summary, viewedAt: viewedAt.toISOString() };
}
