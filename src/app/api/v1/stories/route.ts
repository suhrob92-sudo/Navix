import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { createStorySchema } from '@/modules/story/story.schemas';
import { createStory, listStoryTray, schedulePurge } from '@/modules/story/story.service';
import type { StoryTrayResponse } from '@/modules/story/story.types';

/**
 * GET  /api/v1/stories — lenta tepasidagi halqa.
 * POST /api/v1/stories — hikoya joylash.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  const groups = await listStoryTray(auth.userId);

  /**
   * Muddati o'tgan hikoyalarning fayllari FON REJIMIDA tozalanadi.
   *
   * Javob kutilmaydi: halqa darhol ochilishi kerak. Redisdagi qulf
   * tozalashni soatiga bir martadan ko'p ishlatmaydi.
   */
  schedulePurge();

  return apiSuccess<StoryTrayResponse>({ groups }, {
    requestId,
    headers: { 'cache-control': 'no-store' },
  });
});

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);
  const input = await parseJsonBody(request, createStorySchema);

  await enforcePublicRateLimit('createStory', auth.userId, "Juda ko'p hikoya joylayapsiz. Biroz kuting.");

  const story = await createStory(auth.userId, input);

  return apiSuccess({ story }, { requestId, status: 201 });
});
