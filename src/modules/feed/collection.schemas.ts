import { z } from 'zod';

import {
  COLLECTION_FILTER_ALL,
  COLLECTION_FILTER_NONE,
  COLLECTION_NAME_MAX_LENGTH,
  cleanCollectionName,
  isValidCollectionName,
} from '@/config/collections';
import { feedCursorSchema } from '@/modules/feed/feed.schemas';

/**
 * To'plamlar uchun validatsiya.
 */

/**
 * To'plam nomi.
 *
 * ── Nima uchun `transform` DAN OLDIN tekshiriladi ─────────────────────
 * Tozalash bo'sh natija berishi mumkin: odam faqat bo'shliq yozsa,
 * `cleanCollectionName` bo'sh satr qaytaradi. Uni tekshirmasdan
 * saqlasak, ro'yxatda bosib bo'lmaydigan tugma paydo bo'lardi.
 *
 * Shuning uchun avval tekshiruv, keyin tozalash: xato matni ham
 * odam yozgan qiymatga tegishli bo'ladi.
 */
const collectionNameField = z
  .string()
  .max(COLLECTION_NAME_MAX_LENGTH * 3, "Nom juda uzun.")
  .refine(isValidCollectionName, `Nom bo'sh bo'lmasligi va ${COLLECTION_NAME_MAX_LENGTH} belgidan oshmasligi kerak.`)
  .transform(cleanCollectionName);

export const createCollectionSchema = z.object({
  name: collectionNameField,
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export const renameCollectionSchema = z.object({
  name: collectionNameField,
});

export type RenameCollectionInput = z.infer<typeof renameCollectionSchema>;

/**
 * Postni to'plamga solish.
 *
 * ── Nima uchun `null` ham QONUNIY qiymat ──────────────────────────────
 * Odam postni to'plamdan chiqarib, "guruhlanmagan" holatga qaytara
 * olishi kerak. Buning uchun alohida "o'chirish" so'rovi yasash
 * mumkin edi, lekin u aslida xuddi shu amal: to'plamni almashtirish.
 *
 * Bitta so'rov ikkalasini ham bajarsa, brauzerdagi mantiq ham
 * soddalashadi.
 */
export const setSaveCollectionSchema = z.object({
  collectionId: z.uuid("To'plam noto'g'ri tanlandi").nullable(),
});

export type SetSaveCollectionInput = z.infer<typeof setSaveCollectionSchema>;

/**
 * Saqlanganlar ro'yxati uchun so'rov.
 *
 * ── Nima uchun `NONE` alohida so'z ────────────────────────────────────
 * "Guruhlanmagan" holatni bo'sh qiymat bilan ko'rsatib bo'lmasdi:
 * bo'sh qiymat "filtr yo'q" degani va u BARCHA postlarni qaytaradi.
 *
 * Ikkisi bir xil ko'rinsa, "guruhlanmagan" tugmasi jimgina butun
 * ro'yxatni ochib yuborardi.
 */
export const savedQuerySchema = z.object({
  cursor: feedCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20),
  collection: z
    .union([z.literal(COLLECTION_FILTER_ALL), z.literal(COLLECTION_FILTER_NONE), z.uuid()])
    .default(COLLECTION_FILTER_ALL),
});

export type SavedQuery = z.infer<typeof savedQuerySchema>;
