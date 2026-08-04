/**
 * Ovqat suhbatining chegaralari.
 *
 * ── Nima uchun alohida fayl ───────────────────────────────────────────
 * Bu qiymatlar ham serverda (`assistant.food.ts`), ham validatsiyada
 * (`assistant.schemas.ts`) kerak. Agar ular `assistant.food.ts` da
 * qolsa, sxema fayli bilan birga butun Prisma mijozi ham yuklanardi —
 * testlar sekinlashadi va sxemani brauzerda ishlatib bo'lmaydi.
 */

/**
 * Yordamchi bir marta taklif qiladigan eng ko'p variant.
 *
 * To'rtta — telefon ekranida bir qarashda o'qiladigan chegara.
 * Undan ko'pi tanlashni osonlashtirmaydi, qiyinlashtiradi.
 */
export const MAX_DISH_OPTIONS = 4;
