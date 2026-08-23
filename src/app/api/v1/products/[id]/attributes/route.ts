import type { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  ATTRIBUTE_NAME_MAX_LENGTH,
  ATTRIBUTE_VALUE_MAX_LENGTH,
  MAX_PRODUCT_ATTRIBUTES,
} from '@/config/product-detail';
import { Role } from '@/config/rbac';
import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { listAttributes, replaceAttributes } from '@/modules/product/product-attribute.service';

/**
 * Mahsulot xususiyatlari.
 *
 * ── Nima uchun faqat PUT, POST va DELETE emas ─────────────────────────
 * Sotuvchi xususiyatlarni jadval ko'rinishida, birdaniga tahrirlaydi.
 * Har bir qatorga alohida so'rov ketsa, yarmi bajarilib yarmi
 * bajarilmagan holat paydo bo'lardi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Mahsulot ID noto'g'ri") });

const bodySchema = z.object({
  attributes: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Nom bo\'sh').max(ATTRIBUTE_NAME_MAX_LENGTH, 'Nom juda uzun'),
        value: z
          .string()
          .trim()
          .min(1, "Qiymat bo'sh")
          .max(ATTRIBUTE_VALUE_MAX_LENGTH, 'Qiymat juda uzun'),
      }),
    )
    .max(MAX_PRODUCT_ATTRIBUTES, "Xususiyatlar soni chegaradan ko'p"),
});

type Params = { id: string };

export const GET = withApiHandler<Params>(async (_request: NextRequest, { requestId, params }) => {
  const { id } = paramsSchema.parse(await params);

  const attributes = await listAttributes(id);

  return apiSuccess({ attributes }, { requestId });
});

export const PUT = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await enforcePublicRateLimit('catalogImage', auth.userId, "Juda tez-tez o'zgartiryapsiz. Biroz kuting.");

  const input = await parseJsonBody(request, bodySchema);

  const attributes = await replaceAttributes(id, input.attributes, {
    userId: auth.userId,
    isAdmin: auth.roles.includes(Role.ADMIN) || auth.roles.includes(Role.SUPER_ADMIN),
  });

  return apiSuccess({ attributes }, { requestId });
});
