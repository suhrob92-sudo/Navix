import { AuditAction, recordAudit } from '@/lib/audit';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import type { AdminBusinessQuery, SetBusinessActiveInput } from '@/modules/admin/admin.schemas';

/**
 * Do'kon, restoran va mehmonxonalarni administrator tomonidan
 * vaqtincha yopish.
 *
 * ── Nima uchun O'CHIRISH emas, YOPISH ─────────────────────────────────
 * Do'konni bazadan o'chirish mumkin emas: unga bog'langan buyurtmalar,
 * to'lovlar va sharhlar bor. O'chirilsa, mijozning "mening
 * buyurtmalarim" ro'yxati buzilardi va buxgalteriya yozuvlari
 * yo'qolardi — bu qonun talabiga ham zid.
 *
 * Shuning uchun yopish `isActive` bayrog'i orqali bajariladi. Bu
 * bayroq ALLAQACHON barcha ommaviy so'rovlarda tekshiriladi (ro'yxat,
 * qidiruv, buyurtma berish), ya'ni yopilgan biznes:
 *
 *  · ro'yxatlarda ko'rinmaydi;
 *  · qidiruvda topilmaydi;
 *  · unga yangi buyurtma berib bo'lmaydi.
 *
 * Eski buyurtmalar esa o'z yo'lida davom etadi — mijoz to'lagan
 * ovqatini baribir olishi kerak.
 *
 * ── Nima uchun uchala tur BITTA joyda ─────────────────────────────────
 * Xodim uchun ular bir xil ish: "shu biznesni yopish". Uch xil sahifa
 * yasalsa, uchtasi ham alohida qidiruv, alohida filtr va alohida
 * tugmaga ega bo'lardi — va vaqt o'tib bir-biridan farq qila
 * boshlardi.
 */

const MODULE = 'admin';

/** Boshqarish mumkin bo'lgan biznes turlari. */
export const BUSINESS_KINDS = ['SHOP', 'RESTAURANT', 'HOTEL'] as const;

export type BusinessKind = (typeof BUSINESS_KINDS)[number];

export const BUSINESS_KIND_LABELS: Record<BusinessKind, string> = {
  SHOP: "Do'kon",
  RESTAURANT: 'Restoran',
  HOTEL: 'Mehmonxona',
};

export interface AdminBusinessItem {
  id: string;
  kind: BusinessKind;
  name: string;
  slug: string;
  city: string | null;
  isActive: boolean;
  /** Egasi biriktirilganmi — egasiz biznesni hech kim boshqara olmaydi. */
  ownerName: string | null;
  ownerPhone: string | null;
  /** Nechta faol buyurtma bor — yopishdan oldin bilish kerak. */
  activeOrders: number;
}

interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/** Ega ismini yig'adi. */
function ownerName(owner: { firstName: string | null; lastName: string | null } | null): string | null {
  if (!owner) return null;

  return [owner.firstName, owner.lastName].filter(Boolean).join(' ') || null;
}

/**
 * Uchala turdagi biznesni bitta ro'yxatga yig'adi.
 *
 * Har bir tur o'z jadvalida va ular bir-biriga o'xshamaydi
 * (restoranda oshxona turi, mehmonxonada yulduz). Umumiy `UNION`
 * so'rovi o'rniga har biri o'z so'rovini beradi va natija umumiy
 * ko'rinishga o'giriladi — buyurtmalar ro'yxatidagi bilan bir xil
 * yondashuv.
 */
export async function listAdminBusinesses(query: AdminBusinessQuery): Promise<AdminBusinessItem[]> {
  const wanted = (kind: BusinessKind): boolean => query.kind === 'ALL' || query.kind === kind;

  const activeFilter =
    query.status === 'ALL' ? {} : { isActive: query.status === 'ACTIVE' };

  const search = query.search
    ? { name: { contains: query.search, mode: 'insensitive' as const } }
    : {};

  const [shops, restaurants, hotels] = await Promise.all([
    wanted('SHOP')
      ? prisma.shop.findMany({
          where: { ...activeFilter, ...search },
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            owner: { select: { firstName: true, lastName: true, phone: true } },
            _count: { select: { orders: { where: { status: { in: ['PENDING', 'CONFIRMED', 'PACKING', 'SHIPPED'] } } } } },
          },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
    wanted('RESTAURANT')
      ? prisma.restaurant.findMany({
          where: { ...activeFilter, ...search },
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            owner: { select: { firstName: true, lastName: true, phone: true } },
            _count: {
              select: { orders: { where: { status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING'] } } } },
            },
          },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
    wanted('HOTEL')
      ? prisma.hotel.findMany({
          where: { ...activeFilter, ...search },
          select: { id: true, name: true, slug: true, city: true, isActive: true },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  return [
    ...shops.map((row) => ({
      id: row.id,
      kind: 'SHOP' as const,
      name: row.name,
      slug: row.slug,
      city: null,
      isActive: row.isActive,
      ownerName: ownerName(row.owner),
      ownerPhone: row.owner?.phone ?? null,
      activeOrders: row._count.orders,
    })),
    ...restaurants.map((row) => ({
      id: row.id,
      kind: 'RESTAURANT' as const,
      name: row.name,
      slug: row.slug,
      city: null,
      isActive: row.isActive,
      ownerName: ownerName(row.owner),
      ownerPhone: row.owner?.phone ?? null,
      activeOrders: row._count.orders,
    })),
    ...hotels.map((row) => ({
      id: row.id,
      kind: 'HOTEL' as const,
      name: row.name,
      slug: row.slug,
      city: row.city,
      isActive: row.isActive,
      ownerName: null,
      ownerPhone: null,
      /**
       * Mehmonxonada "faol buyurtma" bandlov orqali hisoblanadi va u
       * XONAGA bog'langan, mehmonxonaga emas. Har bir mehmonxona
       * uchun alohida sanoq ro'yxatni sekinlashtirardi, foydasi esa
       * kam: bandlov bekor qilinmaydi, u shunchaki o'z kunida
       * tugaydi.
       */
      activeOrders: 0,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Biznesni yopadi yoki qayta ochadi.
 *
 * ── Nima uchun faol buyurtma TO'SIQ emas ──────────────────────────────
 * Do'kon aldov bilan shug'ullanayotgani aniqlansa, uni DARHOL yopish
 * kerak — "avval buyurtmalarni tugating" deb kutib turish yangi
 * qurbonlar degani.
 *
 * Yopilgandan keyin ham eski buyurtmalar yo'lida davom etadi: sotuvchi
 * kabineti ochiq qoladi va u tovarni yetkazib beradi. Yopilish faqat
 * YANGI buyurtmani to'xtatadi.
 */
export async function setBusinessActive(
  actorId: string,
  kind: BusinessKind,
  businessId: string,
  input: SetBusinessActiveInput,
  meta: OperationMeta = {},
): Promise<AdminBusinessItem> {
  const current = await findBusiness(kind, businessId);

  if (!current) {
    throw new NotFoundError(BUSINESS_KIND_LABELS[kind]);
  }

  if (current.isActive === input.isActive) {
    throw new ConflictError('Bu biznes allaqachon shu holatda');
  }

  const data = { isActive: input.isActive };

  if (kind === 'SHOP') await prisma.shop.update({ where: { id: businessId }, data });
  else if (kind === 'RESTAURANT') await prisma.restaurant.update({ where: { id: businessId }, data });
  else await prisma.hotel.update({ where: { id: businessId }, data });

  await recordAudit({
    actorId,
    action: input.isActive ? AuditAction.ADMIN_BUSINESS_ENABLED : AuditAction.ADMIN_BUSINESS_DISABLED,
    resourceType: kind === 'SHOP' ? 'Shop' : kind === 'RESTAURANT' ? 'Restaurant' : 'Hotel',
    resourceId: businessId,
    module: MODULE,
    metadata: { name: current.name, kind, reason: input.reason ?? null },
    ...meta,
  });

  logger.warn(
    { actorId, kind, businessId, name: current.name, isActive: input.isActive, reason: input.reason ?? null },
    input.isActive ? 'Biznes qayta ochildi' : 'Biznes yopildi',
  );

  const list = await listAdminBusinesses({ kind, status: 'ALL', search: current.name });

  return list.find((item) => item.id === businessId)!;
}

/** Biznesni turi bo'yicha topadi. */
async function findBusiness(
  kind: BusinessKind,
  id: string,
): Promise<{ name: string; isActive: boolean } | null> {
  const select = { name: true, isActive: true };

  if (kind === 'SHOP') return prisma.shop.findUnique({ where: { id }, select });
  if (kind === 'RESTAURANT') return prisma.restaurant.findUnique({ where: { id }, select });

  return prisma.hotel.findUnique({ where: { id }, select });
}
