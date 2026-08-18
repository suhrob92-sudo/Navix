import { Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { MAX_COLLECTIONS } from '@/config/collections';

/**
 * Saqlanganlar TO'PLAMLARI.
 *
 * ── Nima uchun alohida modul ──────────────────────────────────────────
 * `feed.service.ts` allaqachon ikki mingdan ortiq qator: lenta,
 * yoqtirish, izoh, saqlash, mahkamlash. Unga yana beshta amal
 * qo'shilsa, faylni o'qib chiqish imkonsiz bo'lardi.
 *
 * To'plamlar mustaqil mavzu: ular postni O'ZGARTIRMAYDI va faqat
 * saqlash yozuviga tegadi.
 */

export interface CollectionView {
  id: string;
  name: string;
  /** Ichidagi postlar soni — tugmada ko'rsatiladi. */
  count: number;
  createdAt: string;
}

/**
 * Odamning to'plamlari — sonlari bilan.
 *
 * ── Nima uchun son KERAK ──────────────────────────────────────────────
 * Sonsiz ro'yxatda bo'sh to'plam ham to'la to'plam ham bir xil
 * ko'rinardi. Odam esa bo'sh papkani ochib, "ishlamayapti" deb
 * o'ylardi.
 *
 * ── Nima uchun `_count` ishlatiladi ───────────────────────────────────
 * Har bir to'plam uchun alohida `count` so'rovi yigirmata to'plamda
 * yigirmata so'rov degani (N+1 muammosi). Prisma esa buni BITTA
 * so'rovda hisoblaydi.
 */
export async function listCollections(ownerId: string): Promise<CollectionView[]> {
  const rows = await prisma.postCollection.findMany({
    where: { ownerId },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      createdAt: true,
      /*
        O'chirilgan post SANALMAYDI.

        Ro'yxatning o'zi ham o'chirilgan postni ko'rsatmaydi. Son
        esa uni sanasa, "5 ta" deb yozilgan to'plam ochilganda
        uchta post chiqardi — va odam ikkitasi qayerga ketganini
        tushunmasdi.
      */
      _count: { select: { saves: { where: { post: { deletedAt: null } } } } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    count: row._count.saves,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * Yangi to'plam yasaydi.
 *
 * ── Nima uchun son OLDIN tekshiriladi ─────────────────────────────────
 * Chegara faqat bazada bo'lsa, u umuman tekshirilmasdi: bazada
 * "yigirmatadan ko'p bo'lmasin" degan qoida yozib bo'lmaydi.
 */
export async function createCollection(ownerId: string, name: string): Promise<CollectionView> {
  const count = await prisma.postCollection.count({ where: { ownerId } });

  if (count >= MAX_COLLECTIONS) {
    throw new ConflictError(
      `${MAX_COLLECTIONS} tadan ko'p to'plam yasab bo'lmaydi. Keraksizini o'chiring.`,
    );
  }

  try {
    const row = await prisma.postCollection.create({
      data: { ownerId, name },
      select: { id: true, name: true, createdAt: true },
    });

    logger.info({ ownerId, collectionId: row.id }, "Yangi to'plam");

    return { id: row.id, name: row.name, count: 0, createdAt: row.createdAt.toISOString() };
  } catch (error) {
    /*
      Takroriy nom — bazadagi yagonalik sharti ushlaydi.

      Oldindan `findFirst` bilan tekshirish ishonchsiz: ikkita
      so'rov bir vaqtda kelsa, ikkalasi ham "yo'q ekan" deb
      xulosa qilib, ikkita bir xil to'plam yasardi.
    */
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError(`"${name}" nomli to'plam allaqachon bor.`);
    }

    throw error;
  }
}

/**
 * To'plam nomini o'zgartiradi.
 *
 * ── Nima uchun `updateMany` ───────────────────────────────────────────
 * `update` faqat ID bo'yicha ishlaydi va EGASINI tekshirmaydi.
 * Ya'ni begona ID yuborilsa, boshqa odamning to'plami nomi
 * o'zgarardi.
 *
 * `updateMany` esa shartga ega: ID VA egasi mos kelsagina yozadi.
 */
export async function renameCollection(
  ownerId: string,
  collectionId: string,
  name: string,
): Promise<CollectionView> {
  try {
    const result = await prisma.postCollection.updateMany({
      where: { id: collectionId, ownerId },
      data: { name },
    });

    if (result.count === 0) {
      throw new NotFoundError("To'plam");
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError(`"${name}" nomli to'plam allaqachon bor.`);
    }

    throw error;
  }

  const [updated] = await listCollections(ownerId).then((list) =>
    list.filter((item) => item.id === collectionId),
  );

  if (!updated) throw new NotFoundError("To'plam");

  return updated;
}

/**
 * To'plamni o'chiradi.
 *
 * ── Nima uchun POSTLAR o'chmaydi ──────────────────────────────────────
 * ── Bu ENG xavfli joy ────────────────────────────────────────────────
 * Odam "Retseptlar" papkasini o'chirganda u PAPKANI o'chirmoqchi,
 * ichidagi ellikta saqlangan postni emas. Bazada `Cascade` qo'yilsa,
 * bitta bosishda ellikta saqlangan post yo'q bo'lardi va ularni
 * qaytarishning imkoni bo'lmasdi.
 *
 * Shuning uchun `SetNull`: postlar "guruhlanmagan" holatga o'tadi
 * va ro'yxatda qolaveradi.
 */
export async function deleteCollection(
  ownerId: string,
  collectionId: string,
): Promise<{ movedCount: number }> {
  const owned = await prisma.postCollection.findFirst({
    where: { id: collectionId, ownerId },
    select: { id: true, _count: { select: { saves: true } } },
  });

  if (!owned) {
    throw new NotFoundError("To'plam");
  }

  await prisma.postCollection.delete({ where: { id: collectionId } });

  logger.info({ ownerId, collectionId, moved: owned._count.saves }, "To'plam o'chirildi");

  return { movedCount: owned._count.saves };
}

/**
 * Saqlangan postni to'plamga soladi (yoki chiqaradi).
 *
 * ── Nima uchun post SAQLANGAN bo'lishi shart ──────────────────────────
 * To'plam — saqlanganlarni tartiblash usuli. Saqlanmagan postni
 * to'plamga solish "yo'q narsani papkaga qo'yish" degani bo'lardi
 * va bunday yozuv bazada osilib qolardi.
 */
export async function setSaveCollection(
  userId: string,
  postId: string,
  collectionId: string | null,
): Promise<{ collectionId: string | null }> {
  /*
    To'plam EGASI tekshiriladi.

    Tekshirilmasa, begona to'plamning ID si yuborilib, o'z postimni
    boshqa odamning papkasiga ulab qo'yish mumkin bo'lardi. U odam
    esa o'z ro'yxatida buni ko'rmasdi ham (ro'yxat `userId` bo'yicha
    filtrlanadi), lekin son noto'g'ri chiqardi.
  */
  if (collectionId) {
    const collection = await prisma.postCollection.findFirst({
      where: { id: collectionId, ownerId: userId },
      select: { id: true },
    });

    if (!collection) {
      throw new NotFoundError("To'plam");
    }
  }

  const result = await prisma.postSave.updateMany({
    where: { postId, userId },
    data: { collectionId },
  });

  if (result.count === 0) {
    throw new NotFoundError('Saqlangan post');
  }

  return { collectionId };
}
