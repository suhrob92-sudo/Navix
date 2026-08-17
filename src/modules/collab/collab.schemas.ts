import { z } from 'zod';

import { COLLAB_BOXES } from '@/modules/collab/collab.types';

/**
 * Hamkorlik takliflari uchun validatsiya.
 */

export const COLLAB_SUBJECT_MAX_LENGTH = 120;
export const COLLAB_MESSAGE_MAX_LENGTH = 1000;

/**
 * Taklif yuborish.
 *
 * ── Nima uchun sarlavha AJRATILGAN ────────────────────────────────────
 * Ijodkor kuniga o'nlab taklif olishi mumkin. Ro'yxatda har birining
 * to'liq matni turmaydi — faqat sarlavha ko'rinadi.
 *
 * Sarlavhasiz ro'yxat bir xil kulrang qatorlardan iborat bo'lardi va
 * ijodkor har birini ochib ko'rishga majbur bo'lardi.
 *
 * ── Nima uchun matn ham MAJBURIY ──────────────────────────────────────
 * "Hamkorlik qilamizmi?" degan bo'sh taklif javob berib bo'lmaydigan
 * savol. Ijodkorga qaror qabul qilish uchun shart kerak: nima,
 * qancha, qachon.
 */
export const createCollabOfferSchema = z.object({
  /** Ijodkorning foydalanuvchi nomi — ID emas: havola nom bilan ishlaydi. */
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Foydalanuvchi nomi noto'g'ri"),
  subject: z
    .string()
    .trim()
    .min(3, "Sarlavha juda qisqa")
    .max(COLLAB_SUBJECT_MAX_LENGTH, `Sarlavha ${COLLAB_SUBJECT_MAX_LENGTH} belgidan oshmasligi kerak`),
  message: z
    .string()
    .trim()
    .min(20, "Shartlarni batafsilroq yozing — kamida 20 ta belgi")
    .max(COLLAB_MESSAGE_MAX_LENGTH, `Matn ${COLLAB_MESSAGE_MAX_LENGTH} belgidan oshmasligi kerak`),
});

export type CreateCollabOfferInput = z.infer<typeof createCollabOfferSchema>;

/**
 * Taklifga javob.
 *
 * ── Nima uchun `WITHDRAWN` ham shu yerda ──────────────────────────────
 * Uchala amal ham bitta narsani o'zgartiradi: taklifning holatini.
 * Kim qaysi amalni qila olishini XIZMAT tekshiradi — qabul qilish
 * ijodkorning, qaytarib olish esa yuboruvchining ishi.
 *
 * Alohida manzillar yasalsa, uchta deyarli bir xil fayl paydo
 * bo'lardi.
 */
export const respondCollabOfferSchema = z.object({
  action: z.enum(['ACCEPT', 'DECLINE', 'WITHDRAW']),
});

export type RespondCollabOfferInput = z.infer<typeof respondCollabOfferSchema>;

export const collabQuerySchema = z.object({
  box: z.enum(COLLAB_BOXES).default('IN'),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export type CollabQuery = z.infer<typeof collabQuerySchema>;

/**
 * Ijodkorlar katalogi.
 *
 * Qidiruv IXTIYORIY: bo'sh bo'lsa, eng ko'p ko'rilgan ijodkorlar
 * qaytadi. Majburiy qilsak, katalog birinchi ochilganda bo'm-bo'sh
 * turardi va biznes "bu yerda hech kim yo'q" deb chiqib ketardi.
 */
export const creatorsQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export type CreatorsQuery = z.infer<typeof creatorsQuerySchema>;
