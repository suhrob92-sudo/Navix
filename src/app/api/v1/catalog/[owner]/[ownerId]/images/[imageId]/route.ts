import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { ownerFromSlug } from '@/config/catalog-image';
import { Role } from '@/config/rbac';
import { NotFoundError } from '@/lib/api/errors';
import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { removeCatalogImage } from '@/modules/catalog/catalog-image.service';
import type { CatalogImagesResponse } from '@/modules/catalog/catalog-image.types';

/**
 * DELETE /api/v1/catalog/[owner]/[ownerId]/images/[imageId]
 *
 * ── Nima uchun manzilda EGASI ham bor ─────────────────────────────────
 * Faqat rasm ID'si bilan ham o'chirish mumkin edi. Lekin u holda
 * egalikni rasmning o'zidan qidirishga to'g'ri kelardi: "bu rasm
 * qaysi ustunga bog'langan" degan yettita shartli tekshiruv.
 *
 * Egasi manzilda bo'lsa, tekshiruv qo'shish bilan bir xil yo'ldan
 * o'tadi va rasm o'sha egaga tegishli ekani ham tekshiriladi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  owner: z.string(),
  ownerId: z.uuid("ID noto'g'ri"),
  imageId: z.uuid("Rasm ID noto'g'ri"),
});

type Params = { owner: string; ownerId: string; imageId: string };

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const parsed = paramsSchema.parse(await params);
  const owner = ownerFromSlug(parsed.owner);

  if (!owner) {
    throw new NotFoundError('Sahifa');
  }

  await enforcePublicRateLimit('catalogImage', auth.userId, "Juda tez-tez o'zgartiryapsiz. Biroz kuting.");

  const images = await removeCatalogImage(owner, parsed.ownerId, parsed.imageId, {
    userId: auth.userId,
    isAdmin: auth.roles.includes(Role.ADMIN) || auth.roles.includes(Role.SUPER_ADMIN),
  });

  return apiSuccess<CatalogImagesResponse>({ images }, { requestId });
});
