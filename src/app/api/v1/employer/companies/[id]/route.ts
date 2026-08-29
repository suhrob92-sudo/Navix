import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseJsonBody, withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { getRequestContext } from '@/lib/request-context';
import { Permission } from '@/config/rbac';
import { requirePermission } from '@/modules/auth/auth.guard';
import { updateCompanySchema } from '@/modules/employer/employer.schemas';
import { updateEmployerCompany } from '@/modules/employer/employer.service';

/**
 * PATCH /api/v1/employer/companies/[id] — kompaniya ma'lumoti.
 *
 * Nomzod e'londa kompaniya nomini, sohasini va tavsifini ko'radi.
 * Ilgari ularni faqat platforma o'zgartira olardi: ish beruvchi
 * kabinetida bunday ekran yo'q edi.
 */
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({ id: z.uuid("Kompaniya ID noto'g'ri") });

type Params = { id: string };

export const PATCH = withApiHandler<Params>(async (request: NextRequest, { requestId, params }) => {
  const auth = await requirePermission(request, Permission.EMPLOYER_DASHBOARD_ACCESS);
  const { id } = paramsSchema.parse(await params);
  const input = await parseJsonBody(request, updateCompanySchema);
  const context = getRequestContext(request);

  const company = await updateEmployerCompany(auth.userId, id, input, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return apiSuccess({ company }, { requestId });
});
