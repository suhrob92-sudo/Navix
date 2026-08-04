import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Testlar sozlamasi.
 *
 * Standart muhit — `node`, chunki testlarning aksariyati server kodini
 * (xizmatlar, sxemalar, yordamchi funksiyalar) tekshiradi. Server kodi
 * brauzer muhitida ataylab ishlamaydi: `serverEnv()` `window` mavjud bo'lsa
 * xatolik beradi — bu maxfiy kalitlar brauzerga tushib qolmasligi uchun himoya.
 *
 * React komponentini sinash kerak bo'lsa, test faylining eng boshiga
 * quyidagi qatorni yozing:
 *
 *   // @vitest-environment jsdom
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/config/**', 'src/modules/**', 'src/components/**'],
      exclude: ['src/generated/**', '**/*.test.{ts,tsx}'],
    },
  },
});
