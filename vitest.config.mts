import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Testlar sozlamasi.
 *
 * `resolve.tsconfigPaths` — testlarda ham `@/lib/...` kabi qisqa importlar ishlashi uchun.
 * `jsdom` — React komponentlarini brauzersiz sinash imkonini beradi.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/config/**', 'src/components/**'],
      exclude: ['src/generated/**', '**/*.test.{ts,tsx}'],
    },
  },
});
