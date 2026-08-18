import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createCollectionSchema } from '@/modules/feed/collection.schemas';
import { createCollection, listCollections } from '@/modules/feed/collection.service';

/**
 * GET  /api/v1/feed/collections — mening to'plamlarim.
 * POST /api/v1/feed/collections — yangi to'plam.
 *
 * To'plamlar SHAXSIY: begona odamning to'plamlarini ko'rish yo'li
 * umuman yo'q. Saqlash ham shaxsiy va uni papkalarga ajratish
 * undan ham shaxsiyroq.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const collections = await listCollections(auth.userId);

  return apiSuccess({ collections }, { requestId, headers: { 'cache-control': 'no-store' } });
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createCollectionSchema);

  /*
    Chegara — bir daqiqada nechta to'plam.

    To'plamlar soni yigirmata bilan cheklangan, lekin yasash va
    o'chirishni takrorlab, bazani bekorga yuklash mumkin edi.
  */
  await enforcePublicRateLimit('postCreate', auth.userId, "Juda ko'p to'plam yasayapsiz. Biroz kuting.");

  const collection = await createCollection(auth.userId, input.name);

  return apiSuccess({ collection }, { requestId, status: 201 });
});
