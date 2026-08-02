import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { openApiSpec } from '@/lib/openapi/spec';

/**
 * GET /api/openapi — API hujjatini JSON ko'rinishida qaytaradi.
 *
 * Bu manzilni Postman, Insomnia yoki Swagger UI'ga import qilib,
 * barcha endpointlarni ko'rish va sinash mumkin.
 */
export const GET = withApiHandler(async (_request: NextRequest, { requestId }) =>
  apiSuccess(openApiSpec, {
    requestId,
    headers: { 'cache-control': 'public, max-age=300' },
  }),
);
