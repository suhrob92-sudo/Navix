import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { ownerFromSlug } from '@/config/catalog-image';
import { Role } from '@/config/rbac';
import { NotFoundError } from '@/lib/api/errors';
import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import {
  addCatalogImageSchema,
  reorderCatalogImagesSchema,
} from '@/modules/catalog/catalog-image.schemas';
import {
  addCatalogImage,
  listCatalogImages,
  reorderCatalogImages,
} from '@/modules/catalog/catalog-image.service';
import type { CatalogImagesResponse } from '@/modules/catalog/catalog-image.types';

/**
 * Katalog rasmlari — bitta narsaga tegishli barcha rasmlar.
 *
 * ── Nima uchun BITTA manzil yettita emas ──────────────────────────────
 * `/seller/products/[id]/images`, `/merchant/menu-items/[id]/images` va
 * shunga o'xshash yettita manzil yozish mumkin edi. Lekin ularning
 * ichidagi kod bir xil bo'lardi va rasm sonining chegarasi kabi
 * qoidalar yettita joyda takrorlanardi.
 *
 * Bitta manzilda esa tekshiruv ham bitta joyda: `requireOwnership`.
 *
 * ── Nima uchun tur MANZILDA ───────────────────────────────────────────
 * Turni so'rov tanasiga qo'yish ham mumkin edi, lekin u holda `GET`
 * so'rovi turni umuman yubora olmasdi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  owner: z.string(),
  ownerId: z.uuid("ID noto'g'ri"),
});

type Params = { owner: string; ownerId: string };

/**
 * Manzildagi turni tekshiradi.
 *
 * Noma'lum tur "topilmadi" deb qaytariladi: u aslida mavjud bo'lmagan
 * manzil va uni "noto'g'ri so'rov" deb atash chalkash bo'lardi.
 */
function readParams(raw: Params) {
  const parsed = paramsSchema.parse(raw);
  const owner = ownerFromSlug(parsed.owner);

  if (!owner) {
    throw new NotFoundError('Sahifa');
  }

  return { owner, ownerId: parsed.ownerId };
}

/** Administrator har qanday katalogga rasm qo'sha oladi. */
function isAdminActor(roles: readonly string[]): boolean {
  return roles.includes(Role.ADMIN) || roles.includes(Role.SUPER_ADMIN);
}

/**
 * GET — rasmlar ro'yxati.
 *
 * Kirish talab qilinmaydi: mahsulot rasmi katalogda baribir ochiq
 * ko'rinadi.
 */
export const GET = withApiHandler<Params>(async (_request: NextRequest, { requestId, params }) => {
  const { owner, ownerId } = readParams(await params);

  const images = await listCatalogImages(owner, ownerId);

  return apiSuccess<CatalogImagesResponse>({ images }, { requestId });
});

/** POST — rasm qo'shish. */
export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { owner, ownerId } = readParams(await params);

  await enforcePublicRateLimit('catalogImage', auth.userId, "Juda tez-tez o'zgartiryapsiz. Biroz kuting.");

  const input = await parseJsonBody(request, addCatalogImageSchema);

  const images = await addCatalogImage(owner, ownerId, input, {
    userId: auth.userId,
    isAdmin: isAdminActor(auth.roles),
  });

  return apiSuccess<CatalogImagesResponse>({ images }, { requestId, status: 201 });
});

/** PUT — tartibni o'zgartirish. */
export const PUT = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { owner, ownerId } = readParams(await params);

  await enforcePublicRateLimit('catalogImage', auth.userId, "Juda tez-tez o'zgartiryapsiz. Biroz kuting.");

  const input = await parseJsonBody(request, reorderCatalogImagesSchema);

  const images = await reorderCatalogImages(owner, ownerId, input.imageIds, {
    userId: auth.userId,
    isAdmin: isAdminActor(auth.roles),
  });

  return apiSuccess<CatalogImagesResponse>({ images }, { requestId });
});
