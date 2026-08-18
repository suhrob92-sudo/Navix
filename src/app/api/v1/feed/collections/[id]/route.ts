import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { renameCollectionSchema } from '@/modules/feed/collection.schemas';
import { deleteCollection, renameCollection } from '@/modules/feed/collection.service';

/**
 * PATCH  /api/v1/feed/collections/[id] — nomini o'zgartirish.
 * DELETE /api/v1/feed/collections/[id] — to'plamni o'chirish.
 *
 * O'chirish ichidagi POSTLARNI o'chirmaydi: ular "guruhlanmagan"
 * holatga o'tadi. Odam papkani o'chirmoqchi, ellikta saqlangan
 * postni emas.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);
  const input = await parseJsonBody(request, renameCollectionSchema);

  const collection = await renameCollection(auth.userId, id, input.name);

  return apiSuccess({ collection }, { requestId });
});

export const DELETE = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const id = parseIdParam((await params).id);

  const result = await deleteCollection(auth.userId, id);

  return apiSuccess(result, { requestId });
});
