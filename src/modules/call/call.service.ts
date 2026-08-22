import { CALL_ALIVE_TTL_SECONDS, MAX_CALL_SECONDS, RING_TIMEOUT_SECONDS, STUN_SERVERS } from '@/config/calls';
import { maxParticipants, type CallParticipantStatusName } from '@/config/group-call';
import { CallKind, CallStatus, ConversationKind, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { isCallAlive, pushCallEvent, touchCallAlive } from '@/lib/call-signal';
import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { requireCanMessage } from '@/modules/moderation/moderation.service';
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
  isGroup: true,
  kind: true,
  status: true,
  startedAt: true,
  answeredAt: true,
  endedAt: true,
  durationSeconds: true,
  /**
   * Guruh nomi va rasmi — chaqiruv ekranida ko'rsatish uchun.
   *
   * Ikki kishilik qo'ng'iroqda ular bo'sh bo'ladi va ishlatilmaydi.
   */
  conversation: { select: { title: true, imageUrl: true, kind: true } },
  /**
   * Ishtirokchilar — FAQAT guruh qo'ng'irog'ida to'ldiriladi.
   *
   * Ikki kishilik qo'ng'iroqda bu ro'yxat bo'sh va tomonlar
   * `caller`/`callee` ustunlaridan olinadi.
   */
  participants: {
    select: {
      userId: true,
      status: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          profile: { select: { username: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
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

function toPeer(person: PersonRow | null): CallView['peer'] {
  /**
   * Odam topilmasligi mumkin: hisob o'chirilgan yoki bu GURUH
   * qo'ng'irog'i (u yerda aniq "ikkinchi tomon" yo'q).
   *
   * Bo'sh qaytarish o'rniga umumiy yozuv beriladi — ekranda bo'sh
   * joy qolmasligi kerak.
   */
  if (!person) {
    return { userId: '', name: 'Foydalanuvchi', avatarUrl: null, username: '' };
  }

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
    isGroup: row.isGroup,
    /**
     * Guruhda "ikkinchi tomon" — guruhning O'ZI.
     *
     * Chaqiruv ekranida odam nomi emas, guruh nomi ko'rinishi kerak:
     * "Oila sizni chaqirmoqda". Kim boshlagani ishtirokchilar
     * ro'yxatidan ko'rinadi.
     */
    peer: row.isGroup
      ? {
          userId: '',
          name: row.conversation.title ?? 'Guruh',
          avatarUrl: row.conversation.imageUrl,
          username: '',
        }
      : // Ikkinchi tomon — men chaqiruvchi bo'lsam qabul qiluvchi, aksincha.
        toPeer(isOutgoing ? row.callee : row.caller),
    participants: row.participants.map((participant) => ({
      ...toPeer(participant.user),
      status: participant.status as CallParticipantStatusName,
      joinedAt: participant.joinedAt?.toISOString() ?? null,
      isMe: participant.userId === viewerId,
    })),
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
    OR: [
      { callerId: { in: userIds } },
      { calleeId: { in: userIds } },
      { participants: { some: { userId: { in: userIds } } } },
    ],
  };

  /**
   * Muddati o'tganlarning ID'lari OLDIN o'qiladi.
   *
   * `updateMany` faqat sonini qaytaradi. Ularsiz ishtirokchilarni
   * bo'shatish uchun qaysi qo'ng'iroqlar yopilganini bilib bo'lmasdi.
   */
  const expiring = await prisma.call.findMany({
    where: {
      ...mine,
      OR: [
        { status: CallStatus.RINGING, startedAt: { lt: ringingBefore } },
        { status: CallStatus.ACTIVE, startedAt: { lt: activeBefore } },
      ],
    },
    select: { id: true },
  });

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

  await releaseParticipants(expiring.map((row) => row.id));

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

  /**
   * HAQIQATDA yopilgan qo'ng'iroqlar.
   *
   * ── Nima uchun alohida ro'yxat (topilgan xato) ────────────────────
   * Avval ishtirokchilar `rows` bo'yicha bo'shatilardi — ya'ni
   * TEKSHIRILGAN barcha qo'ng'iroqlar bo'yicha. Lekin `rows` ichida
   * hali TIRIK qo'ng'iroqlar ham bor: quyidagi halqa ularni
   * `continue` bilan o'tkazib yuboradi.
   *
   * Natijada har bir holat so'rovi ketayotgan suhbatning
   * ishtirokchilarini "chiqib ketgan" deb belgilab qo'yardi va suhbat
   * bir necha soniyada o'z-o'zidan tarqalardi.
   */
  const closedIds: string[] = [];

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

    closedIds.push(row.id);

    logger.info({ callId: row.id }, "Tashlab ketilgan qo'ng'iroq yopildi");
  }

  /**
   * Yopilgan qo'ng'iroqlarning ishtirokchilari ham bo'shatiladi.
   *
   * Usiz odamlar "suhbatda" holatida qolib, keyingi qo'ng'iroqqa
   * umuman kira olmasdi (sababi `releaseParticipants` da).
   */
  await releaseParticipants(closedIds);
}

/**
 * Qo'ng'iroqni topadi va foydalanuvchi unga aloqadorligini tekshiradi.
 *
 * ATAYLAB "topilmadi": begona odamga qo'ng'iroq mavjudligini bilish
 * imkonini bermaymiz.
 */
async function requireParticipant(callId: string, userId: string): Promise<CallRow> {
  const row = await prisma.call.findFirst({
    where: {
      id: callId,
      OR: [
        { callerId: userId },
        { calleeId: userId },
        /**
         * Guruhda ishtirokchilar alohida jadvalda.
         *
         * Chiqib ketganlar ham HISOBGA olinadi: ularning ekranida
         * suhbat tugagani ko'rinishi va tarixni ocha olishi kerak.
         */
        { participants: { some: { userId } } },
      ],
    },
    select: CALL_SELECT,
  });

  if (!row) {
    throw new NotFoundError("Qo'ng'iroq");
  }

  return row;
}

/**
 * Ikki kishilik qo'ng'iroqdagi ikkinchi tomonning ID'si.
 *
 * Guruhda bunday savol yo'q — u yerda signal aniq manzilga
 * yuboriladi (`relaySignal` ga qarang).
 */
function otherSide(row: CallRow, userId: string): string | null {
  return row.callerId === userId ? row.calleeId : row.callerId;
}

/**
 * Tugagan qo'ng'iroqning ishtirokchilarini BO'SHATADI.
 *
 * ── Nima uchun MAJBURIY ───────────────────────────────────────────────
 * `call_participants_one_live_per_user` indeksi bir odam bir vaqtda
 * faqat bitta suhbatda bo'lishini ta'minlaydi. Qo'ng'iroq tugaganda
 * ishtirokchilar "suhbatda" holatida qolib ketsa, o'sha odamlar
 * KEYINGI qo'ng'iroqqa umuman kira olmasdi — indeks ularni to'sardi.
 *
 * Ya'ni bitta tugallanmagan tozalash butun qo'ng'iroq tizimini
 * o'sha odamlar uchun abadiy o'chirib qo'yardi.
 */
async function releaseParticipants(callIds: readonly string[]): Promise<void> {
  if (callIds.length === 0) return;

  await prisma.callParticipant.updateMany({
    where: { callId: { in: [...callIds] }, status: { in: ['INVITED', 'JOINED'] } },
    data: {
      /**
       * Javob bermaganlar "rad etdi" emas, "chiqdi" deb yoziladi:
       * ular rad etmagan, suhbat ularsiz tugagan.
       */
      status: 'LEFT',
      leftAt: new Date(),
    },
  });
}

/** Hozir suhbatda turgan yoki chaqirilgan ishtirokchilarning ID'lari. */
function liveParticipantIds(row: CallRow, exceptUserId?: string): string[] {
  return row.participants
    .filter((participant) => participant.status === 'INVITED' || participant.status === 'JOINED')
    .map((participant) => participant.userId)
    .filter((id) => id !== exceptUserId);
}

/** Chaqiruvchining ko'rinadigan ismi. */
function callerName(row: CallRow): string {
  const person = row.caller;
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ');

  return fullName || (person.profile?.username ? `@${person.profile.username}` : 'Foydalanuvchi');
}

/**
 * Kelayotgan qo'ng'iroq haqida telefonga turtki yuboradi.
 *
 * Guruhda bir nechta odamga yuboriladi, shuning uchun qabul
 * qiluvchilar ro'yxati TASHQARIDAN beriladi.
 */
async function notifyIncomingCall(row: CallRow, recipientIds: readonly string[]): Promise<void> {
  const isVideo = row.kind === CallKind.VIDEO;

  const body = row.isGroup
    ? `${callerName(row)} «${row.conversation.title ?? 'Guruh'}» da qo'ng'iroq boshladi.`
    : `${callerName(row)} sizga qo'ng'iroq qilmoqda.`;

  await Promise.all(recipientIds.map((recipientId) => notifyOneIncoming(row, recipientId, isVideo, body)));
}

async function notifyOneIncoming(
  row: CallRow,
  recipientId: string,
  isVideo: boolean,
  body: string,
): Promise<void> {
  await sendPush(recipientId, {
    title: `${isVideo ? 'Video qo' : 'Qo'}'ng'iroq`,
    body,
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
  /**
   * Guruhda javobsiz qo'ng'iroq HAR BIR javob bermaganga yoziladi.
   *
   * Chaqiruvchining o'ziga yozilmaydi — u qo'ng'iroqni boshlagan
   * odam, unga "sizni chaqirishdi" deb aytish mantiqsiz.
   */
  const recipients = row.isGroup
    ? row.participants
        .filter((participant) => participant.status === 'INVITED' && participant.userId !== row.callerId)
        .map((participant) => participant.userId)
    : row.calleeId
      ? [row.calleeId]
      : [];

  await Promise.all(
    recipients.map((recipientId) =>
      notifyUser(recipientId, 'call.missed', {
        conversationId: row.conversationId,
        callerName: callerName(row),
        wasDeclined,
        isVideo: row.kind === CallKind.VIDEO,
      }),
    ),
  );
}

/**
 * Barcha tomonlarga holat o'zgarganini bildiradi.
 *
 * Ikki kishilik qo'ng'iroqda ikkitasiga, guruhda esa hamma
 * ishtirokchiga — jumladan chiqib ketganlarga ham: ularning ekranida
 * ham suhbat tugagani ko'rinishi kerak.
 */
async function broadcastState(row: CallRow): Promise<void> {
  const recipients = new Set<string>([row.callerId]);

  if (row.calleeId) recipients.add(row.calleeId);

  for (const participant of row.participants) {
    recipients.add(participant.userId);
  }

  await Promise.all(
    [...recipients].map((userId) => pushCallEvent(userId, { kind: 'state', call: toCallView(row, userId) })),
  );
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
  /**
   * Guruh bo'lsa — boshqa yo'l bilan.
   *
   * ── Nima uchun ayni SHU YERDA ─────────────────────────────────────
   * Brauzer "qo'ng'iroq qilaman" deydi va suhbat turini bilishi shart
   * emas. Turni server aniqlaydi: shunda brauzerda "bu guruhmi?"
   * degan shart takrorlanmaydi va u eskirmaydi ham.
   */
  if (conversation.kind === ConversationKind.GROUP) {
    return startGroupCall(callerId, input);
  }

  if (conversation.kind !== ConversationKind.DIRECT) {
    throw new ValidationError("Kompaniyaga qo'ng'iroq qilib bo'lmaydi. Xabar yozing.");
  }

  const calleeId = conversation.members.find((member) => member.userId !== callerId)?.userId;

  if (!calleeId) {
    throw new NotFoundError('Suhbatdosh');
  }

  /**
   * Qo'ng'iroq ham "kim menga yoza oladi" qoidasiga bo'ysunadi.
   *
   * Suhbat eski bo'lishi mumkin: odamlar oldin yozishgan, keyin biri
   * ikkinchisini bloklagan. Bloklangan odam esa telefonni
   * chaldirmasligi kerak — bu xabardan ko'ra bezovta qiluvchi amal.
   */
  await requireCanMessage(callerId, calleeId);

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
  void notifyIncomingCall(row, [calleeId]);

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

  await prisma.call.update({
    where: { id: callId },
    data: { status, endedAt, durationSeconds },
    select: { id: true },
  });

  /**
   * Ishtirokchilar bo'shatiladi — sababi `releaseParticipants` da.
   *
   * Bu qator qo'ng'iroq yopilgandan KEYIN va holat tarqatilishidan
   * OLDIN turadi: tarqatilgan ma'lumotda ishtirokchilar allaqachon
   * to'g'ri holatda bo'lishi kerak.
   */
  if (existing.isGroup) {
    await releaseParticipants([callId]);
  }

  const row = await prisma.call.findUniqueOrThrow({ where: { id: callId }, select: CALL_SELECT });

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

/**
 * Guruhda qo'ng'iroq boshlaydi.
 *
 * ── Nima uchun ALOHIDA funksiya ───────────────────────────────────────
 * `startCall` ikki tomonni qat'iy nazarda tutadi: kim chaqirdi, kimga.
 * Unga guruh mantiqini qo'shish har bir qatorda "bu guruhmi?" degan
 * shart qo'shishni talab qilardi va ikkala yo'l ham o'qib bo'lmas
 * holga kelardi.
 *
 * Umumiy narsalar (osilib qolganlarni tozalash, band tekshiruvi,
 * signal uzatish) baribir birga ishlatiladi.
 */
export async function startGroupCall(callerId: string, input: StartCallInput): Promise<CallView> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, kind: ConversationKind.GROUP, members: { some: { userId: callerId } } },
    select: {
      id: true,
      title: true,
      members: { select: { userId: true } },
    },
  });

  if (!conversation) {
    throw new NotFoundError('Guruh');
  }

  const limit = maxParticipants(input.kind);

  /**
   * Chegara GURUH a'zolari soni bo'yicha tekshiriladi, chaqirilganlar
   * bo'yicha emas.
   *
   * Aks holda 20 kishilik guruhda qo'ng'iroq boshlansa, birinchi
   * to'rttasi kirib, qolgani "joy yo'q" degan javobni suhbat
   * o'rtasida ko'rardi. Buni oldindan aytish halolroq.
   */
  if (conversation.members.length > limit) {
    throw new ValidationError(
      `${input.kind === 'VIDEO' ? 'Video' : 'Ovozli'} suhbatda eng ko'pi ${limit} kishi bo'lishi mumkin. ` +
        `Bu guruhda ${conversation.members.length} a'zo bor.`,
    );
  }

  const memberIds = conversation.members.map((member) => member.userId);

  await expireStaleCalls(memberIds);

  /**
   * Chaqiruvchi boshqa qo'ng'iroqda emasligi tekshiriladi.
   *
   * Qolgan a'zolar tekshirilmaydi: ular band bo'lsa, shunchaki
   * qo'shilmaydi. Butun qo'ng'iroqni bitta band odam uchun bekor
   * qilish noto'g'ri bo'lardi.
   */
  const busy = await prisma.call.findFirst({
    where: {
      status: { in: [CallStatus.RINGING, CallStatus.ACTIVE] },
      OR: [
        { callerId },
        { calleeId: callerId },
        { participants: { some: { userId: callerId, status: { in: ['INVITED', 'JOINED'] } } } },
      ],
    },
    select: { id: true },
  });

  if (busy) {
    throw new ConflictError("Sizda tugallanmagan qo'ng'iroq bor.");
  }

  let row: CallRow;

  try {
    row = await prisma.call.create({
      data: {
        conversationId: conversation.id,
        callerId,
        /**
         * "Kimga" ustuni BO'SH: guruhda aniq bitta qabul qiluvchi
         * yo'q (sababi sxemadagi izohda).
         */
        calleeId: null,
        isGroup: true,
        kind: input.kind,
        status: CallStatus.ACTIVE,
        /**
         * Guruh qo'ng'irog'i darhol "ketmoqda" holatida boshlanadi.
         *
         * ── Nima uchun "chalinmoqda" emas ─────────────────────────────
         * Ikki kishilikda qo'ng'iroq javob berilgandagina boshlanadi.
         * Guruhda esa boshlovchi hech kimni kutmasdan kirib turadi va
         * qolganlari birin-ketin qo'shiladi — xuddi haqiqiy xonaga
         * kirgandek.
         *
         * "Chalinmoqda" qilinsa, birinchi javob bergunicha boshlovchi
         * bo'sh ekranga qarab o'tirardi.
         */
        answeredAt: new Date(),
        participants: {
          create: [
            { userId: callerId, status: 'JOINED', joinedAt: new Date() },
            ...memberIds
              .filter((id) => id !== callerId)
              .map((userId) => ({ userId, status: 'INVITED' as const })),
          ],
        },
      },
      select: CALL_SELECT,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError("Qo'ng'iroq allaqachon boshlangan.");
    }

    throw error;
  }

  const invited = liveParticipantIds(row, callerId);

  await Promise.all(
    invited.map((userId) => pushCallEvent(userId, { kind: 'ring', call: toCallView(row, userId) })),
  );

  void notifyIncomingCall(row, invited);

  logger.info({ callId: row.id, callerId, invited: invited.length, kind: input.kind }, 'Guruh suhbati boshlandi');

  return toCallView(row, callerId);
}

/**
 * Guruh suhbatiga qo'shiladi.
 *
 * ── Nima uchun "javob berish" emas, "qo'shilish" ──────────────────────
 * Ikki kishilikda javob berish bir martalik hodisa: qo'ng'iroq
 * chalinadi, odam ko'taradi.
 *
 * Guruhda esa suhbat ochiq xona kabi: odam chiqib ketib, keyin
 * qaytishi mumkin. Shuning uchun bu amal takrorlanadigan.
 */
export async function joinGroupCall(callId: string, userId: string): Promise<CallView> {
  const existing = await requireParticipant(callId, userId);

  if (!existing.isGroup) {
    throw new ValidationError("Bu guruh qo'ng'irog'i emas.");
  }

  if (existing.status !== CallStatus.ACTIVE) {
    throw new ConflictError("Qo'ng'iroq tugagan.");
  }

  const joined = existing.participants.filter((participant) => participant.status === 'JOINED');
  const alreadyIn = joined.some((participant) => participant.userId === userId);

  if (!alreadyIn && joined.length >= maxParticipants(existing.kind)) {
    throw new ConflictError(
      `Suhbat to'lgan: eng ko'pi ${maxParticipants(existing.kind)} kishi bo'lishi mumkin.`,
    );
  }

  /**
   * `updateMany` — `update` emas.
   *
   * Ikkita qurilmadan bir vaqtda qo'shilishga urinilsa, ikkinchisi
   * "qator topilmadi" xatosi bilan tugardi.
   */
  await prisma.callParticipant.updateMany({
    where: { callId, userId },
    data: { status: 'JOINED', joinedAt: new Date(), leftAt: null },
  });

  const row = await requireParticipant(callId, userId);

  await broadcastState(row);

  logger.info({ callId, userId }, 'Guruh suhbatiga qo\'shildi');

  return toCallView(row, userId);
}

/**
 * Guruh suhbatidan chiqadi.
 *
 * ── Nima uchun qo'ng'iroq TUGAMAYDI ───────────────────────────────────
 * Ikki kishilikda bir tomon chiqsa, suhbat tugaydi — gaplashadigan
 * odam qolmaydi.
 *
 * Guruhda esa qolganlar davom etaveradi. Suhbat faqat OXIRGI odam
 * chiqqanda yopiladi.
 */
export async function leaveGroupCall(callId: string, userId: string): Promise<CallView> {
  const existing = await requireParticipant(callId, userId);

  if (!existing.isGroup) {
    throw new ValidationError("Bu guruh qo'ng'irog'i emas.");
  }

  const wasInvited = existing.participants.find((participant) => participant.userId === userId)?.status;

  await prisma.callParticipant.updateMany({
    where: { callId, userId },
    data: {
      /**
       * Javob bermasdan chiqqan odam "rad etdi" deb yoziladi.
       *
       * Farqi tarixda muhim: "qatnashmadi" va "rad etdi" boshqa-boshqa
       * narsa.
       */
      status: wasInvited === 'INVITED' ? 'DECLINED' : 'LEFT',
      leftAt: new Date(),
    },
  });

  const after = await requireParticipant(callId, userId);
  const stillIn = after.participants.filter((participant) => participant.status === 'JOINED');

  /**
   * Oxirgi odam chiqdi — suhbat yopiladi.
   *
   * Aks holda bo'sh suhbat "ketmoqda" holatida qolib, hamma uchun
   * "band" belgisini yoqib turardi.
   */
  if (stillIn.length === 0 && after.status === CallStatus.ACTIVE) {
    return endCall(callId, userId);
  }

  await broadcastState(after);

  logger.info({ callId, userId, remaining: stillIn.length }, 'Guruh suhbatidan chiqdi');

  return toCallView(after, userId);
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

  /**
   * Signalga YUBORUVCHI qo'shiladi.
   *
   * Guruhda bir vaqtda uchta turli ulanish muzokarasi ketadi va
   * qabul qiluvchi signal qaysi ulanishga tegishli ekanini bilishi
   * shart (sababi `call.types.ts` dagi `from` izohida).
   */
  const signal: CallSignal = { type: input.type, sdp: input.sdp, candidate: input.candidate, from: userId };

  /**
   * Manzil: guruhda so'rovda ko'rsatiladi, ikki kishilikda esa u
   * o'z-o'zidan ma'lum.
   */
  const targetId = row.isGroup ? input.to : otherSide(row, userId);

  if (!targetId) {
    throw new ValidationError("Signal kimga yuborilishi ko'rsatilmagan.");
  }

  /**
   * Manzil HAQIQATAN shu qo'ng'iroqda turganmi.
   *
   * Tekshiruvsiz begona odamning ID'sini yozib, unga signal yuborish
   * mumkin bo'lardi — ya'ni qo'ng'iroq tizimini boshqa odamlarga
   * xabar yuborish yo'liga aylantirish.
   */
  if (row.isGroup && !liveParticipantIds(row).includes(targetId)) {
    throw new ValidationError("Bu odam qo'ng'iroqda yo'q.");
  }

  await pushCallEvent(targetId, { kind: 'signal', callId, signal });
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
      OR: [
        { callerId: userId },
        { calleeId: userId },
        /**
         * Guruhda faqat HALI CHIQMAGANLAR qaytariladi.
         *
         * Chiqib ketgan odamning ekranida suhbat qaytadan ochilib
         * qolmasligi kerak — u ataylab chiqqan.
         */
        { participants: { some: { userId, status: { in: ['INVITED', 'JOINED'] } } } },
      ],
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
