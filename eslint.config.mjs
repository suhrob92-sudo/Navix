import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * Kod sifati qoidalari.
 *
 * Asos: Next.js tavsiya qilgan qoidalar + TypeScript qat'iyligi.
 * Qo'shimcha qoidalar loyihaning "Clean Code" talablarini majburlaydi.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    // Prisma avtomatik generatsiya qiladi — tekshirish shart emas.
    'src/generated/**',
  ]),

  {
    rules: {
      // Ishlatilmayotgan o'zgaruvchilar xato hisoblanadi.
      // Ataylab ishlatilmaydiganlarini "_" bilan boshlash mumkin.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // `any` turi taqiqlanadi — turlar aniq bo'lishi kerak.
      '@typescript-eslint/no-explicit-any': 'error',
      // Production kodida console qoldirmaslik uchun ogohlantirish.
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // `==` o'rniga har doim `===`.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      // O'zgarmaydigan o'zgaruvchilar `const` bo'lishi shart.
      'prefer-const': 'error',
    },
  },

  {
    // Testlar va skriptlarda console ishlatishga ruxsat.
    files: ['**/*.test.{ts,tsx}', 'prisma/**/*.ts', 'vitest.setup.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]);

export default eslintConfig;
