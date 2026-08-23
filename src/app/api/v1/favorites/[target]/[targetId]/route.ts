import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { favoriteTargetFromSlug } from '@/config/favorite';
import { NotFoundError } from '@/lib/api/errors';
import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { addFavorite, removeFavorite } from '@/modules/favorite/favorite.service';
import type { FavoriteToggleResponse } from '@/modules/favorite/favorite.types';

/**
 * Sevimlilarga qo'shish va olib tashlash.
 *
 * ── Nima uchun "almashtirish" (toggle) EMAS ───────────────────────────
 * Bitta manzil "bor bo'lsa o'chir, yo'q bo'lsa qo'sh" deb ishlashi
 * mumkin edi. Lekin mobil internetda so'rov sekin ketadi va odam
 * tugmani ikki marta bosadi — almashtirishda natija tasodifiy
 * bo'lardi.
 *
 * `POST` va `DELETE` esa TAKRORLASHGA BEFARQ: ikki marta yuborilsa
 * ham natija bir xil.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  target: z.string(),
  targetId: z.uuid("ID noto'g'ri"),
});

type Params = { target: string; targetId: string };

function readParams(raw: Params) {
  const parsed = paramsSchema.parse(raw);
  const target = favoriteTargetFromSlug(parsed.target);

  if (!target) {
    throw new NotFoundError('Sahifa');
  }

  return { target, targetId: parsed.targetId };
}

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { target, targetId } = readParams(await params);

  await enforcePublicRateLimit('favorite', auth.userId, "Juda tez-tez o'zgartiryapsiz. Biroz kuting.");

  const count = await addFavorite(target, targetId, auth.userId);

  return apiSuccess<FavoriteToggleResponse>({ isFavorite: true, count }, { requestId, status: 201 });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { target, targetId } = readParams(await params);

  await enforcePublicRateLimit('favorite', auth.userId, "Juda tez-tez o'zgartiryapsiz. Biroz kuting.");

  const count = await removeFavorite(target, targetId, auth.userId);

  return apiSuccess<FavoriteToggleResponse>({ isFavorite: false, count }, { requestId });
});
