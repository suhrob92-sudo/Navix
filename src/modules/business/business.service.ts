import { Prisma } from '@/generated/prisma/client';
import { NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import type { ServiceColor } from '@/config/modules';
import { THUMB_SELECT, toThumb } from '@/modules/catalog/catalog-image.select';
import type {
  BusinessCatalogItem,
  BusinessFollowResponse,
  BusinessKind,
  BusinessProfileView,
} from '@/modules/business/business.types';

/**
 * Biznes profili — restoran va do'kon uchun umumiy.
 *
 * ── Nima uchun bitta servis ───────────────────────────────────────────
 * Foydalanuvchi uchun restoran va do'kon farqi kichik: ikkalasida ham
 * nom, reyting, manzil, ish vaqti, katalog va obuna bor. Ikki alohida
 * servis yozilsa, ularning to'qson foizi bir xil kod bo'lardi.
 *
 * Farq faqat KATALOGDA: restoranda taomlar, do'konda mahsulotlar.
 * Shu bitta joy ajratilgan, qolgani umumiy.
 */

/** Katalogda ko'rsatiladigan eng ko'p element. */
const MAX_CATALOG_ITEMS = 30;

const BUSINESS_SELECT = {
  id: true,
  city: true,
  address: true,
  phone: true,
  opensAt: true,
  closesAt: true,
  about: true,
  isVerified: true,
  restaurant: {
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      color: true,
      rating: true,
      ratingCount: true,
      isOpen: true,
      ownerId: true,
      images: THUMB_SELECT,
    },
  },
  shop: {
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      color: true,
      rating: true,
      ratingCount: true,
      isOpen: true,
      ownerId: true,
      images: THUMB_SELECT,
    },
  },
} as const;

type BusinessRow = Prisma.BusinessProfileGetPayload<{ select: typeof BUSINESS_SELECT }>;

/**
 * Qaysi biznes ekanini aniqlaydi.
 *
 * Baza sharti (`business_profiles_exactly_one_owner`) aynan bittasi
 * to'la bo'lishini kafolatlaydi, shuning uchun bu yerda "ikkalasi ham
 * bo'sh" holati faqat ma'lumot buzilganda yuz beradi.
 */
function resolveOwner(row: BusinessRow) {
  if (row.restaurant) return { kind: 'RESTAURANT' as BusinessKind, entity: row.restaurant };
  if (row.shop) return { kind: 'SHOP' as BusinessKind, entity: row.shop };

  throw new NotFoundError('Biznes');
}

/** Restoran taomlari. */
async function loadMenuItems(restaurantId: string): Promise<BusinessCatalogItem[]> {
  const rows = await prisma.menuItem.findMany({
    where: { restaurantId, isAvailable: true },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      category: { select: { name: true } },
      images: THUMB_SELECT,
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    take: MAX_CATALOG_ITEMS,
  });

  return rows.map((row) => ({
    id: row.id,
    // Taomning o'z sahifasi yo'q — havola restoran menyusiga ketadi.
    slug: null,
    name: row.name,
    description: row.description,
    priceTiyin: tiyinToNumber(row.price),
    categoryName: row.category?.name ?? null,
    image: toThumb(row.images),
  }));
}

/** Do'kon mahsulotlari. */
async function loadProducts(shopId: string): Promise<BusinessCatalogItem[]> {
  const rows = await prisma.product.findMany({
    where: { shopId, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      price: true,
      category: { select: { name: true } },
      images: THUMB_SELECT,
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    take: MAX_CATALOG_ITEMS,
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceTiyin: tiyinToNumber(row.price),
    categoryName: row.category?.name ?? null,
    image: toThumb(row.images),
  }));
}

/**
 * `slug` bo'yicha biznes profili.
 *
 * @param viewerId So'rov yuborgan odam — "obunamanmi?" va "menikimi?"
 *   savollariga javob berish uchun.
 */
export async function getBusinessProfile(slug: string, viewerId: string): Promise<BusinessProfileView> {
  const row = await prisma.businessProfile.findFirst({
    where: {
      OR: [{ restaurant: { slug, isActive: true } }, { shop: { slug, isActive: true } }],
    },
    select: BUSINESS_SELECT,
  });

  if (!row) {
    throw new NotFoundError('Biznes');
  }

  const { kind, entity } = resolveOwner(row);

  /**
   * Katalog, obunachilar soni va obuna holati BIR VAQTDA olinadi —
   * ketma-ket so'ralsa sahifa uch marta kutardi.
   */
  const [items, followerCount, follow] = await Promise.all([
    kind === 'RESTAURANT' ? loadMenuItems(entity.id) : loadProducts(entity.id),
    prisma.businessFollow.count({ where: { businessProfileId: row.id } }),
    prisma.businessFollow.findUnique({
      where: { userId_businessProfileId: { userId: viewerId, businessProfileId: row.id } },
      select: { id: true },
    }),
  ]);

  return {
    id: row.id,
    kind,
    slug: entity.slug,
    name: entity.name,
    description: entity.description,
    about: row.about,
    color: entity.color as ServiceColor,
    city: row.city,
    address: row.address,
    phone: row.phone,
    opensAt: row.opensAt,
    closesAt: row.closesAt,
    /**
     * Reyting bazada `Decimal` — u JSON'da o'z holicha ketolmaydi.
     * `Number` ga o'giriladi: bu PUL emas, shuning uchun kasr son
     * xavfsiz.
     */
    rating: Number(entity.rating),
    ratingCount: entity.ratingCount,
    isVerified: row.isVerified,
    isOpen: entity.isOpen,
    followerCount,
    itemCount: items.length,
    isFollowing: follow !== null,
    isOwner: entity.ownerId !== null && entity.ownerId === viewerId,
    orderUrl: kind === 'RESTAURANT' ? `/food/${entity.slug}` : `/marketplace/s/${entity.slug}`,
    items,
    image: toThumb(entity.images),
  };
}

/** `slug` bo'yicha profil ID'sini topadi. */
async function findProfileIdBySlug(slug: string): Promise<string> {
  const row = await prisma.businessProfile.findFirst({
    where: {
      OR: [{ restaurant: { slug, isActive: true } }, { shop: { slug, isActive: true } }],
    },
    select: { id: true },
  });

  if (!row) {
    throw new NotFoundError('Biznes');
  }

  return row.id;
}

export async function followBusiness(userId: string, slug: string): Promise<BusinessFollowResponse> {
  const businessProfileId = await findProfileIdBySlug(slug);

  try {
    await prisma.businessFollow.create({ data: { userId, businessProfileId } });

    logger.info({ userId, businessProfileId }, 'Biznesga obuna');
  } catch (error) {
    /**
     * Allaqachon obuna — xato emas. Tugma ikki marta bosilgan yoki
     * ikkita qurilmadan bosilgan bo'lishi mumkin; natija baribir
     * kerakli holat.
     */
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

    if (!isDuplicate) throw error;
  }

  return {
    isFollowing: true,
    followerCount: await prisma.businessFollow.count({ where: { businessProfileId } }),
  };
}

export async function unfollowBusiness(userId: string, slug: string): Promise<BusinessFollowResponse> {
  const businessProfileId = await findProfileIdBySlug(slug);

  await prisma.businessFollow.deleteMany({ where: { userId, businessProfileId } });

  return {
    isFollowing: false,
    followerCount: await prisma.businessFollow.count({ where: { businessProfileId } }),
  };
}
