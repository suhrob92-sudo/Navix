import { z } from 'zod';

import { GROUP_ADD_BATCH_MAX, GROUP_MAX_MEMBERS, GROUP_TITLE_MAX, GROUP_TITLE_MIN } from '@/config/group-chat';
import { isOwnImageUrl } from '@/modules/upload/upload.types';

/**
 * Guruh suhbatlari uchun validatsiya.
 */

/**
 * Guruh nomi.
 *
 * ── Nima uchun `trim` avval ───────────────────────────────────────────
 * Telefon klaviaturasi so'zdan keyin avtomatik probel qo'shadi. Uni
 * kesmasak, «Do'stlar » va «Do'stlar» boshqa-boshqa nom bo'lib
 * ko'rinardi va uzunlik ham noto'g'ri sanalardi.
 */
const groupTitleSchema = z
  .string()
  .trim()
  .min(GROUP_TITLE_MIN, 'Guruh nomi juda qisqa')
  .max(GROUP_TITLE_MAX, 'Guruh nomi juda uzun');

/**
 * Guruh rasmi.
 *
 * ── Nima uchun FAQAT o'z manzilimiz ───────────────────────────────────
 * Tashqi manzilga ruxsat berilsa, guruh rasmi sifatida boshqa saytdagi
 * fayl ko'rsatilishi mumkin bo'lardi. O'sha sayt esa rasmni ochgan har
 * bir a'zoning IP manzilini ko'rardi — ya'ni guruh orqali odamlarni
 * kuzatish yo'li ochilardi.
 */
const groupImageSchema = z.string().trim().max(500).refine(isOwnImageUrl, "Rasm manzili noto'g'ri");

const userIdSchema = z.uuid("Foydalanuvchi noto'g'ri");

/**
 * POST /api/v1/chat/groups — guruh yaratish.
 *
 * `memberIds` — yaratuvchidan TASHQARI qo'shiladiganlar. Yaratuvchi
 * ro'yxatda bo'lishi shart emas: u baribir ega bo'lib qo'shiladi.
 */
export const createGroupSchema = z.object({
  title: groupTitleSchema,
  imageUrl: groupImageSchema.nullish(),
  memberIds: z
    .array(userIdSchema)
    .min(1, 'Kamida bitta odamni tanlang')
    /**
     * Yaratuvchi ham hisobga olinadi, shuning uchun chegara bittaga
     * kam: `GROUP_MAX_MEMBERS` — bu guruhdagi UMUMIY son.
     */
    .max(GROUP_MAX_MEMBERS - 1, "Juda ko'p odam tanlandi"),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

/**
 * PATCH /api/v1/chat/groups/{id} — nom va rasmni o'zgartirish.
 *
 * ── Nima uchun `null` ruxsat etilgan ──────────────────────────────────
 * `imageUrl: null` — "rasmni olib tashla" degani. Maydonni umuman
 * yubormaslik esa "tegma" degani. Ikkalasini farqlash kerak, aks
 * holda rasmni o'chirishning imkoni bo'lmasdi.
 */
export const updateGroupSchema = z
  .object({
    title: groupTitleSchema.optional(),
    imageUrl: groupImageSchema.nullable().optional(),
  })
  .refine(
    (value) => value.title !== undefined || value.imageUrl !== undefined,
    "O'zgartirish uchun hech narsa yuborilmadi",
  );

export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

/** POST /api/v1/chat/groups/{id}/members — a'zo qo'shish. */
export const addMembersSchema = z.object({
  memberIds: z
    .array(userIdSchema)
    .min(1, 'Kamida bitta odamni tanlang')
    .max(GROUP_ADD_BATCH_MAX, "Juda ko'p odam tanlandi"),
});

export type AddMembersInput = z.infer<typeof addMembersSchema>;

/**
 * PATCH /api/v1/chat/groups/{id}/members/{userId} — darajani o'zgartirish.
 *
 * ── Nima uchun `role` emas, `isAdmin` ─────────────────────────────────
 * `role` bo'lganda so'rovga `OWNER` yuborish mumkin bo'lardi va
 * "egalikni o'zimga o'tkazish" yo'li ochilardi. Egalik esa faqat
 * bitta yo'l bilan o'tadi: ega guruhdan chiqqanda.
 */
export const setMemberAdminSchema = z.object({
  isAdmin: z.boolean(),
});

export type SetMemberAdminInput = z.infer<typeof setMemberAdminSchema>;
