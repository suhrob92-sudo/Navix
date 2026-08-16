import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { parseIdParam } from '@/lib/api/params';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { markAttachmentClicked } from '@/modules/feed/feed.service';

/**
 * POST /api/v1/posts/[id]/attachments/[attachmentId]/click — tugma bosildi.
 *
 * ── Nima uchun bu son AYRIM saqlanadi ─────────────────────────────────
 * Ko'rish — "video ekranda o'ynadi". Bosish — "odam narsani ochdi".
 * Muallif shu ikki sonni taqqoslab, videosi ishlayaptimi yoki
 * shunchaki tomosha bo'lyaptimi — bilib oladi.
 *
 * ── Nima uchun manzilda MAHSULOT emas, BIRIKTIRMA ID si ───────────────
 * Bitta mahsulot bir nechta videoga biriktirilgan bo'lishi mumkin.
 * Mahsulot ID si bilan qaysi video ishlaganini ajratib bo'lmasdi.
 */
export const dynamic = 'force-dynamic';

type Params = { id: string; attachmentId: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const resolved = await params;
  const postId = parseIdParam(resolved.id);
  const attachmentId = parseIdParam(resolved.attachmentId);

  await enforcePublicRateLimit('postShare', auth.userId, "Juda ko'p so'rov. Biroz kuting.");

  await markAttachmentClicked(postId, attachmentId, auth.userId);

  return apiSuccess({ counted: true }, { requestId });
});
