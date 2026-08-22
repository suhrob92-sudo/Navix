import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';
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
  /**
   * Hozir ishlab turgan versiya (git commit).
   *
   * ── Nima uchun kerak ────────────────────────────────────────────────
   * "Men tuzatdim, lekin baribir eski xato chiqyapti" — eng ko'p
   * uchraydigan chalkashlik. Sababi odatda oddiy: yangi versiya hali
   * chiqmagan yoki brauzerda eski sahifa qolgan.
   *
   * Bu maydon shu savolga bir soniyada javob beradi.
   *
   * Sir emas: kod ochiq va commit belgisi bilan hech narsa qilib
   * bo'lmaydi.
   */
  version: string;
  environment: string;
  dependencies: {
    database: DependencyCheck;
    redis: DependencyCheck;
  };
}

/** Vercel har deploy'da commit belgisini shu o'zgaruvchiga yozadi. */
function resolveVersion(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA;

  return sha ? sha.slice(0, 7) : 'local';
}

/**
 * Bitta bog'liqlikni tekshiradi va javob vaqtini o'lchaydi.
 *
 * ── Nima uchun xato matni PRODUCTION'da yashiriladi ───────────────────
 * Bu manzil ochiq: uni istalgan odam ochib ko'ra oladi (monitoring
 * tizimlari token bilan murojaat qila olmaydi).
 *
 * Baza ishlamay qolganda esa xato matni ichida ichki manzil turadi:
 * "Can't reach database server at ep-xxxx.eu-central-1.aws.neon.tech".
 * Ya'ni saytimiz eng zaif paytida biz o'z bazamiz manzilini butun
 * dunyoga aytib qo'yardik.
 *
 * Sabab log'da qoladi — u yerda to'liq matn bor va u faqat bizga
 * ko'rinadi.
 */
async function checkDependency(name: string, probe: () => Promise<unknown>): Promise<DependencyCheck> {
  const startedAt = performance.now();

  try {
    await probe();
    return { status: 'ok', latencyMs: Math.round(performance.now() - startedAt) };
  } catch (error) {
    logger.error({ err: error, dependency: name }, 'Salomatlik tekshiruvi muvaffaqiyatsiz');

    return {
      status: 'error',
      latencyMs: Math.round(performance.now() - startedAt),
      error: isProduction() ? "Ulanib bo'lmadi" : error instanceof Error ? error.message : "Noma'lum xatolik",
    };
  }
}

export const GET = withApiHandler(async (_request: NextRequest, { requestId }) => {
  const [database, redisCheck] = await Promise.all([
    checkDependency('database', () => prisma.$queryRaw`SELECT 1`),
    checkDependency('redis', () => getRedis().ping()),
  ]);

  const isHealthy = database.status === 'ok' && redisCheck.status === 'ok';

  const payload: HealthPayload = {
    status: isHealthy ? 'healthy' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    version: resolveVersion(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    dependencies: { database, redis: redisCheck },
  };

  return apiSuccess(payload, {
    requestId,
    status: isHealthy ? 200 : 503,
    headers: { 'cache-control': 'no-store' },
  });
});
