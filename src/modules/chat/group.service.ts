import { ConversationKind, GroupRole, Prisma, SystemMessageKind } from '@/generated/prisma/client';
import {
  canDo,
  canRemoveMember,
  GROUP_MAX_MEMBERS,
  systemMessageText,
  type GroupRoleName,
  type SystemMessageKindName,
} from '@/config/group-chat';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { clearGroupTyping } from '@/lib/presence';
import { prisma } from '@/lib/prisma';
import { checkCanMessage } from '@/modules/moderation/moderation.service';
import type { AddMembersInput, CreateGroupInput, UpdateGroupInput } from '@/modules/chat/group.schemas';
import type { AddMembersResponse, GroupInfoView, GroupMemberView } from '@/modules/chat/group.types';

/**
 * Guruh suhbatlari.
 *
 * ── Modulning ENG NOZIK joyi: EGASIZ guruh ────────────────────────────
 * Guruh egasi chiqib ketsa yoki hisobini o'chirsa, guruh boshqaruvsiz
 * qolishi mumkin: nomni o'zgartira oladigan ham, a'zo chiqara oladigan
 * ham qolmaydi. Bunday guruh "muzlab" qoladi — ichida yozish mumkin,
 * lekin hech narsani tuzatib bo'lmaydi.
 *
 * Shuning uchun egalik HECH QACHON bo'sh qolmaydi: ega chiqqanda u
 * avtomatik keyingi odamga o'tadi, oxirgi a'zo chiqqanda esa guruh
 * butunlay o'chiriladi.
 */

/** Ism yig'ish uchun kerakli maydonlar. */
const NAME_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  profile: { select: { username: true, isVerified: true } },
} as const;

type NameRow = Prisma.UserGetPayload<{ select: typeof NAME_SELECT }>;

/**
 * Ekranda ko'rsatiladigan ism.
 *
 * Ism bo'lmasa `@nom`, u ham bo'lmasa umumiy so'z ishlatiladi:
 * hodisa yozuvida bo'sh joy qolmasligi kerak.
 */
function displayName(user: NameRow | null | undefined): string {
  if (!user) return 'Foydalanuvchi';

  const full = [user.firstName, user.lastName].filter(Boolean).join(' ');

  if (full) return full;

  return user.profile?.username ? `@${user.profile.username}` : 'Foydalanuvchi';
}

/**
 * Guruhni va MENING darajamni oladi.
 *
 * ── Nima uchun "topilmadi", "ruxsat yo'q" emas ────────────────────────
 * A'zo bo'lmagan odamga "ruxsat yo'q" deyish guruh MAVJUDLIGINI aytib
 * qo'yardi: begona odam ID'larni birma-bir sinab, qaysilari haqiqiy
 * guruh ekanini aniqlay olardi.
 */
async function requireGroup(
  conversationId: string,
  userId: string,
): Promise<{ title: string; imageUrl: string | null; createdAt: Date; myRole: GroupRoleName }> {
  const row = await prisma.conversation.findFirst({
    where: { id: conversationId, kind: ConversationKind.GROUP },
    select: {
      title: true,
      imageUrl: true,
      createdAt: true,
      members: { where: { userId }, select: { role: true } },
    },
  });

  if (!row || row.members.length === 0) {
    throw new NotFoundError('Guruh');
  }

  return {
    title: row.title ?? 'Guruh',
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    myRole: row.members[0].role as GroupRoleName,
  };
}

/** Amalni bajarishga huquq bor-yo'qligini tekshiradi. */
function requirePermission(role: GroupRoleName, action: Parameters<typeof canDo>[1]): void {
  if (!canDo(role, action)) {
    throw new ForbiddenError("Buning uchun ruxsat yo'q");
  }
}

/**
 * Hodisa xabarini yozadi.
 *
 * Guruhning `lastMessageAt` ustuni ham yangilanadi: hodisa suhbatlar
 * ro'yxatida oxirgi qator bo'lib ko'rinishi kerak, aks holda yangi
 * yaratilgan guruh ro'yxatning tubida paydo bo'lardi.
 */
async function writeSystemMessage(
  tx: Prisma.TransactionClient,
  conversationId: string,
  actorId: string,
  kind: SystemMessageKindName,
  actor: string,
  target?: string,
): Promise<void> {
  const now = new Date();

  await tx.message.create({
    data: {
      conversationId,
      senderId: actorId,
      body: systemMessageText(kind, actor, target),
      systemKind: SystemMessageKind[kind],
      /**
       * Hodisa DARHOL "yetkazilgan" hisoblanadi.
       *
       * U hech kimga yuborilmaydi va javob kutmaydi — "yuborildi"
       * holatida osilib turishi mantiqsiz bo'lardi.
       */
      deliveredAt: now,
      createdAt: now,
    },
    select: { id: true },
  });

  await tx.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: now },
    select: { id: true },
  });
}

/**
 * Hodisa xabarini TRANZAKSIYASIZ yozadi.
 *
 * ── Nima uchun ikkinchi variant kerak ─────────────────────────────────
 * Yuqoridagi `writeSystemMessage` tranzaksiya ichida ishlaydi: u
 * a'zolar bilan bir vaqtda o'zgaradigan amallar uchun.
 *
 * Havola bilan bog'liq amallar esa bitta qatorni o'zgartiradi va
 * ular uchun tranzaksiya ochish ortiqcha bo'lardi. Bu funksiya
 * o'sha holat uchun — mantiq esa bir xil, takrorlanmagan.
 */
export async function writeGroupEvent(
  conversationId: string,
  actorId: string,
  kind: SystemMessageKindName,
  actor: string,
  target?: string,
): Promise<void> {
  await prisma.$transaction((tx) => writeSystemMessage(tx, conversationId, actorId, kind, actor, target));
}

/** Guruhning to'liq ma'lumotini yig'adi. */
export async function getGroupInfo(conversationId: string, viewerId: string): Promise<GroupInfoView> {
  const group = await requireGroup(conversationId, viewerId);

  const members = await prisma.conversationMember.findMany({
    where: { conversationId },
    select: { userId: true, role: true, joinedAt: true, user: { select: NAME_SELECT } },
    /**
     * Tartib: avval EGA, keyin administratorlar, keyin qolganlar —
     * har bir guruh ichida qo'shilgan vaqti bo'yicha.
     *
     * Alifbo bo'yicha tartiblansa, guruhni kim boshqarayotganini
     * ko'rish uchun butun ro'yxatni varaqlash kerak bo'lardi.
     */
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  });

  const memberViews: GroupMemberView[] = members.map((member) => {
    const role = member.role as GroupRoleName;
    const isMe = member.userId === viewerId;

    return {
      userId: member.userId,
      name: displayName(member.user),
      handle: member.user.profile?.username ?? '',
      avatarUrl: member.user.avatarUrl,
      isVerified: member.user.profile?.isVerified ?? false,
      role,
      joinedAt: member.joinedAt.toISOString(),
      isMe,
      // O'zimni chiqara olmayman: buning uchun "Guruhdan chiqish" bor.
      canRemove: !isMe && canRemoveMember(group.myRole, role),
      /**
       * Administratorlikni faqat EGA o'zgartiradi va faqat oddiy
       * a'zo bilan administrator o'rtasida.
       */
      canToggleAdmin: !isMe && canDo(group.myRole, 'MANAGE_ADMIN') && role !== 'OWNER',
    };
  });

  return {
    conversationId,
    title: group.title,
    imageUrl: group.imageUrl,
    createdAt: group.createdAt.toISOString(),
    memberCount: members.length,
    myRole: group.myRole,
    canEditInfo: canDo(group.myRole, 'EDIT_INFO'),
    canAddMembers: canDo(group.myRole, 'ADD_MEMBER') && members.length < GROUP_MAX_MEMBERS,
    freeSlots: Math.max(0, GROUP_MAX_MEMBERS - members.length),
    members: memberViews,
  };
}

/**
 * Qo'shish mumkin bo'lgan odamlarni ajratadi.
 *
 * Rad etish sabablari uchtadan biri: hisob yo'q (yoki o'chirilgan),
 * allaqachon guruhda, yoki u meni bloklagan. Uchalasida ham xato
 * qaytarilmaydi — shunchaki o'tkazib yuboriladi.
 *
 * ── Nima uchun bloklagan odam qo'shilmaydi ────────────────────────────
 * Aks holda blok ma'nosini yo'qotardi: bloklangan odam guruh yasab,
 * o'zidan qochgan odamni ichiga tortib, o'sha yerda yozishda davom
 * eta olardi.
 */
async function resolveAddableUsers(
  conversationId: string,
  actorId: string,
  memberIds: string[],
): Promise<NameRow[]> {
  // Bir xil ID ikki marta yuborilsa, bir marta hisoblanadi.
  const unique = [...new Set(memberIds)].filter((id) => id !== actorId);

  if (unique.length === 0) return [];

  const [candidates, existing] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: unique }, deletedAt: null, status: 'ACTIVE' },
      select: NAME_SELECT,
    }),
    prisma.conversationMember.findMany({
      where: { conversationId, userId: { in: unique } },
      select: { userId: true },
    }),
  ]);

  const alreadyIn = new Set(existing.map((row) => row.userId));
  const fresh = candidates.filter((user) => !alreadyIn.has(user.id));

  if (fresh.length === 0) return [];

  /**
   * Blok tekshiruvi HAR BIR nomzod uchun alohida.
   *
   * Ular birgalikda bajariladi (`Promise.all`), shuning uchun ellikta
   * odamni qo'shish ham bitta so'rov vaqtida tugaydi.
   */
  const allowed = await Promise.all(
    fresh.map(async (user) => ((await checkCanMessage(actorId, user.id)) ? null : user)),
  );

  return allowed.filter((user): user is NameRow => user !== null);
}

/** Guruh yaratadi va yaratuvchini EGA qilib qo'shadi. */
export async function createGroup(ownerId: string, input: CreateGroupInput): Promise<string> {
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: NAME_SELECT });

  if (!owner) {
    throw new NotFoundError('Foydalanuvchi');
  }

  /**
   * Guruh ID'si OLDINDAN yasaladi.
   *
   * `pairKey` — suhbat jadvalidagi majburiy va yagona ustun. Ikki
   * kishilik suhbatda u ikkala ID'dan yig'iladi, guruhda esa bunday
   * tabiiy kalit yo'q: bir xil nomli va bir xil a'zoli ikkita guruh
   * mutlaqo qonuniy. Shuning uchun kalit guruhning O'Z ID'sidan
   * yasaladi — u har doim yagona.
   */
  const conversationId = crypto.randomUUID();

  const invitees = await resolveAddableUsers(conversationId, ownerId, input.memberIds);

  if (invitees.length === 0) {
    throw new ValidationError("Guruhga qo'shish uchun odam topilmadi");
  }

  const ownerName = displayName(owner);

  await prisma.$transaction(async (tx) => {
    await tx.conversation.create({
      data: {
        id: conversationId,
        kind: ConversationKind.GROUP,
        pairKey: `group:${conversationId}`,
        title: input.title,
        imageUrl: input.imageUrl ?? null,
        createdById: ownerId,
        members: {
          create: [
            { userId: ownerId, role: GroupRole.OWNER, lastReadAt: new Date() },
            ...invitees.map((user) => ({ userId: user.id, role: GroupRole.MEMBER })),
          ],
        },
      },
      select: { id: true },
    });

    await writeSystemMessage(tx, conversationId, ownerId, 'GROUP_CREATED', ownerName);
  });

  logger.info({ conversationId, ownerId, members: invitees.length + 1 }, 'Guruh yaratildi');

  return conversationId;
}

/** Guruh nomi va rasmini o'zgartiradi. */
export async function updateGroup(
  conversationId: string,
  actorId: string,
  input: UpdateGroupInput,
): Promise<GroupInfoView> {
  const group = await requireGroup(conversationId, actorId);

  requirePermission(group.myRole, 'EDIT_INFO');

  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: NAME_SELECT });
  const actorName = displayName(actor);

  const data: Prisma.ConversationUpdateInput = {};
  const events: Array<{ kind: SystemMessageKindName; target?: string }> = [];

  if (input.title !== undefined && input.title !== group.title) {
    data.title = input.title;
    events.push({ kind: 'TITLE_CHANGED', target: input.title });
  }

  /**
   * `undefined` va `null` FARQLANADI: birinchisi "tegma", ikkinchisi
   * "rasmni olib tashla".
   */
  if (input.imageUrl !== undefined && (input.imageUrl ?? null) !== group.imageUrl) {
    data.imageUrl = input.imageUrl ?? null;
    events.push({ kind: 'IMAGE_CHANGED' });
  }

  /**
   * Hech narsa o'zgarmagan bo'lsa, hodisa YOZILMAYDI.
   *
   * Aks holda tugmani ikki marta bosish suhbatga ikkita bir xil
   * "rasmni o'zgartirdi" yozuvini qo'yardi.
   */
  if (events.length === 0) {
    return getGroupInfo(conversationId, actorId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.conversation.update({ where: { id: conversationId }, data, select: { id: true } });

    for (const event of events) {
      await writeSystemMessage(tx, conversationId, actorId, event.kind, actorName, event.target);
    }
  });

  logger.info({ conversationId, actorId }, "Guruh ma'lumoti o'zgartirildi");

  return getGroupInfo(conversationId, actorId);
}

/** Guruhga yangi a'zolar qo'shadi. */
export async function addMembers(
  conversationId: string,
  actorId: string,
  input: AddMembersInput,
): Promise<AddMembersResponse> {
  const group = await requireGroup(conversationId, actorId);

  requirePermission(group.myRole, 'ADD_MEMBER');

  const [actor, currentCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorId }, select: NAME_SELECT }),
    prisma.conversationMember.count({ where: { conversationId } }),
  ]);

  const invitees = await resolveAddableUsers(conversationId, actorId, input.memberIds);
  const requested = new Set(input.memberIds).size;

  if (invitees.length === 0) {
    return { added: 0, skipped: requested, group: await getGroupInfo(conversationId, actorId) };
  }

  if (currentCount + invitees.length > GROUP_MAX_MEMBERS) {
    throw new ConflictError(`Guruhda ${GROUP_MAX_MEMBERS} tadan ortiq a'zo bo'lishi mumkin emas`);
  }

  const actorName = displayName(actor);

  /**
   * Hodisa matni: bitta odam bo'lsa ismi, ko'p bo'lsa SONI.
   *
   * O'nta ismni bitta qatorga yozish suhbatni o'qib bo'lmas holga
   * keltirardi, o'nta alohida yozuv esa undan ham battar.
   */
  const target = invitees.length === 1 ? displayName(invitees[0]) : `${invitees.length} kishi`;

  const added = await prisma.$transaction(async (tx) => {
    const result = await tx.conversationMember.createMany({
      data: invitees.map((user) => ({ conversationId, userId: user.id, role: GroupRole.MEMBER })),
      /**
       * Ikki administrator bir vaqtda bir xil odamni qo'shsa, ikkinchi
       * yozuv jimgina o'tkazib yuboriladi — xato o'rniga.
       */
      skipDuplicates: true,
    });

    if (result.count > 0) {
      await writeSystemMessage(tx, conversationId, actorId, 'MEMBER_ADDED', actorName, target);
    }

    return result.count;
  });

  logger.info({ conversationId, actorId, added }, "Guruhga a'zo qo'shildi");

  return {
    added,
    skipped: requested - added,
    group: await getGroupInfo(conversationId, actorId),
  };
}

/** A'zoni guruhdan chiqaradi. */
export async function removeMember(
  conversationId: string,
  actorId: string,
  targetId: string,
): Promise<GroupInfoView> {
  const group = await requireGroup(conversationId, actorId);

  if (targetId === actorId) {
    throw new ValidationError("O'zingizni chiqara olmaysiz — guruhdan chiqish tugmasidan foydalaning");
  }

  const target = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: targetId } },
    select: { role: true, user: { select: NAME_SELECT } },
  });

  if (!target) {
    throw new NotFoundError("Guruh a'zosi");
  }

  if (!canRemoveMember(group.myRole, target.role as GroupRoleName)) {
    throw new ForbiddenError("Bu odamni chiqarishga ruxsat yo'q");
  }

  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: NAME_SELECT });

  await prisma.$transaction(async (tx) => {
    /**
     * `deleteMany` — `delete` emas.
     *
     * Ikki administrator bir vaqtda bir xil odamni chiqarsa, ikkinchi
     * urinish "qator topilmadi" xatosi bilan tugardi. `deleteMany`
     * esa shunchaki nol qator o'chirib, jimgina o'tadi.
     */
    const result = await tx.conversationMember.deleteMany({ where: { conversationId, userId: targetId } });

    if (result.count > 0) {
      await writeSystemMessage(
        tx,
        conversationId,
        actorId,
        'MEMBER_REMOVED',
        displayName(actor),
        displayName(target.user),
      );
    }
  });

  // Chiqarilgan odamning "yozmoqda" belgisi qolib ketmasin.
  await clearGroupTyping(conversationId, targetId);

  logger.info({ conversationId, actorId, targetId }, "A'zo guruhdan chiqarildi");

  return getGroupInfo(conversationId, actorId);
}

/** Administratorlik beradi yoki oladi. */
export async function setMemberAdmin(
  conversationId: string,
  actorId: string,
  targetId: string,
  isAdmin: boolean,
): Promise<GroupInfoView> {
  const group = await requireGroup(conversationId, actorId);

  requirePermission(group.myRole, 'MANAGE_ADMIN');

  if (targetId === actorId) {
    throw new ValidationError("O'z darajangizni o'zgartira olmaysiz");
  }

  const target = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: targetId } },
    select: { role: true, user: { select: NAME_SELECT } },
  });

  if (!target) {
    throw new NotFoundError("Guruh a'zosi");
  }

  /**
   * EGANING darajasiga tegib bo'lmaydi.
   *
   * Bu holat amalda yuz bermaydi (ega bitta va u — chaqiruvchining
   * o'zi), lekin ertaga "ikkinchi ega" qo'shilsa, bu tekshiruvsiz
   * ular bir-birini darajasidan tushira olardi.
   */
  if (target.role === GroupRole.OWNER) {
    throw new ForbiddenError("Guruh egasining darajasini o'zgartirib bo'lmaydi");
  }

  const nextRole = isAdmin ? GroupRole.ADMIN : GroupRole.MEMBER;

  if (target.role === nextRole) {
    return getGroupInfo(conversationId, actorId);
  }

  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: NAME_SELECT });

  await prisma.$transaction(async (tx) => {
    await tx.conversationMember.updateMany({
      where: { conversationId, userId: targetId, role: target.role },
      data: { role: nextRole },
    });

    await writeSystemMessage(
      tx,
      conversationId,
      actorId,
      isAdmin ? 'ADMIN_GRANTED' : 'ADMIN_REVOKED',
      displayName(actor),
      displayName(target.user),
    );
  });

  logger.info({ conversationId, actorId, targetId, isAdmin }, "Guruhda daraja o'zgardi");

  return getGroupInfo(conversationId, actorId);
}

/**
 * Guruhdan chiqadi.
 *
 * ── Egalik nima bo'ladi ───────────────────────────────────────────────
 * Ega chiqsa, egalik eng UZOQ VAQT guruhda bo'lgan administratorga
 * o'tadi; administrator bo'lmasa — eng uzoq vaqt turgan a'zoga.
 *
 * "Eng uzoq turgan" mezoni ataylab tanlangan: u tasodifiy emas,
 * hammaga tushunarli va bir xil natija beradi.
 *
 * @returns Guruh butunlay o'chirilgan bo'lsa `true`.
 */
export async function leaveGroup(conversationId: string, userId: string): Promise<boolean> {
  const group = await requireGroup(conversationId, userId);

  const [actor, others] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: NAME_SELECT }),
    prisma.conversationMember.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true, role: true, joinedAt: true, user: { select: NAME_SELECT } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    }),
  ]);

  /**
   * Oxirgi a'zo chiqsa, guruh butunlay O'CHIRILADI.
   *
   * Bo'sh guruh hech kimga ko'rinmaydi va hech qachon ochilmaydi —
   * u faqat bazada o'sib boradigan axlat bo'lib qolardi. Xabarlar
   * ham u bilan birga ketadi (`onDelete: Cascade`), lekin ularni
   * ko'radigan odam ham qolmagan.
   */
  if (others.length === 0) {
    await prisma.conversation.delete({ where: { id: conversationId } });
    await clearGroupTyping(conversationId, userId);

    logger.info({ conversationId, userId }, "Oxirgi a'zo chiqdi, guruh o'chirildi");

    return true;
  }

  /**
   * Yangi ega: ro'yxat allaqachon daraja va qo'shilgan vaqt bo'yicha
   * tartiblangan, shuning uchun birinchisi aynan kerakli odam.
   */
  const heir = group.myRole === 'OWNER' ? others[0] : null;
  const actorName = displayName(actor);

  await prisma.$transaction(async (tx) => {
    await tx.conversationMember.deleteMany({ where: { conversationId, userId } });

    await writeSystemMessage(tx, conversationId, userId, 'MEMBER_LEFT', actorName);

    if (heir) {
      await tx.conversationMember.updateMany({
        where: { conversationId, userId: heir.userId },
        data: { role: GroupRole.OWNER },
      });

      await writeSystemMessage(tx, conversationId, userId, 'OWNER_CHANGED', actorName, displayName(heir.user));
    }
  });

  await clearGroupTyping(conversationId, userId);

  logger.info({ conversationId, userId, heir: heir?.userId ?? null }, 'Foydalanuvchi guruhdan chiqdi');

  return false;
}
