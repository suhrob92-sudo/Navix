import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { isGroupInviteCode } from '@/config/group-invite';
import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { NotFoundError } from '@/lib/api/errors';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { getRequestContext } from '@/lib/request-context';
import { previewGroupInvite } from '@/modules/chat/group-invite.service';

/**
 * GET /api/v1/chat/invite/[code] — havola qaysi guruhga tegishli.
 *
 * ── Nima uchun KIRISH talab qilinmaydi ────────────────────────────────
 * Havolaning butun maqsadi — ilovada bo'lmagan odamni chaqirish.
 * Kirish talab qilinsa, u nima uchun ro'yxatdan o'tayotganini
 * bilmasdi.
 *
 * Javobda faqat nom, rasm va a'zolar soni bor. A'zolarning ismlari,
 * xabarlar va guruh ID'si BERILMAYDI: havola tasodifan begona odamga
 * tushsa ham, u guruh ichini ko'rmaydi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ code: z.string().trim().toUpperCase() });

type Params = { code: string };

export const GET = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const context = getRequestContext(request);

  await enforcePublicRateLimit('groupInviteLookup', context.ipAddress ?? 'anonim');

  const { code } = paramsSchema.parse(await params);

  /**
   * Shakli noto'g'ri kod BAZAGA umuman bormaydi.
   *
   * Bu tezlik uchun emas, himoya uchun: bazaga har qanday matnni
   * yubormaslik kerak.
   */
  if (!isGroupInviteCode(code)) {
    throw new NotFoundError('Havola');
  }

  const invite = await previewGroupInvite(code);

  if (!invite) {
    throw new NotFoundError('Havola');
  }

  return apiSuccess({ invite }, { requestId });
});
