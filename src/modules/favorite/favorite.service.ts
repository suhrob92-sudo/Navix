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
import { tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { THUMB_SELECT, toThumb } from '@/modules/catalog/catalog-image.select';
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
 * Beshta so'rov bir vaqtda yuboriladi: ketma-ket bo'lsa sahifa
 * besh marta kutardi.
 */
export async function listFavorites(userId: string): Promise<FavoritesResponse> {
  const [products, menuItems, restaurants, hotels, vacancies] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId, productId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            slug: true,
            name: true,
            price: true,
            isActive: true,
            stock: true,
            shop: { select: { name: true } },
            images: THUMB_SELECT,
          },
        },
      },
    }),
    prisma.favorite.findMany({
      where: { userId, menuItemId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        menuItem: {
          select: {
            id: true,
            name: true,
            price: true,
            isAvailable: true,
            restaurant: { select: { name: true, slug: true } },
            images: THUMB_SELECT,
          },
        },
      },
    }),
    prisma.favorite.findMany({
      where: { userId, restaurantId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        restaurant: {
          select: {
            id: true,
            slug: true,
            name: true,
            cuisine: true,
            isActive: true,
            images: THUMB_SELECT,
          },
        },
      },
    }),
    prisma.favorite.findMany({
      where: { userId, hotelId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        hotel: {
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            isActive: true,
            images: THUMB_SELECT,
            rooms: {
              where: { isActive: true },
              select: { pricePerNight: true },
              orderBy: { pricePerNight: 'asc' },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.favorite.findMany({
      where: { userId, vacancyId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        vacancy: {
          select: {
            id: true,
            slug: true,
            title: true,
            city: true,
            salaryMin: true,
            isActive: true,
            company: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const groups: FavoritesResponse['groups'] = [
    {
      target: 'PRODUCT',
      items: products.flatMap((row) =>
        row.product
          ? [
              {
                id: row.id,
                target: 'PRODUCT' as const,
                targetId: row.product.id,
                name: row.product.name,
                href: `/marketplace/p/${row.product.slug}`,
                subtitle: row.product.shop.name,
                priceTiyin: tiyinToNumber(row.product.price),
                pricePrefix: null,
                image: toThumb(row.product.images),
                /**
                 * Zaxirasi tugagan mahsulot ham QOLADI.
                 *
                 * Uni o'chirib yuborsak, odam "men buni saqlagan
                 * edim-ku" deb hayron bo'lardi. Xiralashgan
                 * kartochka esa holatni aniq aytadi.
                 */
                isAvailable: row.product.isActive && row.product.stock > 0,
                addedAt: row.createdAt.toISOString(),
              },
            ]
          : [],
      ),
    },
    {
      target: 'MENU_ITEM',
      items: menuItems.flatMap((row) =>
        row.menuItem
          ? [
              {
                id: row.id,
                target: 'MENU_ITEM' as const,
                targetId: row.menuItem.id,
                name: row.menuItem.name,
                href: `/food/${row.menuItem.restaurant.slug}`,
                subtitle: row.menuItem.restaurant.name,
                priceTiyin: tiyinToNumber(row.menuItem.price),
                pricePrefix: null,
                image: toThumb(row.menuItem.images),
                isAvailable: row.menuItem.isAvailable,
                addedAt: row.createdAt.toISOString(),
              },
            ]
          : [],
      ),
    },
    {
      target: 'RESTAURANT',
      items: restaurants.flatMap((row) =>
        row.restaurant
          ? [
              {
                id: row.id,
                target: 'RESTAURANT' as const,
                targetId: row.restaurant.id,
                name: row.restaurant.name,
                href: `/food/${row.restaurant.slug}`,
                subtitle: row.restaurant.cuisine,
                priceTiyin: null,
                pricePrefix: null,
                image: toThumb(row.restaurant.images),
                isAvailable: row.restaurant.isActive,
                addedAt: row.createdAt.toISOString(),
              },
            ]
          : [],
      ),
    },
    {
      target: 'HOTEL',
      items: hotels.flatMap((row) =>
        row.hotel
          ? [
              {
                id: row.id,
                target: 'HOTEL' as const,
                targetId: row.hotel.id,
                name: row.hotel.name,
                href: `/hotel/${row.hotel.slug}`,
                subtitle: row.hotel.city,
                /** Eng arzon xona narxi — "dan" belgisi bilan. */
                priceTiyin: row.hotel.rooms[0]
                  ? tiyinToNumber(row.hotel.rooms[0].pricePerNight)
                  : null,
                pricePrefix: row.hotel.rooms[0] ? 'dan' : null,
                image: toThumb(row.hotel.images),
                isAvailable: row.hotel.isActive,
                addedAt: row.createdAt.toISOString(),
              },
            ]
          : [],
      ),
    },
    {
      target: 'VACANCY',
      items: vacancies.flatMap((row) =>
        row.vacancy
          ? [
              {
                id: row.id,
                target: 'VACANCY' as const,
                targetId: row.vacancy.id,
                name: row.vacancy.title,
                href: `/jobs/${row.vacancy.slug}`,
                subtitle: `${row.vacancy.company.name} · ${row.vacancy.city}`,
                /**
                 * Maosh "kelishilgan" bo'lishi mumkin.
                 *
                 * Nolni ko'rsatib bo'lmaydi: u "bepul ish" degan
                 * ma'noni berardi.
                 */
                priceTiyin: row.vacancy.salaryMin === null ? null : tiyinToNumber(row.vacancy.salaryMin),
                pricePrefix: row.vacancy.salaryMin === null ? null : 'dan',
                image: null,
                isAvailable: row.vacancy.isActive,
                addedAt: row.createdAt.toISOString(),
              },
            ]
          : [],
      ),
    },
  ];

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return { groups, total };
}

/** Turlar ro'yxati — sinovlar uchun ochiq. */
export const FAVORITE_GROUP_ORDER = FAVORITE_TARGETS;

export type { FavoriteItem };
