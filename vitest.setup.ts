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
/*
 * Haqiqiy `DATABASE_URL` — FAQAT integratsion sinovlar uchun.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Sinovlarning aksariyati bazaga umuman tegmaydi va ularga soxta
 * qiymat yetarli. Lekin pul harakati (hamyon, to'lov) HAQIQIY bazada
 * tekshirilishi shart: u yerda tekshirilayotgan narsaning o'zi —
 * qator qulfi (`FOR UPDATE`) va yagona indeks — bazada yashaydi.
 * Soxta baza yozsak, Postgres'ni qaytadan yozgan bo'lardik.
 *
 * ── Nima uchun faqat SHU o'zgaruvchi ──────────────────────────────────
 * `.env` ni butunlay yuklasak, boshqa sinovlar ham kutilmaganda
 * haqiqiy kalitlar bilan ishlab ketardi. Shuning uchun bitta qiymat
 * olinadi, qolgani soxta holicha qoladi.
 *
 * Fayl bo'lmasa — hech narsa o'zgarmaydi va baza talab qiladigan
 * sinovlar o'zini o'tkazib yuboradi.
 */
if (!process.env.DATABASE_URL) {
  try {
    const { readFileSync } = await import('node:fs');
    const line = readFileSync('.env', 'utf8')
      .split('\n')
      .find((row) => row.startsWith('DATABASE_URL='));

    if (line) {
      process.env.DATABASE_URL = line
        .slice('DATABASE_URL='.length)
        .trim()
        .replace(/^["']|["']$/g, '');
    }
  } catch {
    /* `.env` yo'q — soxta qiymat ishlatiladi. */
  }
}

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
