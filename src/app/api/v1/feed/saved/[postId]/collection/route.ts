import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { setSaveCollectionSchema } from '@/modules/feed/collection.schemas';
import { setSaveCollection } from '@/modules/feed/collection.service';

/**
 * PUT /api/v1/feed/saved/[postId]/collection — postni to'plamga solish.
 *
 * ── Nima uchun PUT, POST emas ─────────────────────────────────────────
 * Amal QAYTA-QAYTA bajarilsa ham natija bir xil bo'ladi: post
 * ko'rsatilgan to'plamda turadi. Bu — PUT ning ta'rifi.
 *
 * Tarmoq uzilib, so'rov ikki marta ketsa ham hech narsa buzilmaydi.
 */
export const dynamic = 'force-dynamic';

type Params = { postId: string };

export const PUT = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const postId = parseIdParam((await params).postId);
  const input = await parseJsonBody(request, setSaveCollectionSchema);

  const result = await setSaveCollection(auth.userId, postId, input.collectionId);

  return apiSuccess(result, { requestId });
});
