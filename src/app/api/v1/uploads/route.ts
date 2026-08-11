import type { NextRequest } from 'next/server';

import { ValidationError } from '@/lib/api/errors';
import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { uploadFile } from '@/modules/upload/upload.service';
import { MAX_UPLOAD_BYTES, type UploadPurpose, type UploadResponse } from '@/modules/upload/upload.types';

/**
 * POST /api/v1/uploads — rasm yuklash.
 *
 * ── Nima uchun JSON EMAS, `multipart/form-data` ──────────────────────
 * Rasmni JSON ichida yuborish uchun uni base64 ga o'girish kerak
 * bo'lardi va hajmi ~33% oshardi. Mobil internetda bu sezilarli
 * farq. `multipart` esa faylni o'z holicha uzatadi.
 */
export const dynamic = 'force-dynamic';

const PURPOSES: readonly UploadPurpose[] = ['AVATAR', 'POST', 'CHAT', 'VOICE'];

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  const auth = await requireAuth(request);

  await enforcePublicRateLimit('upload', auth.userId, "Juda ko'p rasm yuklayapsiz. Biroz kuting.");

  const form = await request.formData();
  const file = form.get('file');
  const purpose = String(form.get('purpose') ?? 'POST') as UploadPurpose;

  if (!PURPOSES.includes(purpose)) {
    throw new ValidationError("Yuklash maqsadi noto'g'ri.");
  }

  if (!(file instanceof File)) {
    throw new ValidationError('Fayl tanlanmagan.');
  }

  /**
   * Hajm XOTIRAGA O'QIMASDAN OLDIN tekshiriladi.
   *
   * `file.size` — brauzer bergan qiymat, ya'ni unga to'liq ishonib
   * bo'lmaydi. Lekin u yolg'on bo'lsa ham zarar yo'q: haqiqiy
   * tekshiruv o'qilgandan keyin ham takrorlanadi. Bu yerdagi
   * tekshiruv esa oddiy holatda katta faylni bekorga xotiraga
   * yuklashdan saqlaydi.
   */
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ValidationError('Rasm juda katta.');
  }

  const data = Buffer.from(await file.arrayBuffer());

  const stored = await uploadFile(auth.userId, purpose, data);

  return apiSuccess<UploadResponse>(stored, { requestId, status: 201 });
});
