import { z } from 'zod';

import { MAX_DISH_OPTIONS } from '@/modules/assistant/assistant.food.constants';
import { MAX_ITEM_QUANTITY } from '@/modules/food/food.schemas';

/**
 * AI Yordamchi so'rovlari uchun validatsiya.
 *
 * ── Nima uchun bu fayl alohida ────────────────────────────────────────
 * Sxema avval `route.ts` ichida yozilgan edi. Muammo shundaki, Zod
 * ro'yxatda yo'q maydonlarni JIMGINA olib tashlaydi: `AssistantSlots`
 * ga yangi maydon qo'shilganda suhbat "esini yo'qotardi" va buning
 * sababi hech qayerda ko'rinmasdi.
 *
 * Endi sxema alohida faylda va unga TEST bor
 * (`assistant.schemas.test.ts`): u `AssistantSlots` ning HAR BIR
 * maydoni sxemadan o'tishini tekshiradi. Maydon qo'shilib, sxemaga
 * yozilmasa — test yiqiladi.
 */

/**
 * Ro'yxatdan tanlash uchun saqlanadigan variant.
 *
 * Narx bu yerda faqat KO'RSATISH uchun keladi. Mijoz uni tahrirlashi
 * mumkin, lekin buyurtma yaratilganda `createFoodOrder()` narxni
 * bazadan qaytadan o'qiydi — shuning uchun bu xavf tug'dirmaydi.
 */
export const foodOptionSchema = z.object({
  menuItemId: z.uuid(),
  name: z.string().max(120),
  restaurantName: z.string().max(120),
  priceSom: z.number().int().nonnegative().max(100_000_000),
});

/** Marketplace varianti — mahsulot nomi uzunroq bo'lishi mumkin. */
export const marketOptionSchema = z.object({
  productId: z.uuid(),
  name: z.string().max(160),
  shopName: z.string().max(120),
  priceSom: z.number().int().nonnegative().max(1_000_000_000),
});

/**
 * Suhbat holati — mijozda saqlanadi va har so'rovda qaytib keladi.
 *
 * Xavfsizlik: holatda FAQAT tanlov ma'lumoti bo'ladi. Pul harakati
 * har doim serverda qaytadan tekshiriladi, shuning uchun holatni
 * tahrirlab chegaralarni chetlab o'tib bo'lmaydi.
 */
export const assistantSlotsSchema = z.object({
  // Pul buyruqlari
  amountSom: z.number().int().positive().max(100_000_000).optional(),
  providerId: z.uuid().optional(),
  providerName: z.string().max(120).optional(),
  accountNumber: z.string().max(60).optional(),
  phone: z.string().max(20).optional(),
  recipientName: z.string().max(120).optional(),
  // Ovqat suhbati
  foodOptions: z.array(foodOptionSchema).max(MAX_DISH_OPTIONS).optional(),
  menuItemId: z.uuid().optional(),
  quantity: z.number().int().positive().max(MAX_ITEM_QUANTITY).optional(),
  // Marketplace suhbati
  productOptions: z.array(marketOptionSchema).max(MAX_DISH_OPTIONS).optional(),
  productId: z.uuid().optional(),
});

export const assistantStateSchema = z.object({
  intent: z.string().max(40).optional(),
  slots: assistantSlotsSchema.default({}),
});

/** POST /api/v1/assistant */
export const assistantMessageSchema = z.object({
  message: z.string().trim().min(1, "Xabar bo'sh").max(500, 'Xabar juda uzun'),
  state: assistantStateSchema.optional(),
});

export type AssistantMessageInput = z.infer<typeof assistantMessageSchema>;
