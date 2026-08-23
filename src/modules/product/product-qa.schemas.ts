import { z } from 'zod';

import { ANSWER_MAX_LENGTH, QUESTION_MAX_LENGTH, QUESTIONS_PAGE_SIZE } from '@/config/product-detail';

/**
 * Savol-javob — validatsiya.
 */

/**
 * Savol matni — MAJBURIY.
 *
 * ── Bahodan farqi ─────────────────────────────────────────────────────
 * Bahoda matn ixtiyoriy edi: yulduzning o'zi ham qiymatga ega.
 * Bo'sh savol esa hech qanday ma'noga ega emas.
 */
export const askQuestionSchema = z.object({
  body: z
    .string()
    .trim()
    .min(5, 'Savol juda qisqa')
    .max(QUESTION_MAX_LENGTH, 'Savol juda uzun'),
});

export type AskQuestionInput = z.infer<typeof askQuestionSchema>;

export const answerQuestionSchema = z.object({
  body: z
    .string()
    .trim()
    .min(2, 'Javob juda qisqa')
    .max(ANSWER_MAX_LENGTH, 'Javob juda uzun'),
});

export type AnswerQuestionInput = z.infer<typeof answerQuestionSchema>;

/** GET — savollar ro'yxati. */
export const questionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(QUESTIONS_PAGE_SIZE),
});

export type QuestionListQuery = z.infer<typeof questionListQuerySchema>;
