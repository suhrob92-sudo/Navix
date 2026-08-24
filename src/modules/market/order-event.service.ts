import type { MarketOrderStatus, Prisma } from '@/generated/prisma/client';

/**
 * Buyurtma holatining o'zgarishini YOZADI.
 *
 * ── Nima uchun alohida funksiya ───────────────────────────────────────
 * Buyurtma holati beshta joyda o'zgaradi: yaratilganda, xaridor
 * bekor qilganda, sotuvchi bosqichni surganda, sotuvchi rad
 * etganda va kuryer yetkazganini tasdiqlaganda.
 *
 * Yozuv qo'shish kodi beshta joyda takrorlansa, ertaga bittasi
 * unutilardi va buyurtma tarixida teshik paydo bo'lardi — eng
 * yomoni, buni hech kim sezmasdi.
 *
 * ── Nima uchun TRANZAKSIYA ichida ─────────────────────────────────────
 * Yozuv holat o'zgarishi bilan BIRGA saqlanishi kerak. Alohida
 * yozilsa, holat o'zgarib yozuv yozilmay qolishi mumkin edi
 * (yoki aksincha) — va tarix haqiqatga zid bo'lardi.
 *
 * Shuning uchun funksiya `tx` ni parametr sifatida oladi va o'zi
 * hech qachon `prisma` ni to'g'ridan-to'g'ri chaqirmaydi.
 */
export async function recordOrderEvent(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    status: MarketOrderStatus;
    /** Kim o'zgartirdi. Tizim o'zi qilgan bo'lsa berilmaydi. */
    actorId?: string | null;
    /** Qo'shimcha izoh — masalan bekor qilish sababi. */
    note?: string | null;
  },
): Promise<void> {
  await tx.marketOrderEvent.create({
    data: {
      orderId: input.orderId,
      status: input.status,
      actorId: input.actorId ?? null,
      /*
        Izoh uzun bo'lsa KESILADI.

        Bekor qilish sababi boshqa joyda ham tekshiriladi, lekin bu
        yozuv tarix uchun: uzun matn tufayli butun amaliyot
        yiqilishiga yo'l qo'yib bo'lmaydi.
      */
      note: input.note ? input.note.slice(0, 255) : null,
    },
  });
}
