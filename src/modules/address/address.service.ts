import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import type { CreateAddressInput, UpdateAddressInput } from '@/modules/address/address.schemas';

/**
 * Saqlangan manzillar bilan ishlash.
 *
 * Qoidalar:
 *  - Foydalanuvchi faqat O'Z manzillarini ko'radi va tahrirlaydi;
 *  - Bir vaqtda faqat BITTA standart (default) manzil bo'ladi;
 *  - O'chirish "yumshoq" (soft delete) — eski buyurtmalarda manzil
 *    ko'rinib turishi kerak, aks holda tarix buziladi.
 */

/** Bitta foydalanuvchi saqlashi mumkin bo'lgan manzillar chegarasi. */
const MAX_ADDRESSES_PER_USER = 20;

const ADDRESS_SELECT = {
  id: true,
  type: true,
  label: true,
  country: true,
  city: true,
  district: true,
  street: true,
  building: true,
  apartment: true,
  postalCode: true,
  latitude: true,
  longitude: true,
  notes: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface AddressPayload {
  id: string;
  type: string;
  label: string;
  country: string;
  city: string;
  district: string | null;
  street: string;
  building: string | null;
  apartment: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  notes: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prisma `Decimal` turini oddiy songa aylantiradi.
 * `Decimal` JSON'ga to'g'ridan-to'g'ri o'girilmaydi, shuning uchun kerak.
 */
function toAddressPayload(address: {
  id: string;
  type: string;
  label: string;
  country: string;
  city: string;
  district: string | null;
  street: string;
  building: string | null;
  apartment: string | null;
  postalCode: string | null;
  latitude: { toString(): string };
  longitude: { toString(): string };
  notes: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AddressPayload {
  return {
    ...address,
    latitude: Number(address.latitude.toString()),
    longitude: Number(address.longitude.toString()),
  };
}

/** Foydalanuvchining barcha manzillari. Standart manzil birinchi turadi. */
export async function listAddresses(userId: string): Promise<AddressPayload[]> {
  const addresses = await prisma.address.findMany({
    where: { userId, deletedAt: null },
    select: ADDRESS_SELECT,
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return addresses.map(toAddressPayload);
}

/** Bitta manzilni qaytaradi. Boshqa foydalanuvchi manzili bo'lsa — topilmadi. */
export async function getAddress(userId: string, addressId: string): Promise<AddressPayload> {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId, deletedAt: null },
    select: ADDRESS_SELECT,
  });

  if (!address) {
    throw new NotFoundError('Manzil');
  }

  return toAddressPayload(address);
}

/** Yangi manzil qo'shadi. */
export async function createAddress(userId: string, input: CreateAddressInput): Promise<AddressPayload> {
  const existingCount = await prisma.address.count({ where: { userId, deletedAt: null } });

  if (existingCount >= MAX_ADDRESSES_PER_USER) {
    throw new ConflictError(
      `Ko'pi bilan ${MAX_ADDRESSES_PER_USER} ta manzil saqlash mumkin. Keraksizlarini o'chiring.`,
    );
  }

  // Birinchi manzil avtomatik standart bo'ladi — foydalanuvchi buni o'ylab
  // o'tirmasligi kerak.
  const shouldBeDefault = input.isDefault || existingCount === 0;

  const created = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.address.updateMany({
        where: { userId, deletedAt: null, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        userId,
        type: input.type,
        label: input.label,
        city: input.city,
        district: input.district ?? null,
        street: input.street,
        building: input.building ?? null,
        apartment: input.apartment ?? null,
        postalCode: input.postalCode ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        notes: input.notes ?? null,
        isDefault: shouldBeDefault,
      },
      select: ADDRESS_SELECT,
    });
  });

  return toAddressPayload(created);
}

/** Manzilni yangilaydi. */
export async function updateAddress(
  userId: string,
  addressId: string,
  input: UpdateAddressInput,
): Promise<AddressPayload> {
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId, deletedAt: null },
    select: { id: true, isDefault: true },
  });

  if (!existing) {
    throw new NotFoundError('Manzil');
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Bu manzil standart qilinayotgan bo'lsa — qolganlaridan belgini olamiz.
    if (input.isDefault === true && !existing.isDefault) {
      await tx.address.updateMany({
        where: { userId, deletedAt: null, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id: addressId },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.district !== undefined ? { district: input.district } : {}),
        ...(input.street !== undefined ? { street: input.street } : {}),
        ...(input.building !== undefined ? { building: input.building } : {}),
        ...(input.apartment !== undefined ? { apartment: input.apartment } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        // Standart belgisini olib tashlashga ruxsat bermaymiz — kamida bitta
        // standart manzil qolishi kerak. Boshqasini standart qilish orqali almashtiriladi.
        ...(input.isDefault === true ? { isDefault: true } : {}),
      },
      select: ADDRESS_SELECT,
    });
  });

  return toAddressPayload(updated);
}

/**
 * Manzilni o'chiradi (yumshoq o'chirish).
 * Standart manzil o'chirilsa — eng yangi qolgan manzil standart bo'ladi.
 */
export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId, deletedAt: null },
    select: { id: true, isDefault: true },
  });

  if (!existing) {
    throw new NotFoundError('Manzil');
  }

  await prisma.$transaction(async (tx) => {
    await tx.address.update({
      where: { id: addressId },
      data: { deletedAt: new Date(), isDefault: false },
    });

    if (!existing.isDefault) return;

    const nextDefault = await tx.address.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    if (nextDefault) {
      await tx.address.update({ where: { id: nextDefault.id }, data: { isDefault: true } });
    }
  });
}
