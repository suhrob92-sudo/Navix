import type { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  MAX_OPTIONS,
  MAX_VALUES_PER_OPTION,
  MAX_VARIANTS,
  OPTION_NAME_MAX_LENGTH,
  OPTION_VALUE_MAX_LENGTH,
} from '@/config/product-variant';
import { Role } from '@/config/rbac';
import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/modules/auth/auth.guard';
import { getVariants, replaceVariants } from '@/modules/product/product-variant.service';
import type { VariantsView } from '@/modules/product/product-variant.types';

/**
 * Mahsulot variantlari.
 *
 * ── Nima uchun faqat PUT ──────────────────────────────────────────────
 * Variantlar bir-biriga bog'liq: yangi rang qo'shilsa, u har bir
 * xotira bilan birikma hosil qiladi.
 *
 * Alohida amallarda yarim yig'ilgan holat paydo bo'lardi — masalan
 * rang qo'shilib, uning variantlari hali yaratilmagan.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Mahsulot ID noto'g'ri") });

/** So'mdagi narx chegaralari — `seller.schemas.ts` dagi kabi. */
const MIN_PRICE_SOM = 1_000;
const MAX_PRICE_SOM = 1_000_000_000;
const MAX_STOCK = 100_000;

const bodySchema = z.object({
  options: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Nom bo'sh").max(OPTION_NAME_MAX_LENGTH, 'Nom juda uzun'),
        values: z
          .array(z.string().trim().min(1).max(OPTION_VALUE_MAX_LENGTH, 'Qiymat juda uzun'))
          .min(1, 'Kamida bitta qiymat')
          .max(MAX_VALUES_PER_OPTION, "Qiymatlar soni chegaradan ko'p"),
      }),
    )
    .max(MAX_OPTIONS, "Tanlovlar soni chegaradan ko'p"),

  variants: z
    .array(
      z.object({
        values: z.array(z.string().trim().min(1)).min(1).max(MAX_OPTIONS),
        priceSom: z
          .number({ message: 'Narxni kiriting' })
          .int("Narx butun so'mda bo'lishi kerak")
          .min(MIN_PRICE_SOM, `Eng kami ${MIN_PRICE_SOM} so'm`)
          .max(MAX_PRICE_SOM, 'Narx juda katta'),
        oldPriceSom: z.number().int().min(MIN_PRICE_SOM).max(MAX_PRICE_SOM).nullable(),
        stock: z
          .number({ message: 'Zaxirani kiriting' })
          .int("Son butun bo'lishi kerak")
          .min(0, "Manfiy bo'lishi mumkin emas")
          .max(MAX_STOCK, `Ko'pi bilan ${MAX_STOCK} ta`),
        isActive: z.boolean(),
      }),
    )
    .max(MAX_VARIANTS, "Variantlar soni chegaradan ko'p"),
});

type Params = { id: string };

export const GET = withApiHandler<Params>(async (_request: NextRequest, { requestId, params }) => {
  const { id } = paramsSchema.parse(await params);

  const variants = await getVariants(id);

  return apiSuccess<VariantsView>(variants, { requestId });
});

export const PUT = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requireAuth(request);
  const { id } = paramsSchema.parse(await params);

  await enforcePublicRateLimit('catalogImage', auth.userId, "Juda tez-tez o'zgartiryapsiz. Biroz kuting.");

  const input = await parseJsonBody(request, bodySchema);

  const variants = await replaceVariants(id, input, {
    userId: auth.userId,
    isAdmin: auth.roles.includes(Role.ADMIN) || auth.roles.includes(Role.SUPER_ADMIN),
  });

  return apiSuccess<VariantsView>(variants, { requestId });
});
