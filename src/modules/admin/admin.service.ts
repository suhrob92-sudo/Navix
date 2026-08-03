import {
  Prisma,
  RoleName,
  ServiceCategory,
  ServicePaymentStatus,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
  UserStatus,
} from '@/generated/prisma/client';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { startOfTashkentDay, startOfTashkentDaysAgo } from '@/lib/date';
import { logger } from '@/lib/logger';
import { somToTiyin, tiyinToNumber } from '@/lib/money';
import { normalizeUzPhone } from '@/lib/phone';
import { prisma } from '@/lib/prisma';
import { Role, type RoleValue } from '@/config/rbac';
import type { ServiceColor } from '@/config/modules';
import { AUDIT_GROUP_ACTIONS } from '@/modules/admin/audit-actions';
import type {
  AdminAuditQuery,
  AdminPaymentQuery,
  AdminProviderQuery,
  AdminTransactionQuery,
  AdminUserQuery,
  CreateProviderInput,
  UpdateProviderInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
} from '@/modules/admin/admin.schemas';
import type {
  AdminAuditItem,
  AdminPaymentItem,
  AdminProviderItem,
  AdminStats,
  AdminTopProvider,
  AdminTransactionItem,
  AdminUserDetail,
  AdminUserItem,
} from '@/modules/admin/admin.types';
import { revokeAllSessions } from '@/modules/auth/session.service';

/**
 * Admin panel xizmat qatlami.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Shu paytgacha yangi provayder qo'shish yoki tarifni o'zgartirish uchun
 * `src/config/service-providers.ts` faylini tahrirlab, qayta chiqarish
 * (deploy) kerak edi. Bu real ishda mumkin emas: "Beeline chegarani
 * o'zgartirdi" degan xabar kelganda dasturchi kutib o'tirmaydi.
 *
 * ── Asosiy qoida ──────────────────────────────────────────────────────
 * Admin BALANSNI QO'LDA O'ZGARTIRMAYDI. Bu yerda "balansga 50 000
 * qo'shish" kabi funksiya ataylab yo'q. Sababi: qo'lda o'zgartirilgan
 * balans buxgalteriya daftari (`wallet_transactions`) bilan mos kelmay
 * qoladi va hisobni tekshirib bo'lmaydi.
 *
 * Pulni qaytarish esa bor, lekin u shu yerda emas —
 * `payment.service.ts` dagi `refundPayment()` da. U aniq bir to'lovga
 * bog'langan va daftarga `REFUND` yozuvini qo'shadi, ya'ni hisob
 * baribir birlashadi.
 *
 * Shuning uchun bu modul faqat: KO'RADI va SOZLAYDI.
 */

const MODULE = 'admin';

/** Statistikada "eng faol" ro'yxatida nechta provayder ko'rsatiladi. */
const TOP_PROVIDER_LIMIT = 5;

// ── Ko'rsatkichlar ────────────────────────────────────────────────────

/**
 * Bosh sahifadagi raqamlar.
 *
 * Barcha so'rovlar `Promise.all` bilan PARALLEL yuboriladi — ketma-ket
 * bo'lsa sahifa 10 ta so'rov vaqtini kutardi. Baza uchun bular yengil
 * `count`/`aggregate` so'rovlari, indekslar allaqachon mavjud.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const todayStart = startOfTashkentDay();
  const weekStart = startOfTashkentDaysAgo(7);

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    newTodayUsers,
    newWeekUsers,
    walletTotals,
    topUpToday,
    totalPayments,
    todayPayments,
    weekPayments,
    failedToday,
    totalProviders,
    activeProviders,
    topProviders,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, status: UserStatus.ACTIVE } }),
    prisma.user.count({ where: { deletedAt: null, status: UserStatus.SUSPENDED } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: weekStart } } }),
    prisma.wallet.aggregate({ _sum: { balance: true }, _count: true }),
    prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: {
        type: TransactionType.TOP_UP,
        status: TransactionStatus.COMPLETED,
        createdAt: { gte: todayStart },
      },
    }),
    prisma.servicePayment.count(),
    prisma.servicePayment.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: ServicePaymentStatus.COMPLETED, createdAt: { gte: todayStart } },
    }),
    prisma.servicePayment.aggregate({
      _sum: { amount: true },
      where: { status: ServicePaymentStatus.COMPLETED, createdAt: { gte: weekStart } },
    }),
    prisma.servicePayment.count({
      where: { status: ServicePaymentStatus.FAILED, createdAt: { gte: todayStart } },
    }),
    prisma.serviceProvider.count(),
    prisma.serviceProvider.count({ where: { isActive: true } }),
    getTopProviders(weekStart),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      suspended: suspendedUsers,
      newToday: newTodayUsers,
      newThisWeek: newWeekUsers,
    },
    wallet: {
      totalBalance: toNumber(walletTotals._sum.balance),
      walletCount: walletTotals._count,
      topUpToday: toNumber(topUpToday._sum.amount),
    },
    payments: {
      totalCount: totalPayments,
      todayCount: todayPayments._count,
      todayVolume: toNumber(todayPayments._sum.amount),
      weekVolume: toNumber(weekPayments._sum.amount),
      failedToday,
    },
    providers: { total: totalProviders, active: activeProviders },
    topProviders,
  };
}

/**
 * Bir hafta ichida eng ko'p to'lov qabul qilgan xizmatlar.
 *
 * Ikki qadamda: avval guruhlab hisoblanadi, keyin nomlar olinadi.
 * `groupBy` faqat ID beradi — nomni ko'rsatish uchun ikkinchi so'rov
 * kerak, lekin u ko'pi bilan 5 ta yozuv oladi.
 */
async function getTopProviders(since: Date): Promise<AdminTopProvider[]> {
  const grouped = await prisma.servicePayment.groupBy({
    by: ['providerId'],
    where: { status: ServicePaymentStatus.COMPLETED, createdAt: { gte: since } },
    _count: { _all: true },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: TOP_PROVIDER_LIMIT,
  });

  if (grouped.length === 0) return [];

  const providers = await prisma.serviceProvider.findMany({
    where: { id: { in: grouped.map((row) => row.providerId) } },
    select: { id: true, name: true, code: true, category: true, color: true },
  });

  const providerById = new Map(providers.map((provider) => [provider.id, provider]));

  return grouped.flatMap((row) => {
    const provider = providerById.get(row.providerId);
    if (!provider) return [];

    return [
      {
        id: provider.id,
        name: provider.name,
        code: provider.code,
        category: provider.category,
        color: provider.color as ServiceColor,
        count: row._count._all,
        volume: toNumber(row._sum.amount),
      },
    ];
  });
}

/** `null` bo'lishi mumkin bo'lgan `BigInt` yig'indisini songa o'giradi. */
function toNumber(value: bigint | null): number {
  return value === null ? 0 : tiyinToNumber(value);
}

// ── Provayderlar ──────────────────────────────────────────────────────

const ADMIN_PROVIDER_SELECT = {
  id: true,
  code: true,
  name: true,
  category: true,
  description: true,
  accountLabel: true,
  accountHint: true,
  accountRegex: true,
  minAmount: true,
  maxAmount: true,
  color: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { payments: true } },
} as const;

type AdminProviderRow = Prisma.ServiceProviderGetPayload<{ select: typeof ADMIN_PROVIDER_SELECT }>;

function toAdminProviderItem(row: AdminProviderRow): AdminProviderItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    description: row.description,
    accountLabel: row.accountLabel,
    accountHint: row.accountHint,
    accountRegex: row.accountRegex,
    // Bazada tiyin, admin formasida so'm — o'girish shu yerda, bir joyda.
    minAmountSom: tiyinToNumber(row.minAmount) / 100,
    maxAmountSom: tiyinToNumber(row.maxAmount) / 100,
    color: row.color as ServiceColor,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    paymentCount: row._count.payments,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Barcha provayderlar — o'chirilganlari bilan birga.
 *
 * `listProviders()` (foydalanuvchi uchun) dan farqi shu: admin
 * o'chirilgan provayderni ham ko'rishi kerak, aks holda uni qaytadan
 * yoqa olmaydi.
 */
export async function listAdminProviders(query: AdminProviderQuery): Promise<AdminProviderItem[]> {
  const providers = await prisma.serviceProvider.findMany({
    where: {
      ...(query.category === 'ALL' ? {} : { category: query.category as ServiceCategory }),
      ...(query.status === 'ALL' ? {} : { isActive: query.status === 'ACTIVE' }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { code: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    select: ADMIN_PROVIDER_SELECT,
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  });

  return providers.map(toAdminProviderItem);
}

export async function getAdminProvider(providerId: string): Promise<AdminProviderItem> {
  const provider = await prisma.serviceProvider.findUnique({
    where: { id: providerId },
    select: ADMIN_PROVIDER_SELECT,
  });

  if (!provider) {
    throw new NotFoundError('Xizmat');
  }

  return toAdminProviderItem(provider);
}

interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/** Yangi provayder qo'shadi. */
export async function createAdminProvider(
  actorId: string,
  input: CreateProviderInput,
  meta: OperationMeta = {},
): Promise<AdminProviderItem> {
  try {
    const created = await prisma.serviceProvider.create({
      data: {
        code: input.code,
        name: input.name,
        category: input.category as ServiceCategory,
        description: input.description,
        accountLabel: input.accountLabel,
        accountHint: input.accountHint,
        accountRegex: input.accountRegex,
        minAmount: somToTiyin(input.minAmountSom),
        maxAmount: somToTiyin(input.maxAmountSom),
        color: input.color,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
      select: ADMIN_PROVIDER_SELECT,
    });

    await recordAudit({
      actorId,
      action: AuditAction.ADMIN_PROVIDER_CREATED,
      resourceType: 'ServiceProvider',
      resourceId: created.id,
      module: MODULE,
      metadata: { code: created.code, name: created.name },
      ...meta,
    });

    logger.info({ actorId, code: created.code }, "Yangi provayder qo'shildi");

    return toAdminProviderItem(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError(`"${input.code}" kodli xizmat allaqachon mavjud`);
    }

    throw error;
  }
}

/**
 * Provayderni tahrirlaydi.
 *
 * Nima uchun `code` o'zgarmaydi: u `npm run db:seed` uchun kalit.
 * Kod o'zgarsa, keyingi seed eski nomdagi provayderni QAYTA yaratadi
 * va ro'yxatda ikkita bir xil xizmat paydo bo'ladi.
 */
export async function updateAdminProvider(
  actorId: string,
  providerId: string,
  input: UpdateProviderInput,
  meta: OperationMeta = {},
): Promise<AdminProviderItem> {
  const existing = await prisma.serviceProvider.findUnique({
    where: { id: providerId },
    select: { id: true, code: true, minAmount: true, maxAmount: true },
  });

  if (!existing) {
    throw new NotFoundError('Xizmat');
  }

  // Chegaralarni YANGI va ESKI qiymatlar birlashtirilgandan keyin
  // solishtiramiz: admin faqat bittasini yuborgan bo'lishi mumkin.
  const minTiyin = input.minAmountSom === undefined ? existing.minAmount : somToTiyin(input.minAmountSom);
  const maxTiyin = input.maxAmountSom === undefined ? existing.maxAmount : somToTiyin(input.maxAmountSom);

  if (minTiyin > maxTiyin) {
    throw new ValidationError("Chegaralar noto'g'ri", {
      minAmountSom: ['Eng kichik summa eng kattasidan oshmasligi kerak'],
    });
  }

  const updated = await prisma.serviceProvider.update({
    where: { id: providerId },
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.category === undefined ? {} : { category: input.category as ServiceCategory }),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.accountLabel === undefined ? {} : { accountLabel: input.accountLabel }),
      ...(input.accountHint === undefined ? {} : { accountHint: input.accountHint }),
      ...(input.accountRegex === undefined ? {} : { accountRegex: input.accountRegex }),
      ...(input.minAmountSom === undefined ? {} : { minAmount: minTiyin }),
      ...(input.maxAmountSom === undefined ? {} : { maxAmount: maxTiyin }),
      ...(input.color === undefined ? {} : { color: input.color }),
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    },
    select: ADMIN_PROVIDER_SELECT,
  });

  await recordAudit({
    actorId,
    action: AuditAction.ADMIN_PROVIDER_UPDATED,
    resourceType: 'ServiceProvider',
    resourceId: updated.id,
    module: MODULE,
    // Audit jurnalida AYNAN NIMA o'zgargani ko'rinishi kerak.
    metadata: { code: updated.code, changed: Object.keys(input) },
    ...meta,
  });

  logger.info({ actorId, code: updated.code, changed: Object.keys(input) }, 'Provayder tahrirlandi');

  return toAdminProviderItem(updated);
}

// ── Foydalanuvchilar ──────────────────────────────────────────────────

const ADMIN_USER_SELECT = {
  id: true,
  phone: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
  phoneVerified: true,
  createdAt: true,
  wallet: { select: { balance: true } },
  roles: { select: { role: { select: { name: true } } } },
} as const;

type AdminUserRow = Prisma.UserGetPayload<{ select: typeof ADMIN_USER_SELECT }>;

function toAdminUserItem(row: AdminUserRow): AdminUserItem {
  return {
    id: row.id,
    phone: row.phone,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    avatarUrl: row.avatarUrl,
    status: row.status,
    roles: row.roles.map((assignment) => assignment.role.name),
    phoneVerified: row.phoneVerified?.toISOString() ?? null,
    walletBalance: row.wallet ? tiyinToNumber(row.wallet.balance) : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Foydalanuvchilar ro'yxati.
 *
 * Qidiruv telefon raqami, ism va email bo'yicha ishlaydi. Telefon
 * kiritilganda u avval E.164 ga keltiriladi: qo'llab-quvvatlash xodimi
 * "90 123 45 67" deb yozadi, bazada esa "+998901234567" turadi.
 */
export async function listAdminUsers(query: AdminUserQuery): Promise<{ users: AdminUserItem[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);
  const where = buildUserSearchWhere(query);

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: ADMIN_USER_SELECT,
      orderBy: { createdAt: query.order },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return { users: rows.map(toAdminUserItem), total };
}

function buildUserSearchWhere(query: AdminUserQuery): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(query.status === 'ALL' ? {} : { status: query.status as UserStatus }),
  };

  if (!query.search) return where;

  const normalizedPhone = normalizeUzPhone(query.search);
  const insensitive = { contains: query.search, mode: 'insensitive' as const };

  where.OR = [
    { firstName: insensitive },
    { lastName: insensitive },
    { email: insensitive },
    // Raqam to'liq bo'lmasa `normalizeUzPhone` `null` qaytaradi —
    // shunda oddiy qismiy qidiruv ishlaydi.
    normalizedPhone ? { phone: normalizedPhone } : { phone: { contains: query.search } },
  ];

  return where;
}

/** Bitta foydalanuvchi — batafsil ma'lumot bilan. */
export async function getAdminUser(userId: string): Promise<AdminUserDetail> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: ADMIN_USER_SELECT,
  });

  if (!user) {
    throw new NotFoundError('Foydalanuvchi');
  }

  const now = new Date();

  const [payments, activeSessions, lastSession] = await Promise.all([
    prisma.servicePayment.aggregate({
      _count: true,
      _sum: { amount: true },
      where: { userId, status: ServicePaymentStatus.COMPLETED },
    }),
    prisma.session.count({ where: { userId, revokedAt: null, expiresAt: { gt: now } } }),
    prisma.session.findFirst({
      where: { userId },
      select: { lastUsedAt: true },
      orderBy: { lastUsedAt: 'desc' },
    }),
  ]);

  return {
    ...toAdminUserItem(user),
    paymentCount: payments._count,
    paymentVolume: toNumber(payments._sum.amount),
    activeSessions,
    lastLoginAt: lastSession?.lastUsedAt.toISOString() ?? null,
  };
}

/** Admin darajasidagi rollar — ular bilan ishlashda qo'shimcha ehtiyot kerak. */
const PRIVILEGED_ROLES: readonly string[] = [Role.ADMIN, Role.SUPER_ADMIN];

/**
 * Foydalanuvchi holatini o'zgartiradi (bloklash / tiklash).
 *
 * ── Uchta muhim himoya ────────────────────────────────────────────────
 *
 * 1. O'ZINI bloklay olmaydi. Aks holda oxirgi admin tasodifan o'zini
 *    bloklab, tizimga hech kim kira olmay qolardi.
 *
 * 2. Boshqa ADMIN'ni faqat SUPER_ADMIN bloklay oladi. Aks holda ikki
 *    admin bir-birini bloklab, "urush" boshlashi mumkin.
 *
 * 3. Bloklangan foydalanuvchining BARCHA SESSIYALARI bekor qilinadi.
 *    Bu eng oson unutiladigan joy: rollar va kirish huquqi JWT ichida,
 *    JWT esa 15 daqiqa yashaydi. Sessiya bekor qilinmasa, bloklangan
 *    odam yana 15 daqiqa ishlayverardi — pul o'tkazishga yetadi.
 */
export async function updateAdminUserStatus(
  actor: { userId: string; roles: readonly RoleValue[] },
  userId: string,
  input: UpdateUserStatusInput,
  meta: OperationMeta = {},
): Promise<AdminUserDetail> {
  if (actor.userId === userId) {
    throw new ForbiddenError("O'z hisobingiz holatini o'zgartira olmaysiz");
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      status: true,
      roles: { select: { role: { select: { name: true } } } },
    },
  });

  if (!target) {
    throw new NotFoundError('Foydalanuvchi');
  }

  const targetIsPrivileged = target.roles.some((assignment) => PRIVILEGED_ROLES.includes(assignment.role.name));
  const actorIsSuperAdmin = actor.roles.includes(Role.SUPER_ADMIN);

  if (targetIsPrivileged && !actorIsSuperAdmin) {
    throw new ForbiddenError("Administrator hisobini faqat bosh administrator o'zgartira oladi");
  }

  if (target.status === input.status) {
    throw new ConflictError('Foydalanuvchi allaqachon shu holatda');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: input.status as UserStatus },
  });

  // Faol bo'lmagan holatga o'tkazilsa — kirish darhol to'xtashi kerak.
  let revokedSessions = 0;

  if (input.status !== 'ACTIVE') {
    revokedSessions = await revokeAllSessions(userId);
  }

  await recordAudit({
    actorId: actor.userId,
    action: AuditAction.ADMIN_USER_STATUS_CHANGED,
    resourceType: 'User',
    resourceId: userId,
    module: MODULE,
    metadata: {
      from: target.status,
      to: input.status,
      reason: input.reason ?? null,
      revokedSessions,
    },
    ...meta,
  });

  logger.warn(
    { actorId: actor.userId, userId, from: target.status, to: input.status, revokedSessions },
    "Foydalanuvchi holati o'zgartirildi",
  );

  return getAdminUser(userId);
}

// ── Rollar ────────────────────────────────────────────────────────────

/**
 * Foydalanuvchiga rol beradi yoki olib tashlaydi.
 *
 * ── Uchta himoya ──────────────────────────────────────────────────────
 *
 * 1. O'Z ROLLARINI o'zgartirib bo'lmaydi. Bosh administrator o'zidan
 *    SUPER_ADMIN ni olib tashlasa, uni qaytarib bera oladigan odam
 *    qolmasligi mumkin — tizim boshqaruvsiz qoladi.
 *
 * 2. OXIRGI bosh administratorni olib tashlab bo'lmaydi. Bu tekshiruv
 *    tranzaksiya ICHIDA, qulf ostida bajariladi: aks holda ikki xodim
 *    bir vaqtda ikkita oxirgi SUPER_ADMIN ni olib tashlashi mumkin edi.
 *
 * 3. Rol o'zgargach BARCHA SESSIYALAR bekor qilinadi. Rollar JWT ichida
 *    saqlanadi; sessiya bekor qilinmasa, olib tashlangan rol yana
 *    15 daqiqa ishlayverardi.
 */
export async function updateUserRole(
  actor: { userId: string; roles: readonly RoleValue[] },
  userId: string,
  input: UpdateUserRoleInput,
  meta: OperationMeta = {},
): Promise<AdminUserDetail> {
  if (actor.userId === userId) {
    throw new ForbiddenError("O'z rollaringizni o'zgartira olmaysiz");
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });

  if (!target) {
    throw new NotFoundError('Foydalanuvchi');
  }

  const role = await prisma.role.findUnique({
    where: { name: input.role as RoleName },
    select: { id: true, name: true },
  });

  if (!role) {
    throw new ConflictError(`"${input.role}" roli bazada yo'q. "npm run db:seed" bajaring.`);
  }

  const revokedSessions = await prisma.$transaction(async (tx) => {
    if (input.action === 'grant') {
      await tx.userRoleAssignment.upsert({
        where: { userId_roleId: { userId, roleId: role.id } },
        update: {},
        create: { userId, roleId: role.id },
      });
    } else {
      // Oxirgi bosh administratorni yo'qotib qo'ymaslik.
      if (role.name === Role.SUPER_ADMIN) {
        const remaining = await tx.userRoleAssignment.count({
          where: { roleId: role.id, userId: { not: userId }, user: { deletedAt: null } },
        });

        if (remaining === 0) {
          throw new ConflictError(
            'Bu oxirgi bosh administrator. Avval boshqa birovga shu rolni bering, keyin olib tashlang.',
          );
        }
      }

      await tx.userRoleAssignment.deleteMany({ where: { userId, roleId: role.id } });
    }

    // Rollar tokenda — eski token yangi holatni bilmaydi.
    const result = await tx.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return result.count;
  });

  await recordAudit({
    actorId: actor.userId,
    action: input.action === 'grant' ? AuditAction.ADMIN_ROLE_GRANTED : AuditAction.ADMIN_ROLE_REVOKED,
    resourceType: 'User',
    resourceId: userId,
    module: MODULE,
    metadata: { role: role.name, revokedSessions },
    ...meta,
  });

  logger.warn(
    { actorId: actor.userId, userId, role: role.name, action: input.action, revokedSessions },
    "Foydalanuvchi roli o'zgartirildi",
  );

  return getAdminUser(userId);
}

// ── To'lovlar ─────────────────────────────────────────────────────────

/**
 * Barcha foydalanuvchilarning xizmat to'lovlari.
 *
 * `listAdminTransactions` dan farqi: bu yerda SOHA ma'lumoti bor —
 * qaysi provayder, qaysi hisob raqami, chek raqami. Murojaat kelganda
 * xodim aynan shu ma'lumot bilan ishlaydi va shu yerdan pulni
 * qaytara oladi.
 */
export async function listAdminPayments(
  query: AdminPaymentQuery,
): Promise<{ payments: AdminPaymentItem[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  const where: Prisma.ServicePaymentWhereInput = {
    ...(query.status === 'ALL' ? {} : { status: query.status as ServicePaymentStatus }),
    ...(query.search ? buildPaymentSearch(query.search) : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.servicePayment.findMany({
      where,
      select: {
        id: true,
        accountNumber: true,
        amount: true,
        status: true,
        receiptNumber: true,
        createdAt: true,
        refundedAt: true,
        refundReason: true,
        provider: { select: { name: true } },
        user: { select: { id: true, phone: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: query.order },
      skip,
      take,
    }),
    prisma.servicePayment.count({ where }),
  ]);

  return {
    payments: rows.map((row) => ({
      id: row.id,
      accountNumber: row.accountNumber,
      amount: tiyinToNumber(row.amount),
      status: row.status,
      receiptNumber: row.receiptNumber,
      providerName: row.provider.name,
      createdAt: row.createdAt.toISOString(),
      refundedAt: row.refundedAt?.toISOString() ?? null,
      refundReason: row.refundReason,
      user: {
        id: row.user.id,
        phone: row.user.phone,
        fullName: [row.user.firstName, row.user.lastName].filter(Boolean).join(' ') || null,
      },
    })),
    total,
  };
}

/** To'lovni chek raqami, hisob raqami yoki mijoz telefoni bo'yicha qidirish. */
function buildPaymentSearch(search: string): Prisma.ServicePaymentWhereInput {
  const normalizedPhone = normalizeUzPhone(search);

  return {
    OR: [
      { receiptNumber: { contains: search, mode: 'insensitive' } },
      { accountNumber: { contains: search } },
      { user: normalizedPhone ? { phone: normalizedPhone } : { phone: { contains: search } } },
    ],
  };
}

// ── Audit jurnali ─────────────────────────────────────────────────────

/**
 * "Kim, qachon, nima qildi" jurnali.
 *
 * Nima uchun kerak: nizo chiqqanda ("men bu to'lovni qilmaganman",
 * "tarifni kim o'zgartirdi?") yagona ishonchli manba shu jurnal.
 *
 * Yozuvlar HECH QACHON o'chirilmaydi va tahrirlanmaydi — shuning uchun
 * bu yerda faqat o'qish funksiyasi bor.
 */
export async function listAuditLogs(
  query: AdminAuditQuery,
): Promise<{ entries: AdminAuditItem[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  const where: Prisma.AuditLogWhereInput = {
    ...(query.action
      ? { action: query.action }
      : query.group === 'ALL'
        ? {}
        : { action: { in: [...AUDIT_GROUP_ACTIONS[query.group]] } }),
    ...(query.search ? buildAuditSearch(query.search) : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        module: true,
        ipAddress: true,
        metadata: true,
        createdAt: true,
        actor: { select: { id: true, phone: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: query.order },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    entries: rows.map((row) => ({
      id: row.id,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      module: row.module,
      ipAddress: row.ipAddress,
      metadata: toPlainMetadata(row.metadata),
      createdAt: row.createdAt.toISOString(),
      actor: row.actor
        ? {
            id: row.actor.id,
            phone: row.actor.phone,
            fullName: [row.actor.firstName, row.actor.lastName].filter(Boolean).join(' ') || null,
          }
        : null,
    })),
    total,
  };
}

/**
 * `Json` ustunini xavfsiz obyektga aylantiradi.
 *
 * Bazadagi qiymat massiv, son yoki matn ham bo'lishi mumkin — interfeys
 * esa faqat obyektni kutadi. Mos kelmasa `null` qaytaramiz: jurnal
 * sahifasi bitta g'alati yozuv tufayli yiqilmasligi kerak.
 */
function toPlainMetadata(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

/** Jurnalni bajaruvchi telefoni yoki obyekt ID'si bo'yicha qidirish. */
function buildAuditSearch(search: string): Prisma.AuditLogWhereInput {
  const normalizedPhone = normalizeUzPhone(search);

  return {
    OR: [
      { resourceId: search },
      { actor: normalizedPhone ? { phone: normalizedPhone } : { phone: { contains: search } } },
    ],
  };
}

// ── Tranzaksiyalar ────────────────────────────────────────────────────

/**
 * Barcha foydalanuvchilarning hamyon amallari.
 *
 * Nima uchun kerak: "pulim yechilib ketdi" degan murojaat kelganda
 * qo'llab-quvvatlash xodimi bazaga kirmasdan tekshira olishi kerak.
 *
 * Bu yerda FAQAT O'QISH bor — tranzaksiyani tahrirlash yoki o'chirish
 * funksiyasi ataylab yozilmagan. Buxgalteriya daftari o'zgarmas
 * (immutable) bo'lishi shart.
 */
export async function listAdminTransactions(
  query: AdminTransactionQuery,
): Promise<{ transactions: AdminTransactionItem[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  const where: Prisma.WalletTransactionWhereInput = {
    ...(query.type === 'ALL' ? {} : { type: query.type as TransactionType }),
    ...(query.direction === 'ALL' ? {} : { direction: query.direction as TransactionDirection }),
    ...(query.status === 'ALL' ? {} : { status: query.status as TransactionStatus }),
    ...(query.search ? buildTransactionSearch(query.search) : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        direction: true,
        status: true,
        amount: true,
        balanceAfter: true,
        description: true,
        sourceModule: true,
        createdAt: true,
        wallet: {
          select: {
            user: { select: { id: true, phone: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: query.order },
      skip,
      take,
    }),
    prisma.walletTransaction.count({ where }),
  ]);

  return {
    transactions: rows.map((row) => {
      const user = row.wallet.user;
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;

      return {
        id: row.id,
        type: row.type,
        direction: row.direction,
        status: row.status,
        amount: tiyinToNumber(row.amount),
        balanceAfter: tiyinToNumber(row.balanceAfter),
        description: row.description,
        sourceModule: row.sourceModule,
        createdAt: row.createdAt.toISOString(),
        user: { id: user.id, phone: user.phone, fullName },
      };
    }),
    total,
  };
}

/** Tranzaksiyalarni foydalanuvchi telefoni yoki izoh bo'yicha qidirish. */
function buildTransactionSearch(search: string): Prisma.WalletTransactionWhereInput {
  const normalizedPhone = normalizeUzPhone(search);

  return {
    OR: [
      { description: { contains: search, mode: 'insensitive' } },
      {
        wallet: {
          user: normalizedPhone ? { phone: normalizedPhone } : { phone: { contains: search } },
        },
      },
    ],
  };
}
