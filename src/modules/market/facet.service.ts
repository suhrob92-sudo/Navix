import { Prisma } from '@/generated/prisma/client';
import { somToTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { toSearchText } from '@/lib/search';
import type { ProductQuery } from '@/modules/market/market.schemas';

/**
 * Filtr yordamchilari (fasetlar).
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Filtr oynasida "narxni kiriting" degan bo'sh maydon ko'rsatish
 * oson, lekin foydasiz: odam bu toifadagi narxlar 50 mingdanmi
 * yoki 5 milliondanmi boshlanishini bilmaydi.
 *
 * Do'konlar ro'yxati ham shunday: qaysi do'konlarda shu toifadagi
 * mahsulot borligini oldindan bilmasa, u tasodifiy tanlab, bo'sh
 * natijaga tushardi.
 *
 * ── Nima uchun har bir faset O'Z filtrisiz hisoblanadi ────────────────
 * Bu eng nozik joyi. Agar do'konlar ro'yxati tanlangan do'kon
 * filtri bilan birga hisoblansa, ro'yxatda FAQAT o'sha do'kon
 * qolardi — ya'ni odam boshqasiga o'ta olmasdi.
 *
 * Shuning uchun:
 *   · do'konlar ro'yxati — do'kon filtrisiz;
 *   · narx oralig'i — narx filtrisiz.
 *
 * Qolgan barcha filtrlar esa saqlanadi: "elektronika toifasida,
 * sotuvda bor mahsulotlar qaysi do'konlarda bor" degan savol
 * aynan shunday ishlaydi.
 */

export interface ShopFacet {
  slug: string;
  name: string;
  count: number;
}

export interface ProductFacets {
  /** Narx oralig'i — SO'MDA (filtr maydonlari so'mda ishlaydi). */
  priceRange: { minSom: number; maxSom: number } | null;
  shops: ShopFacet[];
  /** Chegirmadagilar soni — filtr tugmasida ko'rsatiladi. */
  discountCount: number;
}

/**
 * Filtrlardan `where` shartini yig'adi.
 *
 * @param skip Qaysi filtrni TUSHIRIB QOLDIRISH kerak — sabab
 *   modulning izohida.
 */
function buildWhere(query: ProductQuery, skip?: 'price' | 'shop'): Prisma.ProductWhereInput {
  const needle = query.search ? toSearchText(query.search) : null;

  return {
    isActive: true,
    shop: { isActive: true },
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.shop && skip !== 'shop' ? { shop: { slug: query.shop, isActive: true } } : {}),
    ...(query.inStock ? { stock: { gt: 0 } } : {}),
    ...(query.hasDiscount
      ? { AND: [{ oldPrice: { not: null } }, { oldPrice: { gt: prisma.product.fields.price } }] }
      : {}),
    ...(query.minRating === undefined
      ? {}
      : { rating: { gte: query.minRating }, ratingCount: { gt: 0 } }),
    ...(skip === 'price' || (query.minPriceSom === undefined && query.maxPriceSom === undefined)
      ? {}
      : {
          price: {
            ...(query.minPriceSom === undefined ? {} : { gte: somToTiyin(query.minPriceSom) }),
            ...(query.maxPriceSom === undefined ? {} : { lte: somToTiyin(query.maxPriceSom) }),
          },
        }),
    ...(needle && needle.length > 0
      ? {
          OR: [
            { searchName: { startsWith: needle } },
            { searchName: { contains: ` ${needle}` } },
            { category: { name: { contains: query.search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };
}

/**
 * Filtr oynasi uchun yordamchi ma'lumot.
 *
 * ── Nima uchun uchta so'rov BIR VAQTDA ────────────────────────────────
 * Ketma-ket yuborilsa, filtr oynasi uch marta kutardi. Ular
 * bir-biriga bog'liq emas, shuning uchun birga yuboriladi.
 */
export async function getProductFacets(query: ProductQuery): Promise<ProductFacets> {
  const [priceAggregate, shopGroups, discountCount] = await Promise.all([
    prisma.product.aggregate({
      where: buildWhere(query, 'price'),
      _min: { price: true },
      _max: { price: true },
    }),

    /**
     * Do'konlar bo'yicha guruhlash.
     *
     * `groupBy` do'kon NOMINI qaytarmaydi — faqat ID'ni. Nomlarni
     * ikkinchi so'rov bilan olamiz: bu bitta qo'shimcha so'rov,
     * lekin har bir do'kon uchun alohida so'rovdan ancha arzon.
     */
    prisma.product.groupBy({
      by: ['shopId'],
      where: buildWhere(query, 'shop'),
      _count: { _all: true },
      orderBy: { _count: { shopId: 'desc' } },
      take: 20,
    }),

    prisma.product.count({
      where: {
        ...buildWhere({ ...query, hasDiscount: undefined }),
        AND: [{ oldPrice: { not: null } }, { oldPrice: { gt: prisma.product.fields.price } }],
      },
    }),
  ]);

  const shopIds = shopGroups.map((group) => group.shopId);

  const shops =
    shopIds.length === 0
      ? []
      : await prisma.shop.findMany({
          where: { id: { in: shopIds } },
          select: { id: true, slug: true, name: true },
        });

  const shopById = new Map(shops.map((shop) => [shop.id, shop]));

  return {
    /**
     * Narx oralig'i SO'MDA qaytadi.
     *
     * Filtr maydonlari so'mda ishlaydi (odam tiyin yozmaydi), va
     * o'girishni bir joyda — bu yerda — bajarish ikki tomonda
     * takrorlashdan xavfsizroq.
     */
    priceRange:
      priceAggregate._min.price === null || priceAggregate._max.price === null
        ? null
        : {
            minSom: Math.floor(tiyinToNumber(priceAggregate._min.price) / 100),
            maxSom: Math.ceil(tiyinToNumber(priceAggregate._max.price) / 100),
          },

    shops: shopGroups.flatMap((group) => {
      const shop = shopById.get(group.shopId);

      return shop ? [{ slug: shop.slug, name: shop.name, count: group._count._all }] : [];
    }),

    discountCount,
  };
}
