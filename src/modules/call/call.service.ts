import { CALL_ALIVE_TTL_SECONDS, MAX_CALL_SECONDS, RING_TIMEOUT_SECONDS, STUN_SERVERS } from '@/config/calls';
import { CallKind, CallStatus, ConversationKind, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { isCallAlive, pushCallEvent, touchCallAlive } from '@/lib/call-signal';
import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/modules/notification/notification.service';
import { sendPush } from '@/modules/notification/push.service';
import type { CallSignalInput, StartCallInput } from '@/modules/call/call.schemas';
import type { CallSignal, CallStatusName, CallView, IceServerConfig } from '@/modules/call/call.types';

/**
 * Qo'ng'iroq moduli.
 *
 * ── Modulning ENG NOZIK joyi: "osilib qolgan" qo'ng'iroq ──────────────
 * Brauzer yopilsa yoki internet uzilsa, qo'ng'iroq bazada "ketmoqda"
 * holatida qolib ketadi. Natijada odam boshqa hech kimga qo'ng'iroq
 * qila olmaydi — tizim uni doim "band" deb hisoblayveradi.
 *
 * Buni fon jarayoni bilan tozalash mumkin edi, lekin serversiz muhitda
 * doimiy ishlaydigan fon jarayoni yo'q. Shuning uchun tozalash
 * KERAK BO'LGANDA bajariladi: har safar qo'ng'iroqqa tegishli amaldan
 * oldin muddati o'tganlari yopiladi.
 *
 * Bu usulning foydasi — u hech qachon "unutilmaydi": tozalash aynan
 * natijaga bog'liq bo'lgan joyda ishlaydi.
 */

const CALL_SELECT = {
  id: true,
  conversationId: true,
  callerId: true,
  calleeId: true,
  kind: true,
  status: true,
  startedAt: true,
  answeredAt: true,
  endedAt: true,
  durationSeconds: true,
  caller: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      profile: { select: { username: true } },
    },
  },
  callee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      profile: { select: { username: true } },
    },
  },
} as const;

type CallRow = Prisma.CallGetPayload<{ select: typeof CALL_SELECT }>;

type PersonRow = CallRow['caller'];

function toPeer(person: PersonRow): CallView['peer'] {
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ');
  const username = person.profile?.username ?? '';

  return {
    userId: person.id,
    name: fullName || (username ? `@${username}` : 'Foydalanuvchi'),
    avatarUrl: person.avatarUrl,
    username,
  };
}

function toCallView(row: CallRow, viewerId: string): CallView {
  const isOutgoing = row.callerId === viewerId;

  return {
    id: row.id,
    conversationId: row.conversationId,
    kind: row.kind,
    status: row.status,
    isOutgoing,
    // Ikkinchi tomon — men chaqiruvchi bo'lsam qabul qiluvchi, aksincha.
    peer: toPeer(isOutgoing ? row.callee : row.caller),
    startedAt: row.startedAt.toISOString(),
    answeredAt: row.answeredAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    durationSeconds: row.durationSeconds,
  };
}

/**
 * Brauzerga beriladigan ulanish serverlari.
 *
 * STUN har doim bor (bepul). TURN esa faqat sozlangan bo'lsa qo'shiladi.
 * Tartib muhim: brauzer avval arzon yo'lni (STUN) sinaydi, TURN esa
 * faqat iloji bo'lmaganda ishlatiladi.
 */
export function buildIceServers(): IceServerConfig[] {
  const env = serverEnv();

  const servers: IceServerConfig[] = [{ urls: [...STUN_SERVERS] }];

  if (env.TURN_URL && env.TURN_USERNAME && env.TURN_CREDENTIAL) {
    servers.push({ urls: env.TURN_URL, username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL });
  }

  return servers;
}

/**
 * Muddati o'tgan qo'ng'iroqlarni yopadi.
 *
 * Ikki holat:
 *  - javob kutilib, vaqti tugagan → "javob berilmadi";
 *  - juda uzoq "ketmoqda" bo'lib turgan → "tugadi" (brauzer yopilgan).
 */
async function expireStaleCalls(userIds: string[]): Promise<void> {
  const now = Date.now();

  const ringingBefore = new Date(now - RING_TIMEOUT_SECONDS * 1_000);
  const activeBefore = new Date(now - MAX_CALL_SECONDS * 1_000);

  const mine: Prisma.CallWhereInput = {
    OR: [{ callerId: { in: userIds } }, { calleeId: { in: userIds } }],
  };

  await prisma.$transaction([
    prisma.call.updateMany({
      where: { ...mine, status: CallStatus.RINGING, startedAt: { lt: ringingBefore } },
      data: { status: CallStatus.MISSED, endedAt: new Date() },
    }),
    prisma.call.updateMany({
      where: { ...mine, status: CallStatus.ACTIVE, startedAt: { lt: activeBefore } },
      data: { status: CallStatus.ENDED, endedAt: new Date() },
    }),
  ]);

  await closeAbandonedCalls(mine);
}

/**
 * Brauzeri yopilgan qo'ng'iroqlarni yopadi.
 *
 * ── Nima uchun ALOHIDA tekshiruv ──────────────────────────────────────
 * Yuqoridagi 4 soatlik chegara faqat oxirgi chora. Usiz brauzeri
 * to'satdan yopilgan odam to'rt soat "band" bo'lib turardi: unga hech
 * kim qo'ng'iroq qila olmasdi.
 *
 * Gaplashayotgan tomon har 20 soniyada "men bormanni" bildiradi. Belgi
 * yo'q bo'lsa — brauzer yopilgan.
 */
async function closeAbandonedCalls(scope: Prisma.CallWhereInput): Promise<void> {
  const rows = await prisma.call.findMany({
    where: { ...scope, status: CallStatus.ACTIVE },
    select: { id: true, answeredAt: true, startedAt: true },
  });

  if (rows.length === 0) return;

  const now = Date.now();
  const graceMs = CALL_ALIVE_TTL_SECONDS * 1_000;

  for (const row of rows) {
    const since = (row.answeredAt ?? row.startedAt).getTime();

    // Endigina boshlangan qo'ng'iroqqa tegmaymiz: belgi hali qo'yilmagan bo'lishi mumkin.
    if (now - since < graceMs) continue;

    if (await isCallAlive(row.id)) continue;

    /**
     * Davomiylik belgi so'nishidan OLDINGI paytga qadar hisoblanadi.
     *
     * Aniq qachon uzilganini bilmaymiz, lekin belgi eng ko'pi bilan
     * shuncha vaqt oldin yangilangan. Shu sababli tarixda ortiqcha
     * daqiqalar yozilmaydi.
     */
    const endedAt = new Date(now - graceMs);

    await prisma.call.update({
      where: { id: row.id },
      data: {
        status: CallStatus.ENDED,
        endedAt,
        durationSeconds: Math.max(0, Math.round((endedAt.getTime() - since) / 1_000)),
      },
    });

    logger.info({ callId: row.id }, "Tashlab ketilgan qo'ng'iroq yopildi");
  }
}

/**
 * Qo'ng'iroqni topadi va foydalanuvchi unga aloqadorligini tekshiradi.
 *
 * ATAYLAB "topilmadi": begona odamga qo'ng'iroq mavjudligini bilish
 * imkonini bermaymiz.
 */
async function requireParticipant(callId: string, userId: string): Promise<CallRow> {
  const row = await prisma.call.findFirst({
    where: { id: callId, OR: [{ callerId: userId }, { calleeId: userId }] },
    select: CALL_SELECT,
  });

  if (!row) {
    throw new NotFoundError("Qo'ng'iroq");
  }

  return row;
}

/** Qo'ng'iroqdagi ikkinchi tomonning ID'si. */
function otherSide(row: CallRow, userId: string): string {
  return row.callerId === userId ? row.calleeId : row.callerId;
}

/** Chaqiruvchining ko'rinadigan ismi. */
function callerName(row: CallRow): string {
  const person = row.caller;
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ');

  return fullName || (person.profile?.username ? `@${person.profile.username}` : 'Foydalanuvchi');
}

/** Kelayotgan qo'ng'iroq haqida telefonga turtki yuboradi. */
async function notifyIncomingCall(row: CallRow): Promise<void> {
  const isVideo = row.kind === CallKind.VIDEO;

  await sendPush(row.calleeId, {
    title: `${isVideo ? 'Video qo' : 'Qo'}'ng'iroq`,
    body: `${callerName(row)} sizga qo'ng'iroq qilmoqda.`,
    url: `/messages/${row.conversationId}`,
    /**
     * Nishon barcha qo'ng'iroqlar uchun BIR XIL.
     *
     * Odam ikki marta qo'ng'iroq qilsa, ekranda ikkita chaqiruv emas,
     * bittasi — eng oxirgisi turadi.
     */
    tag: 'navix-call',
    /**
     * Muddat QISQA.
     *
     * Telefon o'chiq bo'lsa, push xizmati xabarni saqlab turadi.
     * Lekin tugagan qo'ng'iroqning chaqirig'ini yarim soatdan keyin
     * ko'rsatish faqat chalkashtiradi — odam qayta qo'ng'iroq qilib,
     * hech kim kutmayotganini bilib qolardi.
     */
    ttlSeconds: RING_TIMEOUT_SECONDS,
  });
}

/**
 * Javobsiz qo'ng'iroq haqida yozib qo'yadi.
 *
 * Suhbat tarixida ham ko'rinadi, lekin bildirishnomalar ro'yxatida
 * turishi ham kerak: odam suhbatni ochmasdan ham kim qo'ng'iroq
 * qilganini bilishi shart.
 */
async function notifyMissedCall(row: CallRow, wasDeclined: boolean): Promise<void> {
  await notifyUser(row.calleeId, 'call.missed', {
    conversationId: row.conversationId,
    callerName: callerName(row),
    wasDeclined,
    isVideo: row.kind === CallKind.VIDEO,
  });
}

/** Ikkala tomonga ham holat o'zgarganini bildiradi. */
async function broadcastState(row: CallRow): Promise<void> {
  await Promise.all([
    pushCallEvent(row.callerId, { kind: 'state', call: toCallView(row, row.callerId) }),
    pushCallEvent(row.calleeId, { kind: 'state', call: toCallView(row, row.calleeId) }),
  ]);
}

// ─────────────────────────────────────────────────────────────────────
// Amallar
// ─────────────────────────────────────────────────────────────────────

export async function startCall(callerId: string, input: StartCallInput): Promise<CallView> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, members: { some: { userId: callerId } } },
    select: { id: true, kind: true, members: { select: { userId: true } } },
  });

  if (!conversation) {
    throw new NotFoundError('Suhbat');
  }

  /**
   * Biznesga qo'ng'iroq qilinmaydi.
   *
   * Biznes suhbatida ikkinchi tomon — jadval yozuvi, telefoni bor odam
   * emas. Kim javob berishi hal qilinmagan ekan, tugmani ishlatib
   * qo'yish "qo'ng'iroq ketdi, lekin hech kim ko'tarmadi" degan yolg'on
   * taassurot berardi.
   */
  if (conversation.kind !== ConversationKind.DIRECT) {
    throw new ValidationError("Kompaniyaga qo'ng'iroq qilib bo'lmaydi. Xabar yozing.");
  }

  const calleeId = conversation.members.find((member) => member.userId !== callerId)?.userId;

  if (!calleeId) {
    throw new NotFoundError('Suhbatdosh');
  }

  // Avval osilib qolganlarini yopamiz — aks holda "band" deb chiqardi.
  await expireStaleCalls([callerId, calleeId]);

  const busy = await prisma.call.findFirst({
    where: {
      status: { in: [CallStatus.RINGING, CallStatus.ACTIVE] },
      OR: [{ callerId: { in: [callerId, calleeId] } }, { calleeId: { in: [callerId, calleeId] } }],
    },
    select: { id: true, callerId: true, calleeId: true },
  });

  if (busy) {
    throw new ConflictError(
      busy.callerId === callerId || busy.calleeId === callerId
        ? "Sizda tugallanmagan qo'ng'iroq bor."
        : 'Abonent band.',
    );
  }

  let row: CallRow;

  try {
    row = await prisma.call.create({
      data: { conversationId: conversation.id, callerId, calleeId, kind: input.kind },
      select: CALL_SELECT,
    });
  } catch (error) {
    /**
     * Bazadagi shart ishga tushdi — demak ayni shu oniyda boshqa
     * so'rov qo'ng'iroq yaratib ulgurdi.
     *
     * Yuqoridagi tekshiruv buni ushlay olmaydi: o'qish va yozish
     * orasida vaqt bor. Yagona ishonchli to'siq — bazadagi indeks.
     */
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError("Qo'ng'iroq allaqachon boshlangan.");
    }

    throw error;
  }

  /**
   * Eski qo'ng'iroqdan qolgan xabarlar navbatda turgan bo'lishi mumkin.
   *
   * Ular O'CHIRILMAYDI: navbatni bo'shatish ulanishlarning kursorini
   * buzardi. Uning o'rniga har bir hodisada qo'ng'iroq ID'si bor va
   * brauzer BEGONA qo'ng'iroqqa tegishlisini e'tiborsiz qoldiradi.
   */
  await pushCallEvent(calleeId, { kind: 'ring', call: toCallView(row, calleeId) });

  /**
   * Telefonga turtki — ilova yopiq bo'lsa ham chaqiruv ko'rinsin.
   *
   * ── Nima uchun kutilmaydi ────────────────────────────────────────────
   * Push tashqi xizmatga boradi va bir necha yuz millisekund olishi
   * mumkin. Chaqiruvchi esa "chalinmoqda" ekranini DARHOL ko'rishi
   * kerak.
   */
  void notifyIncomingCall(row);

  logger.info({ callId: row.id, callerId, calleeId, kind: input.kind }, "Qo'ng'iroq boshlandi");

  return toCallView(row, callerId);
}

export async function answerCall(callId: string, userId: string): Promise<CallView> {
  const existing = await requireParticipant(callId, userId);

  /**
   * Javobni FAQAT qabul qiluvchi bera oladi.
   *
   * Bo'lmasa chaqiruvchi o'z qo'ng'irog'ini o'zi "ko'tarib", suhbat
   * boshlangandek ko'rsata olardi.
   */
  if (existing.calleeId !== userId) {
    throw new ValidationError("Bu qo'ng'iroqqa siz javob bera olmaysiz.");
  }

  if (existing.status !== CallStatus.RINGING) {
    throw new ConflictError("Qo'ng'iroq allaqachon tugagan.");
  }

  const row = await prisma.call.update({
    where: { id: callId },
    data: { status: CallStatus.ACTIVE, answeredAt: new Date() },
    select: CALL_SELECT,
  });

  // Birinchi "men bormanni" darhol qo'yamiz — bo'shliq qolmasligi uchun.
  await touchCallAlive(callId);

  await broadcastState(row);

  logger.info({ callId }, "Qo'ng'iroqqa javob berildi");

  return toCallView(row, userId);
}

/**
 * Qo'ng'iroqni tugatadi.
 *
 * Bitta funksiya uch holatni qamraydi, chunki farqi faqat YOZILADIGAN
 * holatda:
 *  - qabul qiluvchi chalinayotganda bosdi  → rad etildi;
 *  - chaqiruvchi chalinayotganda bosdi     → javob berilmadi;
 *  - suhbat ketayotganda kimdir bosdi      → tugadi.
 */
export async function endCall(
  callId: string,
  userId: string,
  options: { failed?: boolean } = {},
): Promise<CallView> {
  const existing = await requireParticipant(callId, userId);

  if (existing.status !== CallStatus.RINGING && existing.status !== CallStatus.ACTIVE) {
    // Ikki tomon ham bir vaqtda bosishi mumkin — bu xato emas.
    return toCallView(existing, userId);
  }

  const endedAt = new Date();

  const status = resolveEndStatus(existing.status, existing.calleeId === userId, options.failed ?? false);

  /**
   * Davomiylik javob berilgan paytdan hisoblanadi.
   *
   * Chalingan vaqt kirmaydi: odam uchun "3 daqiqa gaplashdik" degani
   * gaplashilgan vaqt, kutilgan vaqt emas.
   */
  const durationSeconds = existing.answeredAt
    ? Math.max(0, Math.round((endedAt.getTime() - existing.answeredAt.getTime()) / 1_000))
    : 0;

  const row = await prisma.call.update({
    where: { id: callId },
    data: { status, endedAt, durationSeconds },
    select: CALL_SELECT,
  });

  await broadcastState(row);

  /**
   * Javob berilmagan qo'ng'iroq yozib qo'yiladi.
   *
   * "Tugadi" holatida yozilmaydi: gaplashilgan qo'ng'iroq haqida
   * eslatishning ma'nosi yo'q, u allaqachon suhbat tarixida turibdi.
   */
  if (status === 'MISSED' || status === 'DECLINED') {
    void notifyMissedCall(row, status === 'DECLINED');
  }

  logger.info({ callId, status, durationSeconds }, "Qo'ng'iroq tugadi");

  return toCallView(row, userId);
}

/** Tugatishda qaysi holat yozilishini aniqlaydi. */
function resolveEndStatus(current: CallStatus, isCallee: boolean, failed: boolean): CallStatusName {
  if (failed) return 'FAILED';

  if (current === CallStatus.RINGING) {
    return isCallee ? 'DECLINED' : 'MISSED';
  }

  return 'ENDED';
}

/**
 * Ulanish ma'lumotini ikkinchi tomonga uzatadi.
 *
 * Server mazmunga aralashmaydi — u faqat pochtachi.
 */
export async function relaySignal(callId: string, userId: string, input: CallSignalInput): Promise<void> {
  const row = await requireParticipant(callId, userId);

  /**
   * Tugagan qo'ng'iroqqa signal yuborilmaydi.
   *
   * Usiz tugatilgandan keyin ham kechikkan xabarlar kelib, ikkinchi
   * tomonda qo'ng'iroq qaytadan "tirilib" qolardi.
   */
  if (row.status !== CallStatus.RINGING && row.status !== CallStatus.ACTIVE) {
    throw new ConflictError("Qo'ng'iroq tugagan.");
  }

  const signal: CallSignal = { type: input.type, sdp: input.sdp, candidate: input.candidate };

  await pushCallEvent(otherSide(row, userId), { kind: 'signal', callId, signal });
}

/**
 * "Qo'ng'iroq hali ketmoqda" belgisini yangilaydi.
 *
 * Ikkala tomon ham yuboradi: bittasining brauzeri yopilsa, ikkinchisi
 * belgini yangilab turadi va suhbat uzilmaydi.
 */
export async function keepCallAlive(callId: string, userId: string): Promise<void> {
  const row = await requireParticipant(callId, userId);

  if (row.status !== CallStatus.ACTIVE) {
    throw new ConflictError("Qo'ng'iroq ketmayapti.");
  }

  await touchCallAlive(callId);
}

/** Qo'ng'iroqning hozirgi holati. */
export async function getCall(callId: string, userId: string): Promise<CallView> {
  await expireStaleCalls([userId]);

  const row = await requireParticipant(callId, userId);

  return toCallView(row, userId);
}

/**
 * Foydalanuvchining hozirgi jonli qo'ng'irog'i (bo'lsa).
 *
 * Jonli oqim ulanganda chaqiriladi: sahifa yangilangan yoki ilova qayta
 * ochilgan bo'lsa ham, davom etayotgan qo'ng'iroq ekranga qaytadi.
 */
export async function getLiveCall(userId: string): Promise<CallView | null> {
  await expireStaleCalls([userId]);

  const row = await prisma.call.findFirst({
    where: {
      status: { in: [CallStatus.RINGING, CallStatus.ACTIVE] },
      OR: [{ callerId: userId }, { calleeId: userId }],
    },
    select: CALL_SELECT,
    orderBy: { startedAt: 'desc' },
  });

  return row ? toCallView(row, userId) : null;
}

/** Suhbatdagi qo'ng'iroqlar tarixi. */
export async function listCallsForConversation(conversationId: string, userId: string): Promise<CallView[]> {
  const rows = await prisma.call.findMany({
    where: {
      conversationId,
      conversation: { members: { some: { userId } } },
      // Faqat tugaganlari: jonlisi alohida ekranda ko'rinadi.
      status: { notIn: [CallStatus.RINGING, CallStatus.ACTIVE] },
    },
    select: CALL_SELECT,
    orderBy: { startedAt: 'asc' },
    take: 50,
  });

  return rows.map((row) => toCallView(row, userId));
}
