/**
 * Testlar uchun umumiy tayyorgarlik.
 *
 * Bu yerda test muhitiga zarur environment qiymatlari beriladi —
 * shunda `src/lib/env.ts` validatsiyasi testlarda ham muvaffaqiyatli o'tadi.
 *
 * Qiymatlar soxta (test uchun) — haqiqiy bazaga yoki Redis'ga ulanmaydi.
 * Bazani talab qiladigan testlar alohida yoziladi va ular integratsion
 * testlar deb ataladi.
 */
process.env.DATABASE_URL ??= 'postgresql://navix:navix@localhost:5432/navix_test?schema=public';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-kamida-o-ttiz-ikki-belgi';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-kamida-o-ttiz-ikki-belgi';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
process.env.NEXT_PUBLIC_APP_NAME ??= 'Navix';
process.env.LOG_LEVEL ??= 'silent';

/**
 * DOM matcher'lari (`toBeInTheDocument` va boshqalar) faqat brauzer muhitida
 * ma'noga ega. Node muhitida ularni yuklamaymiz — aks holda xatolik chiqadi.
 */
if (typeof window !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
}

// Faylni modul sifatida belgilaydi — yuqoridagi top-level `await` uchun zarur.
export {};
