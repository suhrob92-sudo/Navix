import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { requireAuth } from '@/modules/auth/auth.guard';
import { usernameParamSchema } from '@/modules/profile/social.schemas';
import { getPublicProfile } from '@/modules/profile/social.service';

/**
 * GET /api/v1/users/[username] — ommaviy profil.
 *
 * ── Nima uchun KIRISH talab qilinadi ──────────────────────────────────
 * Javobda "siz unga obunamisiz?" degan ma'lumot bor — buni bilish uchun
 * kimligingiz kerak. Bundan tashqari bloklash (12-bosqich) ham faqat
 * kim so'rayotgani ma'lum bo'lgandagina ishlaydi.
 */
export const dynamic = 'force-dynamic';

type Params = { username: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const username = usernameParamSchema.parse((await params).username);

  const profile = await getPublicProfile(username, auth.userId);

  return apiSuccess({ profile }, { requestId, headers: { 'cache-control': 'no-store' } });
});
