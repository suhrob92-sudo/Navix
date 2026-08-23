import {
  ATTRIBUTE_NAME_MAX_LENGTH,
  ATTRIBUTE_VALUE_MAX_LENGTH,
  MAX_PRODUCT_ATTRIBUTES,
} from '@/config/product-detail';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

/**
 * Mahsulot xususiyatlari.
 *
 * ── Nima uchun BUTUN ro'yxat almashtiriladi ───────────────────────────
 * "Bitta xususiyat qo'sh", "bittasini o'chir" degan amallar ham
 * mumkin edi.
 *
 * Lekin sotuvchi ularni jadval ko'rinishida, birdaniga tahrirlaydi:
 * uchtasini o'zgartirib, bittasini o'chirib, ikkitasini qo'shadi.
 * Har biriga alohida so'rov ketsa, yarmi bajarilib yarmi
 * bajarilmagan holat paydo bo'lardi.
 *
 * Butun ro'yxat esa bir tranzaksiyada yoziladi: natija har doim
 * to'liq va bir qiymatli.
 */

export interface AttributeInput {
  name: string;
  value: string;
}

export interface AttributeView {
  id: string;
  name: string;
  value: string;
  sortOrder: number;
}

/** Mahsulot shu odamnikimi. */
async function requireOwnership(productId: string, userId: string, isAdmin: boolean): Promise<void> {
  const row = await prisma.product.findFirst({
    where: { id: productId, ...(isAdmin ? {} : { shop: { ownerId: userId } }) },
    select: { id: true },
  });

  if (!row) {
    /**
     * Begona mahsulot uchun ham "topilmadi" qaytariladi.
     *
     * "Sizniki emas" degan javob boshqa sotuvchining mahsuloti
     * mavjudligini tasdiqlab qo'yardi.
     */
    throw new NotFoundError('Mahsulot');
  }
}

/** Mahsulot xususiyatlari — tartib bo'yicha. */
export async function listAttributes(productId: string): Promise<AttributeView[]> {
  return prisma.productAttribute.findMany({
    where: { productId },
    select: { id: true, name: true, value: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Xususiyatlarni to'liq almashtiradi.
 *
 * @param input Yangi ro'yxat. Bo'sh massiv — hammasini o'chirish.
 */
export async function replaceAttributes(
  productId: string,
  input: readonly AttributeInput[],
  actor: { userId: string; isAdmin: boolean },
): Promise<AttributeView[]> {
  await requireOwnership(productId, actor.userId, actor.isAdmin);

  if (input.length > MAX_PRODUCT_ATTRIBUTES) {
    throw new ConflictError(`Eng ko'pi ${MAX_PRODUCT_ATTRIBUTES} ta xususiyat qo'shish mumkin`);
  }

  /**
   * Nomlar TAKRORLANMASLIGI kerak.
   *
   * Bazada ham cheklov bor, lekin u xatoni tushunarsiz shaklda
   * qaytarardi ("unique constraint failed"). Bu yerda esa sotuvchi
   * aynan qaysi nom takrorlanganini ko'radi.
   *
   * Taqqoslash KATTA-KICHIK harfsiz: "Rang" va "rang" — bitta
   * xususiyat.
   */
  const seen = new Set<string>();

  for (const attribute of input) {
    const key = attribute.name.trim().toLowerCase();

    if (seen.has(key)) {
      throw new ConflictError(`"${attribute.name.trim()}" xususiyati ikki marta yozilgan`);
    }

    seen.add(key);
  }

  const prepared = input.map((attribute, index) => ({
    productId,
    name: attribute.name.trim().slice(0, ATTRIBUTE_NAME_MAX_LENGTH),
    value: attribute.value.trim().slice(0, ATTRIBUTE_VALUE_MAX_LENGTH),
    sortOrder: index,
  }));

  await prisma.$transaction([
    prisma.productAttribute.deleteMany({ where: { productId } }),
    ...(prepared.length > 0
      ? [prisma.productAttribute.createMany({ data: prepared })]
      : []),
  ]);

  logger.info({ productId, userId: actor.userId, count: prepared.length }, "Xususiyatlar yangilandi");

  return listAttributes(productId);
}
