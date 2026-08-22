import type { NextRequest } from 'next/server';

import { NotFoundError } from '@/lib/api/errors';
import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { getRequestContext } from '@/lib/request-context';
import { cleanReferralCode } from '@/config/referral';
import { findByReferralCode } from '@/modules/referral/referral.service';
import type { ReferralInviterView } from '@/modules/referral/referral.types';

/**
 * GET /api/v1/referral/[code] — kim taklif qilyapti.
 *
 * ── Nima uchun bu yo'l KIRISHSIZ ochiq ────────────────────────────────
 * Havolani ochgan odam hali ro'yxatdan o'tmagan — u aynan shu
 * uchun kelgan. Kirish talab qilsak, sahifa hech qachon
 * ko'rinmasdi.
 *
 * ── Nima uchun CHEKLOV bor ────────────────────────────────────────────
 * Ochiq yo'l bo'lgani uchun uni kod taxmin qilishga ishlatish
 * mumkin. Kod 8 milliard variantdan iborat, ya'ni taxmin qilish
 * amalda imkonsiz — lekin urinishning o'zi bazani bekorga
 * ishlatardi.
 *
 * ── Nima QAYTARILADI ──────────────────────────────────────────────────
 * Faqat ism, rasm va foydalanuvchi nomi. Telefon raqami, hisob
 * yoshi yoki boshqa hech narsa yo'q: bu ma'lumot begona odamga
 * ko'rinadi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(
  async (request: NextRequest, { requestId, params }) => {
    const context = getRequestContext(request);

    await enforcePublicRateLimit('referralLookup', context.ipAddress ?? 'noma\'lum');

    const { code } = await (params as Promise<{ code: string }>);

    const inviter = await findByReferralCode(cleanReferralCode(code));

    if (!inviter) throw new NotFoundError('Taklif havolasi');

    return apiSuccess<ReferralInviterView>(inviter, {
      requestId,
      headers: { 'cache-control': 'no-store' },
    });
  },
);
