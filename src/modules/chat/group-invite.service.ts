import { ConversationKind, GroupRole, Prisma } from '@/generated/prisma/client';
import { siteConfig } from '@/config/site';
import { canDo, GROUP_MAX_MEMBERS, type GroupRoleName } from '@/config/group-chat';
import {
  GROUP_INVITE_ALPHABET,
  GROUP_INVITE_ATTEMPTS,
  GROUP_INVITE_CODE_LENGTH,
  groupInviteLink,
} from '@/config/group-invite';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { checkCanMessage } from '@/modules/moderation/moderation.service';
import { writeGroupEvent } from '@/modules/chat/group.service';
import type { GroupInvitePreview, GroupInviteView, JoinByInviteResult } from '@/modules/chat/group-invite.types';

/**
 * Guruh havolasi.
 *
 * ── Modulning ENG NOZIK joyi: havola — bu OCHIQ eshik ────────────────
 * Havolani bilgan har kim guruhga kira oladi. Bu kutilgan xatti-harakat
 * (aynan shu narsa uchun havola yasaladi), lekin u ikkita qoidani
 * majburiy qiladi:
 *
 *   1. Kod TAXMIN qilinmasligi kerak — u tasodifiy va uzun;
 *   2. Havolani DARHOL o'chirib bo'lishi kerak — bir ustunni
 *      bo'shatish yetadi va eski havola o'sha zahoti o'ladi.
 *
 * Uchinchi qoida odamga tegishli: u havola nimani anglatishini
 * bilishi kerak. Shuning uchun ogohlantirish matni config'da turadi
 * va ekranda havolaning YONIDA ko'rsatiladi.
 */

/**
 * Tasodifiy kod yasaydi.
 *
 * ── Nima uchun `crypto`, `Math.random` emas ───────────────────────────
 * `Math.random` bashorat qilinadi: bir nechta natijani ko'rgan odam
 * keyingilarini hisoblab chiqishi mumkin. Guruh havolasida bu
 * to'g'ridan-to'g'ri "begona guruhlarga kirish" degani.
 */
function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(GROUP_INVITE_CODE_LENGTH));

  let code = '';

  for (const byte of bytes) {
    code += GROUP_INVITE_ALPHABET[byte % GROUP_INVITE_ALPHABET.length];
  }

  return code;
}

/** Guruhni va mening darajamni oladi. */
async function requireGroupRole(
  conversationId: string,
  userId: string,
): Promise<{ title: string; inviteCode: string | null; inviteCreatedAt: Date | null; myRole: GroupRoleName }> {
  const row = await prisma.conversation.findFirst({
    where: { id: conversationId, kind: ConversationKind.GROUP },
    select: {
      title: true,
      inviteCode: true,
      inviteCreatedAt: true,
      members: { where: { userId }, select: { role: true } },
    },
  });

  if (!row || row.members.length === 0) {
    throw new NotFoundError('Guruh');
  }

  return {
    title: row.title ?? 'Guruh',
    inviteCode: row.inviteCode,
    inviteCreatedAt: row.inviteCreatedAt,
    myRole: row.members[0].role as GroupRoleName,
  };
}

/** Havola ko'rinishini yig'adi. */
function toInviteView(title: string, code: string | null, createdAt: Date | null): GroupInviteView {
  if (!code) {
    return { code: null, link: null, createdAt: null };
  }

  return {
    code,
    link: groupInviteLink(siteConfig.url, code),
    createdAt: createdAt?.toISOString() ?? null,
    shareTitle: title,
  };
}

/** Guruhning hozirgi havolasi (bo'lsa). */
export async function getGroupInvite(conversationId: string, userId: string): Promise<GroupInviteView> {
  const group = await requireGroupRole(conversationId, userId);

  /**
   * Havolani KO'RISH ham huquq talab qiladi.
   *
   * Oddiy a'zo havolani ko'rsa, uni istalgan joyga tashlab yuborishi
   * mumkin edi — administratorlar esa buni bilmasdi ham. Havola kimni
   * kiritishini boshqarish — bu boshqaruv amali.
   */
  if (!canDo(group.myRole, 'ADD_MEMBER')) {
    throw new ForbiddenError("Havolani ko'rish uchun ruxsat yo'q");
  }

  return toInviteView(group.title, group.inviteCode, group.inviteCreatedAt);
}

/**
 * Havola yasaydi yoki YANGILAYDI.
 *
 * ── Nima uchun bitta amal ─────────────────────────────────────────────
 * "Yasash" va "yangilash" foydalanuvchi uchun bir xil tuyuladi:
 * ikkalasi ham "menga ishlaydigan havola kerak" degani. Ularni
 * ikkita tugmaga ajratish faqat chalkashtirardi.
 *
 * Farqi natijada: eski havola bo'lsa, u DARHOL ishlamay qoladi.
 */
export async function createGroupInvite(conversationId: string, userId: string): Promise<GroupInviteView> {
  const group = await requireGroupRole(conversationId, userId);

  if (!canDo(group.myRole, 'ADD_MEMBER')) {
    throw new ForbiddenError("Havola yasash uchun ruxsat yo'q");
  }

  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, profile: { select: { username: true } } },
  });

  const actorName =
    [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') ||
    (actor?.profile?.username ? `@${actor.profile.username}` : 'Foydalanuvchi');

  /**
   * To'qnashuvda qayta uriniladi.
   *
   * 141 trillion kombinatsiyada to'qnashuv deyarli mumkin emas, lekin
   * "deyarli" — bu "hech qachon" emas. Yagonalik bazada qulflangan,
   * shuning uchun to'qnashuv xato bo'lib qaytadi va uni ushlash kerak.
   */
  for (let attempt = 0; attempt < GROUP_INVITE_ATTEMPTS; attempt += 1) {
    const code = generateCode();

    try {
      const now = new Date();

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { inviteCode: code, inviteCreatedAt: now },
        select: { id: true },
      });

      /**
       * Hodisa suhbatga YOZILADI.
       *
       * Havola — bu guruhga kirishni ochadigan amal. U jimgina
       * bajarilsa, a'zolar begona odamlar qayerdan paydo
       * bo'layotganini tushunmasdi.
       */
      await writeGroupEvent(
        conversationId,
        userId,
        group.inviteCode ? 'INVITE_ROTATED' : 'INVITE_CREATED',
        actorName,
      );

      logger.info({ conversationId, userId, rotated: Boolean(group.inviteCode) }, 'Guruh havolasi yasaldi');

      return toInviteView(group.title, code, now);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        continue;
      }

      throw error;
    }
  }

  throw new ConflictError("Havola yasab bo'lmadi. Qaytadan urinib ko'ring.");
}

/** Havolani o'chiradi — eski havola darhol ishlamay qoladi. */
export async function revokeGroupInvite(conversationId: string, userId: string): Promise<GroupInviteView> {
  const group = await requireGroupRole(conversationId, userId);

  if (!canDo(group.myRole, 'ADD_MEMBER')) {
    throw new ForbiddenError("Havolani o'chirish uchun ruxsat yo'q");
  }

  if (!group.inviteCode) {
    return toInviteView(group.title, null, null);
  }

  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, profile: { select: { username: true } } },
  });

  const actorName =
    [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') ||
    (actor?.profile?.username ? `@${actor.profile.username}` : 'Foydalanuvchi');

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { inviteCode: null, inviteCreatedAt: null },
    select: { id: true },
  });

  await writeGroupEvent(conversationId, userId, 'INVITE_REVOKED', actorName);

  logger.info({ conversationId, userId }, "Guruh havolasi o'chirildi");

  return toInviteView(group.title, null, null);
}

/**
 * Havola kimga tegishli — KIRISHSIZ ko'rinadigan ma'lumot.
 *
 * ── Nima uchun kirish talab qilinmaydi ────────────────────────────────
 * Havolaning butun maqsadi — ilovada BO'LMAGAN odamni chaqirish.
 * Kirish talab qilinsa, u avval ro'yxatdan o'tishga majbur bo'lardi,
 * lekin nima uchun o'tayotganini bilmasdi.
 *
 * ── Nima BERILADI va nima BERILMAYDI ──────────────────────────────────
 * Beriladi: guruh nomi, rasmi va a'zolar SONI. Bular "bu qanday
 * guruh?" degan savolga javob beradi.
 *
 * Berilmaydi: a'zolarning ismlari, xabarlar, guruh ID'si. Havola
 * tasodifan begona odamga tushsa ham, u guruh ichini ko'rmaydi.
 */
export async function previewGroupInvite(code: string): Promise<GroupInvitePreview | null> {
  const row = await prisma.conversation.findUnique({
    where: { inviteCode: code },
    select: {
      title: true,
      imageUrl: true,
      _count: { select: { members: true } },
    },
  });

  if (!row) return null;

  return {
    title: row.title ?? 'Guruh',
    imageUrl: row.imageUrl,
    memberCount: row._count.members,
    isFull: row._count.members >= GROUP_MAX_MEMBERS,
  };
}

/**
 * Havola orqali guruhga qo'shiladi.
 *
 * ── Nima uchun bu amal TAKRORGA chidamli ──────────────────────────────
 * Odam havolani ikki marta bosishi mumkin, yoki allaqachon a'zo
 * bo'lgan holda bosishi mumkin. Ikkalasida ham xato ko'rsatish
 * noto'g'ri bo'lardi: u shunchaki guruhga o'tishi kerak.
 */
export async function joinByInvite(code: string, userId: string): Promise<JoinByInviteResult> {
  const group = await prisma.conversation.findUnique({
    where: { inviteCode: code },
    select: {
      id: true,
      title: true,
      createdById: true,
      members: { select: { userId: true, role: true } },
    },
  });

  if (!group) {
    throw new NotFoundError('Havola');
  }

  const already = group.members.some((member) => member.userId === userId);

  if (already) {
    return { conversationId: group.id, isNew: false };
  }

  if (group.members.length >= GROUP_MAX_MEMBERS) {
    throw new ConflictError(`Guruh to'lgan: eng ko'pi ${GROUP_MAX_MEMBERS} a'zo bo'lishi mumkin.`);
  }

  /**
   * BLOK tekshiruvi — guruh EGASIGA nisbatan.
   *
   * ── Nima uchun aynan ega ────────────────────────────────────────────
   * Odatdagi qo'shishda "meni kim qo'shyapti" degan savolga aniq javob
   * bor: administrator. Havolada esa qo'shuvchi yo'q — odam o'zi
   * kiradi.
   *
   * Shunda blokni kimga nisbatan tekshirish kerak? Guruh egasiga:
   * agar odam guruh egasini bloklagan (yoki u tomonidan bloklangan)
   * bo'lsa, ular bir suhbatda bo'lishi mantiqsiz.
   *
   * Qolgan a'zolar tekshirilmaydi: yigirma kishilik guruhda bittasi
   * bilan janjal bo'lgani butun guruhga kirishni to'sishi noto'g'ri
   * bo'lardi.
   */
  const owner = group.members.find((member) => member.role === GroupRole.OWNER)?.userId ?? group.createdById;

  if (owner && owner !== userId && (await checkCanMessage(userId, owner))) {
    throw new ForbiddenError("Bu guruhga qo'shila olmaysiz.");
  }

  const person = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, status: 'ACTIVE' },
    select: { firstName: true, lastName: true, profile: { select: { username: true } } },
  });

  if (!person) {
    throw new NotFoundError('Foydalanuvchi');
  }

  const name =
    [person.firstName, person.lastName].filter(Boolean).join(' ') ||
    (person.profile?.username ? `@${person.profile.username}` : 'Foydalanuvchi');

  try {
    await prisma.conversationMember.create({
      data: { conversationId: group.id, userId, role: GroupRole.MEMBER },
      select: { id: true },
    });
  } catch (error) {
    /**
     * Ikki marta tez bosilsa, ikkinchi yozuv bazada rad etiladi.
     *
     * Bu xato emas: odam allaqachon guruhda. Uni shunchaki
     * guruhga o'tkazamiz.
     */
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { conversationId: group.id, isNew: false };
    }

    throw error;
  }

  /**
   * Hodisa matni BOSHQACHA: "qo'shdi" emas, "qo'shildi".
   *
   * Havolada hech kim hech kimni qo'shmaydi — odam o'zi kiradi.
   * "Ali Valini qo'shdi" deb yozish yolg'on bo'lardi.
   */
  await writeGroupEvent(group.id, userId, 'JOINED_BY_LINK', name);

  logger.info({ conversationId: group.id, userId }, "Havola orqali guruhga qo'shildi");

  return { conversationId: group.id, isNew: true };
}
