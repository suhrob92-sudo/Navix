import type { NextRequest } from 'next/server';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { reportUserSchema } from '@/modules/moderation/moderation.schemas';
import { reportUser } from '@/modules/moderation/moderation.service';
import { usernameParamSchema } from '@/modules/profile/social.schemas';
import type { ReportResponse } from '@/modules/moderation/moderation.types';

/**
 * POST /api/v1/users/[username]/report — shikoyat yuborish.
 *
 * ── Nima uchun javob HAR DOIM bir xil ─────────────────────────────────
 * Takroriy shikoyat ham "qabul qilindi" deb javob beradi. Aks holda
 * "siz allaqachon shikoyat qilgansiz" degan xabar shikoyatning
 * ko'rilayotganini oshkor qilardi va odam qayta-qayta urinardi.
 */
export const dynamic = 'force-dynamic';

type Params = { username: string };

export const POST = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const username = usernameParamSchema.parse((await params).username);
  const input = await parseJsonBody(request, reportUserSchema);

  await enforcePublicRateLimit('userReport', auth.userId, "Juda ko'p shikoyat yuboryapsiz. Biroz kuting.");

  await reportUser(auth.userId, username, input);

  return apiSuccess<ReportResponse>({ isReported: true }, { requestId, status: 201 });
});
