import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';

/**
 * GET /api/health — tizim salomatligini tekshirish.
 *
 * Nima uchun kerak: Docker, Kubernetes va monitoring tizimlari shu manzilga
 * muntazam murojaat qilib, ilova tirikligini bilib turadi. Agar baza yoki
 * Redis ishlamasa — bu yerda darhol ko'rinadi.
 *
 * Ilova o'zi ishlayotgan bo'lsa status 200 qaytadi; bog'liqliklardan biri
 * ishlamasa 503 qaytadi.
 */

// Bu endpoint har doim jonli tekshiruv qilishi kerak — kesh ishlatilmaydi.
export const dynamic = 'force-dynamic';

type DependencyState = 'ok' | 'error';

interface DependencyCheck {
  status: DependencyState;
  latencyMs: number;
  error?: string;
}

interface HealthPayload {
  status: 'healthy' | 'degraded';
  uptimeSeconds: number;
  dependencies: {
    database: DependencyCheck;
    redis: DependencyCheck;
  };
}

/** Bitta bog'liqlikni tekshiradi va javob vaqtini o'lchaydi. */
async function checkDependency(probe: () => Promise<unknown>): Promise<DependencyCheck> {
  const startedAt = performance.now();

  try {
    await probe();
    return { status: 'ok', latencyMs: Math.round(performance.now() - startedAt) };
  } catch (error) {
    return {
      status: 'error',
      latencyMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : "Noma'lum xatolik",
    };
  }
}

export const GET = withApiHandler(async (_request: NextRequest, { requestId }) => {
  const [database, redisCheck] = await Promise.all([
    checkDependency(() => prisma.$queryRaw`SELECT 1`),
    checkDependency(() => getRedis().ping()),
  ]);

  const isHealthy = database.status === 'ok' && redisCheck.status === 'ok';

  const payload: HealthPayload = {
    status: isHealthy ? 'healthy' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    dependencies: { database, redis: redisCheck },
  };

  return apiSuccess(payload, {
    requestId,
    status: isHealthy ? 200 : 503,
    headers: { 'cache-control': 'no-store' },
  });
});
