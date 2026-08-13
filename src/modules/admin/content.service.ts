import { AuditAction, recordAudit } from '@/lib/audit';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import type { AdminContentQuery, SetContentVisibleInput } from '@/modules/admin/admin.schemas';

/**
 * Kontent moderatsiyasi — alohida mahsulot, taom, post yoki
 * vakansiyani yashirish.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Biznesni butunlay yopish bor edi, lekin bu ko'pincha HADDAN TASHQARI
 * choradir: do'konda mingta mahsulot bo'lib, ulardan bittasi qoidaga
 * zid bo'lsa, butun do'konni yopish qolgan 999 tasini ham va sotuvchi
 * daromadini ham to'xtatadi.
 *
 * Endi aniq bitta yozuvni yashirish mumkin.
 *
 * ── Nima uchun YASHIRISH, o'chirish emas ──────────────────────────────
 * Yozuv o'chirilsa, u haqidagi dalil ham yo'qoladi: shikoyat kelganda
 * "aynan nima yozilgan edi?" degan savolga javob qolmaydi. Buyurtma
 * qatorlari esa mahsulotga bog'langan — o'chirilsa, eski buyurtmalarda
 * nomi yo'qolardi.
 *
 * Shuning uchun yozuv joyida qoladi, faqat ko'rinmaydi.
 *
 * ── Nima uchun to'rtala tur BITTA joyda ───────────────────────────────
 * Xodim uchun ular bir xil ish: "shu narsani yashirish". Alohida
 * sahifalar yasalsa, to'rttasi ham alohida qidiruv va alohida
 * tugmaga ega bo'lardi.
 */

const MODULE = 'admin';

export const CONTENT_KINDS = ['PRODUCT', 'DISH', 'POST', 'VACANCY'] as const;

export type ContentKind = (typeof CONTENT_KINDS)[number];

export const CONTENT_KIND_LABELS: Record<ContentKind, string> = {
  PRODUCT: 'Mahsulot',
  DISH: 'Taom',
  POST: 'Post',
  VACANCY: 'Vakansiya',
};

export interface AdminContentItem {
  id: string;
  kind: ContentKind;
  /** Ekranda ko'rinadigan nom yoki matn boshi. */
  title: string;
  /** Kimga tegishli: do'kon, restoran, muallif yoki kompaniya. */
  owner: string;
  /** Hozir odamlarga ko'rinadimi. */
  isVisible: boolean;
  createdAt: string;
}

interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/** Uzun matnni ro'yxatga sig'adigan qilib qisqartiradi. */
function shorten(text: string, maxLength = 80): string {
  const clean = text.replace(/\s+/g, ' ').trim();

  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
}

/** Ism va familiyani birlashtiradi. */
function personName(user: { firstName: string | null; lastName: string | null }): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Nomsiz';
}

/**
 * To'rtala turdagi kontentni bitta ro'yxatga yig'adi.
 *
 * Har bir tur o'z jadvalida va "ko'rinadi" degani ularda har xil
 * yoziladi: mahsulotda `isActive`, taomda `isAvailable`, postda esa
 * `deletedAt` (yumshoq o'chirish). Bu farq shu yerda YO'QOLADI —
 * tashqariga bitta tushuncha chiqadi.
 */
export async function listAdminContent(query: AdminContentQuery): Promise<AdminContentItem[]> {
  const wanted = (kind: ContentKind): boolean => query.kind === 'ALL' || query.kind === kind;

  /** Har manbadan shuncha yozuv — ro'yxat cheksiz o'smasligi uchun. */
  const take = 100;

  const visibleOnly = query.status === 'VISIBLE';
  const hiddenOnly = query.status === 'HIDDEN';
  const search = query.search?.trim();

  const [products, dishes, posts, vacancies] = await Promise.all([
    wanted('PRODUCT')
      ? prisma.product.findMany({
          where: {
            ...(query.status === 'ALL' ? {} : { isActive: visibleOnly }),
            ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
          },
          select: { id: true, name: true, isActive: true, createdAt: true, shop: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take,
        })
      : Promise.resolve([]),
    wanted('DISH')
      ? prisma.menuItem.findMany({
          where: {
            ...(query.status === 'ALL' ? {} : { isAvailable: visibleOnly }),
            ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
          },
          select: {
            id: true,
            name: true,
            isAvailable: true,
            createdAt: true,
            restaurant: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take,
        })
      : Promise.resolve([]),
    wanted('POST')
      ? prisma.post.findMany({
          where: {
            ...(query.status === 'ALL' ? {} : hiddenOnly ? { NOT: { deletedAt: null } } : { deletedAt: null }),
            ...(search ? { body: { contains: search, mode: 'insensitive' as const } } : {}),
          },
          select: {
            id: true,
            body: true,
            deletedAt: true,
            createdAt: true,
            author: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take,
        })
      : Promise.resolve([]),
    wanted('VACANCY')
      ? prisma.vacancy.findMany({
          where: {
            ...(query.status === 'ALL' ? {} : { isActive: visibleOnly }),
            ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
          },
          select: {
            id: true,
            title: true,
            isActive: true,
            createdAt: true,
            company: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take,
        })
      : Promise.resolve([]),
  ]);

  return [
    ...products.map((row) => ({
      id: row.id,
      kind: 'PRODUCT' as const,
      title: row.name,
      owner: row.shop.name,
      isVisible: row.isActive,
      createdAt: row.createdAt.toISOString(),
    })),
    ...dishes.map((row) => ({
      id: row.id,
      kind: 'DISH' as const,
      title: row.name,
      owner: row.restaurant.name,
      isVisible: row.isAvailable,
      createdAt: row.createdAt.toISOString(),
    })),
    ...posts.map((row) => ({
      id: row.id,
      kind: 'POST' as const,
      // Postda nom yo'q — matnning boshi ishlatiladi.
      title: shorten(row.body) || '(faqat rasm)',
      owner: personName(row.author),
      isVisible: row.deletedAt === null,
      createdAt: row.createdAt.toISOString(),
    })),
    ...vacancies.map((row) => ({
      id: row.id,
      kind: 'VACANCY' as const,
      title: row.title,
      owner: row.company.name,
      isVisible: row.isActive,
      createdAt: row.createdAt.toISOString(),
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Yozuvning hozirgi holatini o'qiydi. */
async function findContent(kind: ContentKind, id: string): Promise<{ title: string; isVisible: boolean } | null> {
  if (kind === 'PRODUCT') {
    const row = await prisma.product.findUnique({ where: { id }, select: { name: true, isActive: true } });

    return row ? { title: row.name, isVisible: row.isActive } : null;
  }

  if (kind === 'DISH') {
    const row = await prisma.menuItem.findUnique({ where: { id }, select: { name: true, isAvailable: true } });

    return row ? { title: row.name, isVisible: row.isAvailable } : null;
  }

  if (kind === 'POST') {
    const row = await prisma.post.findUnique({ where: { id }, select: { body: true, deletedAt: true } });

    return row ? { title: shorten(row.body), isVisible: row.deletedAt === null } : null;
  }

  const row = await prisma.vacancy.findUnique({ where: { id }, select: { title: true, isActive: true } });

  return row ? { title: row.title, isVisible: row.isActive } : null;
}

/**
 * Kontentni yashiradi yoki qaytaradi.
 *
 * ── Nima uchun sabab MAJBURIY (yashirishda) ───────────────────────────
 * Sotuvchi "mahsulotim nega yo'qoldi?" deb so'raydi. Javob jurnalda
 * bo'lishi kerak, xodimning xotirasida emas.
 */
export async function setContentVisible(
  actorId: string,
  kind: ContentKind,
  contentId: string,
  input: SetContentVisibleInput,
  meta: OperationMeta = {},
): Promise<{ id: string; kind: ContentKind; title: string; isVisible: boolean }> {
  const current = await findContent(kind, contentId);

  if (!current) {
    throw new NotFoundError(CONTENT_KIND_LABELS[kind]);
  }

  if (current.isVisible === input.isVisible) {
    throw new ConflictError('Bu yozuv allaqachon shu holatda');
  }

  if (kind === 'PRODUCT') {
    await prisma.product.update({ where: { id: contentId }, data: { isActive: input.isVisible } });
  } else if (kind === 'DISH') {
    await prisma.menuItem.update({ where: { id: contentId }, data: { isAvailable: input.isVisible } });
  } else if (kind === 'POST') {
    /**
     * Postda alohida "ko'rinadi" ustuni yo'q — yumshoq o'chirish
     * ishlatiladi. Qaytarishda sana tozalanadi va post lentaga
     * o'z joyiga qaytadi: `createdAt` o'zgarmagani uchun u yangi
     * post bo'lib yuqoriga chiqib ketmaydi.
     */
    await prisma.post.update({
      where: { id: contentId },
      data: { deletedAt: input.isVisible ? null : new Date() },
    });
  } else {
    await prisma.vacancy.update({ where: { id: contentId }, data: { isActive: input.isVisible } });
  }

  await recordAudit({
    actorId,
    action: input.isVisible ? AuditAction.ADMIN_CONTENT_RESTORED : AuditAction.ADMIN_CONTENT_HIDDEN,
    resourceType: kind,
    resourceId: contentId,
    module: MODULE,
    /**
     * Post MATNI jurnalga yozilmaydi.
     *
     * Audit jurnali panelda ochiq ko'rinadi va postda odamlarning
     * shaxsiy gaplari bo'lishi mumkin. Yozuvning o'zi bazada
     * turibdi — kerak bo'lsa u yerdan ko'riladi.
     */
    metadata: { kind, reason: input.reason ?? null },
    ...meta,
  });

  logger.warn(
    { actorId, kind, contentId, isVisible: input.isVisible, reason: input.reason ?? null },
    input.isVisible ? 'Kontent qaytarildi' : 'Kontent yashirildi',
  );

  /**
   * Javobda faqat O'ZGARGAN narsa qaytadi.
   *
   * To'liq yozuvni qaytarish ham mumkin edi, lekin unda egasi va
   * yaratilgan sanani qayta so'rash kerak bo'lardi — ro'yxat esa
   * baribir yangilanadi. Bo'sh qiymatlar bilan to'ldirilgan "to'liq"
   * javob yolg'on ma'lumot bo'lardi.
   */
  return { id: contentId, kind, title: current.title, isVisible: input.isVisible };
}
