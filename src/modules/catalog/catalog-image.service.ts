import { Prisma } from '@/generated/prisma/client';
import {
  fallbackAlt,
  IMAGE_ALT_MAX_LENGTH,
  MAX_CATALOG_IMAGES,
  nextSortOrder,
  OWNER_COLUMN,
  OWNER_LABEL,
  type CatalogImageOwner,
} from '@/config/catalog-image';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { deleteImageByUrl } from '@/modules/upload/upload.service';
import type { CatalogImageView } from '@/modules/catalog/catalog-image.types';

/**
 * Katalog rasmlari.
 *
 * ── Modulning ENG NOZIK joyi: KIM rasm qo'sha oladi ──────────────────
 * Rasm qo'shish — bu boshqa odamning do'koniga aralashish imkoniyati.
 * Tekshiruvsiz istalgan foydalanuvchi begona mahsulotga istalgan
 * rasmni ilib qo'ya olardi.
 *
 * Shuning uchun har bir tur uchun egalik ALOHIDA tekshiriladi va
 * tekshiruv jadvali quyida, bitta joyda yozilgan — u yerda unutish
 * mumkin emas.
 */

const IMAGE_SELECT = {
  id: true,
  url: true,
  alt: true,
  sortOrder: true,
} as const;

/**
 * Egalik tekshiruvi: bu odam shu narsaga rasm qo'sha oladimi.
 *
 * ── Nima uchun har biriga alohida so'rov ──────────────────────────────
 * Yo'llar boshqa-boshqa: mahsulot do'kon orqali, taom restoran orqali,
 * xona esa mehmonxona orqali egaga bog'lanadi. Ularni bitta so'rovga
 * yig'ish kodni qisqartirardi, lekin o'qib bo'lmas holga keltirardi.
 *
 * ── Nima uchun mehmonxona ADMIN uchun ─────────────────────────────────
 * Mehmonxona va kompaniya jadvallarida "ega" tushunchasi yo'q: ularni
 * hozircha administrator kiritadi. Shuning uchun ularga rasm qo'shish
 * ham administrator ishi.
 *
 * @returns Egasining nomi — rasm tavsifini yasash uchun.
 */
async function requireOwnership(
  owner: CatalogImageOwner,
  ownerId: string,
  userId: string,
  isAdmin: boolean,
): Promise<string> {
  const notFound = () => new NotFoundError(OWNER_LABEL[owner]);

  switch (owner) {
    case 'PRODUCT': {
      const row = await prisma.product.findFirst({
        where: { id: ownerId, ...(isAdmin ? {} : { shop: { ownerId: userId } }) },
        select: { name: true },
      });

      if (!row) throw notFound();

      return row.name;
    }

    case 'SHOP': {
      const row = await prisma.shop.findFirst({
        where: { id: ownerId, ...(isAdmin ? {} : { ownerId: userId }) },
        select: { name: true },
      });

      if (!row) throw notFound();

      return row.name;
    }

    case 'MENU_ITEM': {
      const row = await prisma.menuItem.findFirst({
        where: { id: ownerId, ...(isAdmin ? {} : { restaurant: { ownerId: userId } }) },
        select: { name: true },
      });

      if (!row) throw notFound();

      return row.name;
    }

    case 'RESTAURANT': {
      const row = await prisma.restaurant.findFirst({
        where: { id: ownerId, ...(isAdmin ? {} : { ownerId: userId }) },
        select: { name: true },
      });

      if (!row) throw notFound();

      return row.name;
    }

    case 'COMPANY': {
      const row = await prisma.company.findFirst({
        where: { id: ownerId, ...(isAdmin ? {} : { ownerId: userId }) },
        select: { name: true },
      });

      if (!row) throw notFound();

      return row.name;
    }

    case 'HOTEL':
    case 'HOTEL_ROOM': {
      /**
       * Mehmonxonada "ega" ustuni YO'Q.
       *
       * Uni hozircha faqat administrator kiritadi, shuning uchun rasm
       * ham faqat administrator ishi. Egalik ustuni qo'shilganda bu
       * shart o'zgaradi.
       */
      if (!isAdmin) {
        throw new ForbiddenError("Bu bo'limga rasm qo'shishga ruxsat yo'q");
      }

      const row =
        owner === 'HOTEL'
          ? await prisma.hotel.findUnique({ where: { id: ownerId }, select: { name: true } })
          : await prisma.hotelRoom.findUnique({ where: { id: ownerId }, select: { name: true } });

      if (!row) throw notFound();

      return row.name;
    }
  }
}

/** Egasining ustunini `where` shartiga aylantiradi. */
function ownerFilter(owner: CatalogImageOwner, ownerId: string): Prisma.CatalogImageWhereInput {
  return { [OWNER_COLUMN[owner]]: ownerId } as Prisma.CatalogImageWhereInput;
}

/**
 * Narsaga tegishli rasmlar.
 *
 * ── Nima uchun KIRISH talab qilinmaydi ────────────────────────────────
 * Mahsulot rasmi katalogda ochiq ko'rinadi — uni yashirishning ma'nosi
 * yo'q. Qo'shish va o'chirish esa albatta huquq talab qiladi.
 */
export async function listCatalogImages(
  owner: CatalogImageOwner,
  ownerId: string,
): Promise<CatalogImageView[]> {
  const rows = await prisma.catalogImage.findMany({
    where: ownerFilter(owner, ownerId),
    select: IMAGE_SELECT,
    orderBy: { sortOrder: 'asc' },
  });

  return rows;
}

/** Rasm qo'shadi. */
export async function addCatalogImage(
  owner: CatalogImageOwner,
  ownerId: string,
  input: { url: string; alt?: string | null },
  actor: { userId: string; isAdmin: boolean },
): Promise<CatalogImageView[]> {
  const ownerName = await requireOwnership(owner, ownerId, actor.userId, actor.isAdmin);

  const existing = await prisma.catalogImage.findMany({
    where: ownerFilter(owner, ownerId),
    select: { sortOrder: true },
  });

  if (existing.length >= MAX_CATALOG_IMAGES) {
    throw new ConflictError(`Eng ko'pi ${MAX_CATALOG_IMAGES} ta rasm qo'shish mumkin`);
  }

  /**
   * Tavsif berilmasa NOMDAN yasaladi.
   *
   * Sotuvchi tavsif yozishni deyarli hech qachon xohlamaydi, bo'sh
   * tavsif esa ekranni o'quvchi dasturga "rasm" deb eshitiladi.
   */
  const alt = (input.alt?.trim() || fallbackAlt(ownerName, existing.length)).slice(0, IMAGE_ALT_MAX_LENGTH);

  await prisma.catalogImage.create({
    data: {
      url: input.url,
      alt,
      sortOrder: nextSortOrder(existing),
      [OWNER_COLUMN[owner]]: ownerId,
    } as Prisma.CatalogImageUncheckedCreateInput,
    select: { id: true },
  });

  logger.info({ owner, ownerId, userId: actor.userId }, "Katalog rasmi qo'shildi");

  return listCatalogImages(owner, ownerId);
}

/** Rasmni o'chiradi. */
export async function removeCatalogImage(
  owner: CatalogImageOwner,
  ownerId: string,
  imageId: string,
  actor: { userId: string; isAdmin: boolean },
): Promise<CatalogImageView[]> {
  await requireOwnership(owner, ownerId, actor.userId, actor.isAdmin);

  const image = await prisma.catalogImage.findFirst({
    where: { id: imageId, ...ownerFilter(owner, ownerId) },
    select: { id: true, url: true },
  });

  if (!image) {
    throw new NotFoundError('Rasm');
  }

  await prisma.catalogImage.delete({ where: { id: image.id } });

  /**
   * Fayl ham o'chiriladi.
   *
   * ── Nima uchun BAZADAN KEYIN ────────────────────────────────────────
   * Avval fayl o'chirilsa va bazaga yozish xato bersa, ro'yxatda
   * ochilmaydigan rasm qolardi — bu buzilgan rasm belgisi bo'lib
   * ko'rinadi.
   *
   * Aksincha bo'lsa (fayl qoladi, yozuv yo'q), eng yomoni — omborda
   * ishlatilmaydigan fayl qoladi va uni hech kim ko'rmaydi.
   */
  await deleteImageByUrl(image.url);

  logger.info({ owner, ownerId, imageId, userId: actor.userId }, "Katalog rasmi o'chirildi");

  return listCatalogImages(owner, ownerId);
}

/**
 * Rasmlar tartibini o'zgartiradi.
 *
 * ── Nima uchun BUTUN ro'yxat yuboriladi ───────────────────────────────
 * "Bu rasmni yuqoriga ko'tar" degan amal ham mumkin edi, lekin unda
 * har bir bosishda so'rov ketardi va ikki marta tez bosilganda tartib
 * chalkashib ketardi.
 *
 * Butun ro'yxat esa bir marta yuboriladi va natija bir qiymatli:
 * qanday yuborilgan bo'lsa, shunday saqlanadi.
 */
export async function reorderCatalogImages(
  owner: CatalogImageOwner,
  ownerId: string,
  imageIds: readonly string[],
  actor: { userId: string; isAdmin: boolean },
): Promise<CatalogImageView[]> {
  await requireOwnership(owner, ownerId, actor.userId, actor.isAdmin);

  const existing = await prisma.catalogImage.findMany({
    where: ownerFilter(owner, ownerId),
    select: { id: true },
  });

  const known = new Set(existing.map((image) => image.id));

  /**
   * Yuborilgan ro'yxat MAVJUDLARI bilan mos kelishi kerak.
   *
   * Aks holda begona rasm ID'sini qo'shib, uni boshqa mahsulotga
   * ko'chirib yuborish mumkin bo'lardi.
   */
  if (imageIds.length !== existing.length || imageIds.some((id) => !known.has(id))) {
    throw new ConflictError("Rasmlar ro'yxati mos kelmadi. Sahifani yangilang.");
  }

  await prisma.$transaction(
    imageIds.map((id, index) =>
      prisma.catalogImage.update({ where: { id }, data: { sortOrder: index }, select: { id: true } }),
    ),
  );

  logger.info({ owner, ownerId, userId: actor.userId }, "Katalog rasmlari tartiblandi");

  return listCatalogImages(owner, ownerId);
}
