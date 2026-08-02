import { NotFoundError } from '@/lib/api/errors';
import { buildPagination, type PaginationMeta } from '@/lib/api/response';
import { toPrismaPagination, type PaginationQuery } from '@/lib/api/pagination';
import { prisma } from '@/lib/prisma';

/**
 * Bildirishnomalar bilan ishlash.
 *
 * Barcha modullar (taksi, ovqat, to'lov) shu xizmat orqali foydalanuvchiga
 * xabar yuboradi. Shu sababli bildirishnomalar bitta ro'yxatda to'planadi.
 */

const NOTIFICATION_SELECT = {
  id: true,
  channel: true,
  status: true,
  title: true,
  body: true,
  actionUrl: true,
  sourceModule: true,
  payload: true,
  createdAt: true,
  readAt: true,
} as const;

export interface NotificationPayload {
  id: string;
  channel: string;
  status: string;
  title: string;
  body: string;
  actionUrl: string | null;
  sourceModule: string;
  payload: unknown;
  createdAt: Date;
  readAt: Date | null;
}

export interface NotificationListResult {
  notifications: NotificationPayload[];
  unreadCount: number;
  pagination: PaginationMeta;
}

/** Foydalanuvchining bildirishnomalari (sahifalab). */
export async function listNotifications(
  userId: string,
  query: PaginationQuery & { unreadOnly?: boolean },
): Promise<NotificationListResult> {
  const where = {
    userId,
    // Ilova ichidagi bildirishnomalar ko'rsatiladi; SMS va push alohida kanallar.
    channel: 'IN_APP' as const,
    ...(query.unreadOnly ? { readAt: null } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: NOTIFICATION_SELECT,
      orderBy: { createdAt: query.order },
      ...toPrismaPagination(query),
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, channel: 'IN_APP', readAt: null } }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: buildPagination(query.page, query.pageSize, total),
  };
}

/** O'qilmagan bildirishnomalar soni (yuqori paneldagi belgi uchun). */
export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, channel: 'IN_APP', readAt: null } });
}

/** Bitta bildirishnomani o'qilgan deb belgilaydi. */
export async function markAsRead(userId: string, notificationId: string): Promise<NotificationPayload> {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true, readAt: true },
  });

  if (!existing) {
    throw new NotFoundError('Bildirishnoma');
  }

  // Allaqachon o'qilgan bo'lsa vaqtni o'zgartirmaymiz.
  if (existing.readAt) {
    return prisma.notification.findUniqueOrThrow({
      where: { id: notificationId },
      select: NOTIFICATION_SELECT,
    });
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { status: 'READ', readAt: new Date() },
    select: NOTIFICATION_SELECT,
  });
}

/** Barcha bildirishnomalarni o'qilgan deb belgilaydi. */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, channel: 'IN_APP', readAt: null },
    data: { status: 'READ', readAt: new Date() },
  });

  return result.count;
}

export interface CreateNotificationInput {
  userId: string;
  title: string;
  body: string;
  sourceModule: string;
  actionUrl?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Yangi bildirishnoma yaratadi.
 *
 * Bu funksiyani boshqa modullar chaqiradi. Masalan taksi moduli
 * "Haydovchi keldi" xabarini shu orqali yuboradi.
 */
export async function createNotification(input: CreateNotificationInput): Promise<NotificationPayload> {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      channel: 'IN_APP',
      status: 'SENT',
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl ?? null,
      sourceModule: input.sourceModule,
      payload: input.payload ? (input.payload as object) : undefined,
      sentAt: new Date(),
    },
    select: NOTIFICATION_SELECT,
  });
}
