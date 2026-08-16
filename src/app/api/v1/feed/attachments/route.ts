import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { ValidationError } from '@/lib/api/errors';
import { requireAuth } from '@/modules/auth/auth.guard';
import { isAttachmentKind } from '@/config/attachments';
import { searchAttachments, type AttachmentSearchResult } from '@/modules/feed/attachment.service';

/**
 * GET /api/v1/feed/attachments?kind=PRODUCT&q=... — tanlash oynasi uchun.
 *
 * ── Nima uchun BITTA manzil, har bo'limga alohida emas ────────────────
 * Marketplace, restoranlar va ishlarning o'z qidiruv manzillari bor,
 * lekin ular boshqa maqsad uchun yasalgan: sahifalash, filtrlar,
 * saralash, to'liq kartochka.
 *
 * Tanlash oynasiga esa uchta narsa kerak: nom, ostidagi bitta qator
 * va ID. Mavjud manzillardan foydalansak, oyna beshta har xil
 * javob shaklini tushunishi kerak bo'lardi.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  await requireAuth(request);

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind') ?? '';

  if (!isAttachmentKind(kind)) {
    throw new ValidationError("Noma'lum biriktirma turi", { kind: ["Noma'lum tur"] });
  }

  const results = await searchAttachments(kind, searchParams.get('q') ?? '');

  return apiSuccess<{ results: AttachmentSearchResult[] }>(
    { results },
    { requestId, headers: { 'cache-control': 'no-store' } },
  );
});
