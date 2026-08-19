import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  LIVE_ENDED_VISIBLE_HOURS,
  MAX_SCHEDULED_LIVES,
  canChangeLiveStatus,
  type LiveStatus,
} from '@/config/live';
import type { CreateLiveInput } from '@/modules/live/live.schemas';
import { blockedUserIds } from '@/modules/moderation/moderation.service';
import { notifyUser } from '@/modules/notification/notification.service';
import type { PostAuthorView } from '@/modules/feed/feed.types';

/**
 * Jonli efir E'LONLARI.
 *
 * ── Nima uchun bu modul efirning O'ZINI o'ynatmaydi ───────────────────
 * Video oqimi alohida katta ish. Bu modul esa efirning eng qiyin
 * qismini yechadi: odamlarni AYNAN o'sha vaqtda ekran oldiga
 * yig'ish.
 *
 * Bloger "bugun soat 20:00 da efir" deb yozadi va uni hech kim
 * ko'rmaydi. Bu yerda esa e'lon ro'yxatda turadi, odam "eslatib
 * qo'y" tugmasini bosadi va efir boshlanganda xabar oladi.
 */

export interface LiveStreamView {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  status: LiveStatus;
  startedAt: string | null;
  endedAt: string | null;
  host: PostAuthorView;
  /** Nechta odam eslatma qo'ygan. */
  reminderCount: number;
  /** So'rov yuborgan odam eslatma qo'yganmi. */
  isReminded: boolean;
  /** Efir so'rov yuborgan odamning O'ZINIKIMI. */
  isMine: boolean;
}

const HOST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  profile: { select: { username: true, isVerified: true } },
} as const;

function toHostView(row: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  profile: { username: string; isVerified: boolean } | null;
}): PostAuthorView {
  const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ');

  return {
    userId: row.id,
    username: row.profile?.username ?? '',
    fullName: fullName || null,
    avatarUrl: row.avatarUrl,
    isVerified: row.profile?.isVerified ?? false,
  };
}

function streamSelect(viewerId: string) {
  return {
    id: true,
    title: true,
    description: true,
    scheduledAt: true,
    status: true,
    startedAt: true,
    endedAt: true,
    hostId: true,
    host: { select: HOST_SELECT },
    _count: { select: { reminders: true } },
    /** Faqat SO'RAGAN odamning eslatmasi — hammasi emas. */
    reminders: { where: { userId: viewerId }, select: { id: true }, take: 1 },
  } as const;
}

type StreamRow = {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: Date;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
  hostId: string;
  host: Parameters<typeof toHostView>[0];
  _count: { reminders: number };
  reminders: { id: string }[];
};

function toStreamView(row: StreamRow, viewerId: string): LiveStreamView {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    scheduledAt: row.scheduledAt.toISOString(),
    status: row.status as LiveStatus,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    host: toHostView(row.host),
    reminderCount: row._count.reminders,
    isReminded: row.reminders.length > 0,
    isMine: row.hostId === viewerId,
  };
}

/**
 * Yangi efir e'loni.
 *
 * ── Nima uchun REJALASHTIRILGANLAR sanaladi ───────────────────────────
 * Chegara faqat rejadagilarga qo'yiladi: tugagan efirlar yig'ilib
 * borsa ham, ular ro'yxatni band qilmaydi. Aks holda faol bloger
 * bir oydan keyin yangi efir e'lon qila olmasdi.
 */
export async function scheduleLive(hostId: string, input: CreateLiveInput): Promise<LiveStreamView> {
  const active = await prisma.liveStream.count({
    where: { hostId, status: 'SCHEDULED' },
  });

  if (active >= MAX_SCHEDULED_LIVES) {
    throw new ConflictError(
      `Bir vaqtda ${MAX_SCHEDULED_LIVES} tagacha efir rejalashtirish mumkin. Keraksizini bekor qiling.`,
    );
  }

  const row = await prisma.liveStream.create({
    data: {
      hostId,
      title: input.title,
      description: input.description && input.description.length > 0 ? input.description : null,
      scheduledAt: input.scheduledAt,
    },
    select: streamSelect(hostId),
  });

  logger.info({ hostId, streamId: row.id }, "Yangi efir e'loni");

  return toStreamView(row, hostId);
}

/**
 * Efirlar ro'yxati.
 *
 * ── Nima uchun TUGAGANLAR ham ko'rinadi ───────────────────────────────
 * Tugagan efir darhol yo'qolsa, kechikib kelgan odam "efir bo'ldimi
 * yoki bekor qilindimi?" degan savolga javob topa olmasdi.
 *
 * ── Nima uchun BEKOR QILINGAN umumiy ro'yxatda YO'Q ───────────────────
 * Bekor qilingan efir tomoshabin uchun ma'lumot emas: u bo'lmaydi.
 * Blogerning O'Z ro'yxatida esa ko'rinadi — u nimani bekor
 * qilganini bilishi kerak.
 */
export async function listLiveStreams(
  viewerId: string,
  options: { mine: boolean; limit: number },
): Promise<{ streams: LiveStreamView[] }> {
  const since = new Date(Date.now() - LIVE_ENDED_VISIBLE_HOURS * 60 * 60 * 1000);

  const hidden = options.mine ? [] : await blockedUserIds(viewerId);

  const rows = await prisma.liveStream.findMany({
    where: options.mine
      ? { hostId: viewerId }
      : {
          host: { deletedAt: null, status: { not: 'SUSPENDED' } },
          ...(hidden.length > 0 ? { hostId: { notIn: hidden } } : {}),
          OR: [
            { status: 'SCHEDULED' },
            { status: 'LIVE' },
            /* Tugagani — faqat yaqin vaqt ichidagisi. */
            { status: 'ENDED', endedAt: { gte: since } },
          ],
        },
    select: streamSelect(viewerId),
    /*
      Tartib: avval EFIRDAGI, keyin yaqin rejalar.

      Efirdagi efir eng muhim: unga hozir kirish mumkin. Uni vaqt
      bo'yicha tartibga qo'shsak, ertangi reja undan yuqorida
      turib qolardi.
    */
    orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }],
    take: options.limit,
  });

  /*
    Yakuniy tartib XOTIRADA.

    Bazadagi `status` — matn va uning alifbo tartibi kerakli
    tartibga mos kelmaydi (CANCELLED, ENDED, LIVE, SCHEDULED).
    Ro'yxat kichik (eng ko'pi 50 ta), shuning uchun uni xotirada
    tartiblash arzon.
  */
  const weight: Record<string, number> = { LIVE: 0, SCHEDULED: 1, ENDED: 2, CANCELLED: 3 };

  const sorted = rows.sort((a, b) => {
    const byStatus = (weight[a.status] ?? 9) - (weight[b.status] ?? 9);

    if (byStatus !== 0) return byStatus;

    return a.scheduledAt.getTime() - b.scheduledAt.getTime();
  });

  return { streams: sorted.map((row) => toStreamView(row, viewerId)) };
}

/**
 * Efir holatini o'zgartiradi.
 *
 * ── Nima uchun o'tish QOIDALARI bor ───────────────────────────────────
 * Holatni erkin o'zgartirishga ruxsat berilsa, tugagan efirni qayta
 * "efirda" qilib qo'yish mumkin bo'lardi — va eslatma qo'yganlarga
 * ikkinchi marta xabar ketardi.
 */
export async function setLiveStatus(
  streamId: string,
  hostId: string,
  status: LiveStatus,
): Promise<LiveStreamView> {
  const existing = await prisma.liveStream.findUnique({
    where: { id: streamId },
    select: { id: true, hostId: true, status: true, title: true },
  });

  if (!existing) {
    throw new NotFoundError('Efir');
  }

  if (existing.hostId !== hostId) {
    throw new ForbiddenError("Faqat o'z efiringizni boshqara olasiz.");
  }

  const from = existing.status as LiveStatus;

  if (from === status) {
    throw new ConflictError('Efir allaqachon shu holatda.');
  }

  if (!canChangeLiveStatus(from, status)) {
    throw new ConflictError("Efir holatini bunday o'zgartirib bo'lmaydi.");
  }

  /*
    Holat GUARD bilan yoziladi.

    Tugma ikki marta bosilsa (yoki ikkita quridmadan), ikkala
    so'rov ham yuqoridagi tekshiruvdan o'tib ketardi: ikkalasi
    ham eski holatni ko'radi. Natijada xabar ikki marta
    yuborilardi.
  */
  const result = await prisma.liveStream.updateMany({
    where: { id: streamId, status: from },
    data: {
      status,
      ...(status === 'LIVE' ? { startedAt: new Date() } : {}),
      ...(status === 'ENDED' ? { endedAt: new Date() } : {}),
    },
  });

  if (result.count === 0) {
    throw new ConflictError('Efir holati allaqachon o\'zgargan. Sahifani yangilang.');
  }

  if (status === 'LIVE') {
    void notifyReminders(streamId, hostId, existing.title);
  }

  logger.info({ hostId, streamId, from, to: status }, "Efir holati o'zgardi");

  const row = await prisma.liveStream.findUniqueOrThrow({
    where: { id: streamId },
    select: streamSelect(hostId),
  });

  return toStreamView(row, hostId);
}

/**
 * Eslatma qo'yganlarga xabar.
 *
 * ── Nima uchun javob KUTILMAYDI ───────────────────────────────────────
 * Efir boshlanishi xabar yuborilishini kutib turmasligi kerak:
 * bloger tugmani bosgan va ekranda darhol natija ko'rishi kerak.
 *
 * Yuzta odamga xabar yozish esa bir necha soniya olishi mumkin.
 */
async function notifyReminders(streamId: string, hostId: string, title: string): Promise<void> {
  try {
    const host = await prisma.user.findUnique({
      where: { id: hostId },
      select: { firstName: true, lastName: true, profile: { select: { username: true } } },
    });

    const hostName =
      [host?.firstName, host?.lastName].filter(Boolean).join(' ') ||
      host?.profile?.username ||
      'Navix';

    const reminders = await prisma.liveReminder.findMany({
      where: { streamId, userId: { not: hostId } },
      select: { userId: true },
    });

    for (const reminder of reminders) {
      await notifyUser(reminder.userId, 'live.started', { streamId, title, hostName });
    }

    logger.info({ streamId, count: reminders.length }, 'Efir haqida xabar yuborildi');
  } catch (error) {
    /*
      Xato YUTILADI.

      Efir allaqachon boshlangan. Xabar yetib bormasa ham efirning
      o'zi davom etadi va bu jarayonni to'xtatish mumkin emas.
    */
    logger.warn({ err: error, streamId }, "Efir haqida xabar yuborib bo'lmadi");
  }
}

/**
 * "Eslatib qo'y" / "Eslatmani olib tashlash".
 *
 * ── Nima uchun TUGAGAN efirga eslatma qo'yib bo'lmaydi ────────────────
 * Xabar hech qachon kelmasdi va odam uni bekorga kutardi.
 */
export async function setLiveReminder(
  streamId: string,
  userId: string,
  isOn: boolean,
): Promise<{ isReminded: boolean; reminderCount: number }> {
  const stream = await prisma.liveStream.findUnique({
    where: { id: streamId },
    select: { id: true, status: true, hostId: true },
  });

  if (!stream) {
    throw new NotFoundError('Efir');
  }

  if (isOn && stream.status !== 'SCHEDULED' && stream.status !== 'LIVE') {
    throw new ConflictError("Bu efir tugagan — eslatma qo'yib bo'lmaydi.");
  }

  if (isOn) {
    /*
      Takror — bazadagi yagonalik sharti ushlaydi.

      `createMany` + `skipDuplicates` bitta so'rovda ishlaydi va
      tugma ikki marta bosilganda xato bermaydi.
    */
    await prisma.liveReminder.createMany({
      data: [{ streamId, userId }],
      skipDuplicates: true,
    });
  } else {
    await prisma.liveReminder.deleteMany({ where: { streamId, userId } });
  }

  const reminderCount = await prisma.liveReminder.count({ where: { streamId } });

  return { isReminded: isOn, reminderCount };
}
