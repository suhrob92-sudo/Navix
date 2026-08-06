import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { completeOnboarding } from '@/modules/profile/profile.service';

/**
 * POST /api/v1/profile/onboarding — tanishtiruv tugatildi.
 *
 * Alohida endpoint: bu SOZLAMA emas, HOLAT. `PATCH /profile` orqali
 * yuborilsa, foydalanuvchi uni istalgan vaqtda o'zgartira olardi va
 * "ko'rganmi yoki yo'q" degan ma'lumot ishonchsiz bo'lib qolardi.
 */
export const dynamic = 'force-dynamic';

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requirePermission(request, Permission.PROFILE_UPDATE);

  const profile = await completeOnboarding(auth.userId);

  return apiSuccess(profile, { requestId });
});
