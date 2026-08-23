import { Prisma } from '@/generated/prisma/client';
import {
  FAVORITE_COLUMN,
  FAVORITE_LABEL,
  FAVORITE_TARGETS,
  MAX_FAVORITES_PER_TARGET,
  type FavoriteTarget,
} from '@/config/favorite';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
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
import {
  emptyFavoriteIds,
  type FavoriteItem,
  type FavoritesResponse,
} from '@/modules/favorite/favorite.types';

/**
 * Sevimlilar.
 *
 * ── Modulning ENG NOZIK joyi: RO'YXATNI O'QISH ────────────────────────
 * Sevimlilar sahifasi besh xil narsani bitta ro'yxatda ko'rsatadi.
 * Ularni bitta so'rov bilan olib bo'lmaydi — har birining ustunlari
 * boshqacha.
 *
 * Shuning uchun beshta so'rov BIR VAQTDA yuboriladi (`Promise.all`)
 * va natijalar umumiy shaklga keltiriladi. Ketma-ket yuborilsa,
 * sahifa besh marta kutardi.
 *
 * ── Nima uchun MAVJUD BO'LMAGAN narsa ro'yxatda qolmaydi ──────────────
 * Mahsulot o'chirilsa, uning sevimlilar yozuvi ham o'chadi — buni
 * baza o'zi qiladi (`onDelete: Cascade`). Sotuvdan olingan mahsulot
 * esa QOLADI, lekin xiralashib ko'rsatiladi: odam uni o'zi olib
 * tashlashi kerak, aks holda ro'yxatdan narsalar sababsiz yo'qolardi.
 */

/** Turning ustunini `where` shartiga aylantiradi. */
function targetFilter(target: FavoriteTarget, targetId: string): Prisma.FavoriteWhereInput {
  return { [FAVORITE_COLUMN[target]]: targetId } as Prisma.FavoriteWhereInput;
}

/**
 * Narsa umuman bormi.
 *
 * Tekshiruvsiz mavjud bo'lmagan ID ham ro'yxatga tushardi va u
 * yerda nomsiz bo'sh kartochka bo'lib ko'rinardi.
 */
async function assertTargetExists(target: FavoriteTarget, targetId: string): Promise<void> {
  const notFound = () => new NotFoundError(FAVORITE_LABEL[target]);

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
 * Sevimlilarga qo'shadi.
 *
 * ── Nima uchun "almashtirish" (toggle) EMAS ───────────────────────────
 * Bitta manzil "bor bo'lsa o'chir, yo'q bo'lsa qo'sh" deb ishlashi
 * mumkin edi va u tugmaga qulayroq bo'lardi.
 *
 * Lekin u XAVFLI: mobil internetda so'rov sekin ketadi va odam
 * tugmani ikki marta bosadi. Almashtirishda natija tasodifiy
 * bo'lardi — ba'zan qo'shilgan, ba'zan o'chirilgan.
 *
 * Qo'shish va o'chirish alohida bo'lsa, ikkalasi ham TAKRORLASHGA
 * BEFARQ: ikki marta qo'shish ham bir marta qo'shish bilan bir xil
 * natija beradi.
 */
export async function addFavorite(
  target: FavoriteTarget,
  targetId: string,
  userId: string,
): Promise<number> {
  await assertTargetExists(target, targetId);

  const where = targetFilter(target, targetId);

  const existing = await prisma.favorite.findFirst({
    where: { ...where, userId },
    select: { id: true },
  });

  if (!existing) {
    const count = await prisma.favorite.count({ where: { userId, ...notNullFilter(target) } });

    if (count >= MAX_FAVORITES_PER_TARGET) {
      throw new ConflictError(
        `Ro'yxatda eng ko'pi ${MAX_FAVORITES_PER_TARGET} ta narsa bo'lishi mumkin. Keraksizlarini olib tashlang.`,
      );
    }

    /**
     * ── Ikki so'rov BIR VAQTDA kelsa ────────────────────────────────
     * Yuqoridagi tekshiruv ikkalasida ham "yo'q" deb javob berishi
     * mumkin va ikkalasi ham yozishga urinadi.
     *
     * Bunday holatda baza cheklovi ikkinchisini to'xtatadi va biz
     * uni XATO deb hisoblamaymiz: natija baribir kerakli holat —
     * narsa ro'yxatda.
     */
    try {
      await prisma.favorite.create({
        data: { userId, [FAVORITE_COLUMN[target]]: targetId } as Prisma.FavoriteUncheckedCreateInput,
        select: { id: true },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
    }

    logger.info({ target, targetId, userId }, "Sevimlilarga qo'shildi");
  }

  return prisma.favorite.count({ where: { userId, ...notNullFilter(target) } });
}

/** Sevimlilardan olib tashlaydi. */
export async function removeFavorite(
  target: FavoriteTarget,
  targetId: string,
  userId: string,
): Promise<number> {
  const where = targetFilter(target, targetId);

  /**
   * Mavjud bo'lmagan yozuvni o'chirish XATO EMAS.
   *
   * Odam tugmani ikki marta bosgan bo'lishi mumkin yoki boshqa
   * qurilmada allaqachon o'chirgan bo'lishi mumkin. Ikkala holatda
   * ham natija kerakli: narsa ro'yxatda yo'q.
   */
  const { count: removed } = await prisma.favorite.deleteMany({ where: { ...where, userId } });

  if (removed > 0) {
    logger.info({ target, targetId, userId }, "Sevimlilardan olib tashlandi");
  }

  return prisma.favorite.count({ where: { userId, ...notNullFilter(target) } });
}

/** Shu turdagi yozuvlarni ajratib olish sharti. */
function notNullFilter(target: FavoriteTarget): Prisma.FavoriteWhereInput {
  return { [FAVORITE_COLUMN[target]]: { not: null } } as Prisma.FavoriteWhereInput;
}

/**
 * Saqlangan ID'lar — yurakchalarni bo'yash uchun.
 *
 * ── Nima uchun ALOHIDA, yengil so'rov ─────────────────────────────────
 * Katalogda 40 ta mahsulot bor va har biriga "bu sevimlimi?" degan
 * so'rov yuborilsa, 40 ta so'rov ketardi.
 *
 * Bu so'rov esa BITTA va u faqat ID'larni qaytaradi — nom ham,
 * rasm ham emas. Brauzer ularni bir marta oladi va barcha
 * yurakchalar shu ro'yxatdan bo'yaladi.
 */
export async function listFavoriteIds(userId: string): Promise<Record<FavoriteTarget, string[]>> {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    select: {
      productId: true,
      menuItemId: true,
      restaurantId: true,
      hotelId: true,
      vacancyId: true,
    },
  });

  const ids = emptyFavoriteIds();

  for (const row of rows) {
    if (row.productId) ids.PRODUCT.push(row.productId);
    if (row.menuItemId) ids.MENU_ITEM.push(row.menuItemId);
    if (row.restaurantId) ids.RESTAURANT.push(row.restaurantId);
    if (row.hotelId) ids.HOTEL.push(row.hotelId);
    if (row.vacancyId) ids.VACANCY.push(row.vacancyId);
  }

  return ids;
}

/**
 * To'liq ro'yxat — sevimlilar sahifasi uchun.
 *
 * ── Nima uchun beshta so'rov BIR VAQTDA ───────────────────────────────
 * Har bir turning ustunlari boshqacha, shuning uchun ularni bitta
 * so'rov bilan olib bo'lmaydi. Ketma-ket yuborilsa, sahifa besh
 * marta kutardi.
 *
 * ── Nima uchun o'girish kodi BU YERDA EMAS ────────────────────────────
 * "Yaqinda ko'rilganlar" moduli ham aynan shu beshta turni aynan
 * shunday ko'rsatadi. Kod ikki joyda takrorlansa, ertaga narx
 * ko'rinishi o'zgarganda bittasi unutilardi.
 *
 * Shuning uchun o'girish `catalog-summary.ts` da, bitta joyda.
 */
export async function listFavorites(userId: string): Promise<FavoritesResponse> {
  const [products, menuItems, restaurants, hotels, vacancies] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId, productId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, product: { select: PRODUCT_SUMMARY_SELECT } },
    }),
    prisma.favorite.findMany({
      where: { userId, menuItemId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, menuItem: { select: MENU_ITEM_SUMMARY_SELECT } },
    }),
    prisma.favorite.findMany({
      where: { userId, restaurantId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, restaurant: { select: RESTAURANT_SUMMARY_SELECT } },
    }),
    prisma.favorite.findMany({
      where: { userId, hotelId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, hotel: { select: HOTEL_SUMMARY_SELECT } },
    }),
    prisma.favorite.findMany({
      where: { userId, vacancyId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, vacancy: { select: VACANCY_SUMMARY_SELECT } },
    }),
  ]);

  /**
   * Bog'langan narsa `null` bo'lishi MUMKIN EMAS: baza uni
   * o'chirilganda yozuvni ham o'chiradi.
   *
   * Lekin Prisma buni bilmaydi va turni "bo'lishi ham mumkin" deb
   * belgilaydi. `flatMap` bo'sh yozuvni jimgina tashlab ketadi —
   * bu qulash o'rniga eng xavfsiz xatti-harakat.
   */
  const groups: FavoritesResponse['groups'] = [
    {
      target: 'PRODUCT',
      items: products.flatMap((row) =>
        row.product
          ? [toItem(row.id, 'PRODUCT', row.product.id, productSummary(row.product), row.createdAt)]
          : [],
      ),
    },
    {
      target: 'MENU_ITEM',
      items: menuItems.flatMap((row) =>
        row.menuItem
          ? [toItem(row.id, 'MENU_ITEM', row.menuItem.id, menuItemSummary(row.menuItem), row.createdAt)]
          : [],
      ),
    },
    {
      target: 'RESTAURANT',
      items: restaurants.flatMap((row) =>
        row.restaurant
          ? [
              toItem(
                row.id,
                'RESTAURANT',
                row.restaurant.id,
                restaurantSummary(row.restaurant),
                row.createdAt,
              ),
            ]
          : [],
      ),
    },
    {
      target: 'HOTEL',
      items: hotels.flatMap((row) =>
        row.hotel ? [toItem(row.id, 'HOTEL', row.hotel.id, hotelSummary(row.hotel), row.createdAt)] : [],
      ),
    },
    {
      target: 'VACANCY',
      items: vacancies.flatMap((row) =>
        row.vacancy
          ? [toItem(row.id, 'VACANCY', row.vacancy.id, vacancySummary(row.vacancy), row.createdAt)]
          : [],
      ),
    },
  ];

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return { groups, total };
}

/** Umumiy ko'rinishni ro'yxat yozuviga aylantiradi. */
function toItem(
  id: string,
  target: FavoriteTarget,
  targetId: string,
  summary: CatalogSummary,
  addedAt: Date,
): FavoriteItem {
  return { id, target, targetId, ...summary, addedAt: addedAt.toISOString() };
}

/** Turlar ro'yxati — sinovlar uchun ochiq. */
export const FAVORITE_GROUP_ORDER = FAVORITE_TARGETS;

export type { FavoriteItem };
