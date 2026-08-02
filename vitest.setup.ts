import '@testing-library/jest-dom/vitest';

/**
 * Testlar uchun umumiy tayyorgarlik.
 *
 * Bu yerda test muhitiga zarur environment qiymatlari beriladi —
 * shunda `src/lib/env.ts` validatsiyasi testlarda ham muvaffaqiyatli o'tadi.
 */
process.env.DATABASE_URL ??= 'postgresql://navix:navix@localhost:5432/navix_test?schema=public';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-kamida-o-ttiz-ikki-belgi';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-kamida-o-ttiz-ikki-belgi';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
process.env.NEXT_PUBLIC_APP_NAME ??= 'Navix';
