import {
  Prisma,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
  WalletStatus,
} from '@/generated/prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { somToTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/modules/notification/notification.service';
import type { TopUpInput, TransactionQuery, TransferInput } from '@/modules/wallet/wallet.schemas';

/**
 * Hamyon — pul bilan bog'liq barcha amallar.
 *
 * ── Uchta asosiy xavf va ularning yechimi ─────────────────────────────
 *
 * 1. IKKI MARTA YECHILISH (double spend).
 *    Ikki so'rov bir vaqtda kelsa, ikkalasi ham eski balansni o'qib,
 *    ikkalasi ham "yetarli" deb hisoblashi mumkin. Yechim: tranzaksiya
 *    ichida `SELECT ... FOR UPDATE` bilan qatorni QULFLASH. Ikkinchi
 *    so'rov birinchisi tugaguncha kutadi va allaqachon yangilangan
 *    balansni ko'radi.
 *
 * 2. TAKRORIY SO'ROV (mijoz tugmani ikki marta bosdi).
 *    Har amalda `idempotencyKey` bo'ladi va u bazada UNIQUE. Bir xil
 *    kalit bilan kelgan ikkinchi so'rov yangi yozuv yaratmaydi —
 *    birinchisining natijasi qaytariladi.
 *
 * 3. MANFIY BALANS.
 *    Yechishdan oldin balans tekshiriladi. Tekshiruv qulf ichida
 *    bajarilgani uchun uni "chetlab o'tib" bo'lmaydi.
 *
 * Har bir amal ikki yozuv qoldiradi: `WalletTransaction` (moliyaviy hisob)
 * va audit jurnali (kim, qachon, qayerdan).
 */

/** Shu modul yaratgan tranzaksiyalar shu nom bilan belgilanadi. */
const SOURCE_MODULE = 'wallet';

export interface WalletTransactionPayload {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  /** Summa TIYINDA. Har doim musbat; yo'nalishni `direction` bildiradi. */
  amount: number;
  /** Amaldan keyingi balans, tiyinda. */
  balanceAfter: number;
  /** `in` — hamyonga kirdi, `out` — hamyondan chiqdi. */
  direction: 'in' | 'out';
  description: string | null;
  sourceModule: string;
  createdAt: Date;
  completedAt: Date | null;
}

export interface WalletSummaryPayload {
  id: string;
  /** Foydalanish mumkin bo'lgan balans, tiyinda. */
  balance: number;
  /** Buyurtma uchun band qilingan summa, tiyinda. */
  reserved: number;
  /** `balance - reserved` — hozir sarflash mumkin bo'lgan summa. */
  available: number;
  currency: string;
  status: WalletStatus;
  recentTransactions: WalletTransactionPayload[];
}

const TRANSACTION_SELECT = {
  id: true,
  type: true,
  direction: true,
  status: true,
  amount: true,
  balanceAfter: true,
  description: true,
  sourceModule: true,
  createdAt: true,
  completedAt: true,
} as const;

type TransactionRow = {
  id: string;
  type: TransactionType;
  direction: TransactionDirection;
  status: TransactionStatus;
  amount: bigint;
  balanceAfter: bigint;
  description: string | null;
  sourceModule: string;
  createdAt: Date;
  completedAt: Date | null;
};

/** Baza yozuvini API javobiga aylantiradi (`BigInt` -> `number`). */
function toTransactionPayload(row: TransactionRow): WalletTransactionPayload {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    amount: tiyinToNumber(row.amount),
    balanceAfter: tiyinToNumber(row.balanceAfter),
    direction: row.direction === TransactionDirection.IN ? 'in' : 'out',
    description: row.description,
    sourceModule: row.sourceModule,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}

/**
 * Foydalanuvchi hamyonini qaytaradi; bo'lmasa yaratadi.
 *
 * Nima uchun "kerak bo'lganda yaratish": ro'yxatdan o'tishda hamyon
 * yaratilmasligi mumkin (eski hisoblar, import qilingan foydalanuvchilar).
 * Shu funksiya orqali har doim hamyon mavjudligiga kafolat beramiz.
 */
export async function getOrCreateWallet(userId: string): Promise<{ id: string; status: WalletStatus }> {
  const existing = await prisma.wallet.findUnique({
    where: { userId },
    select: { id: true, status: true },
  });

  if (existing) return existing;

  try {
    return await prisma.wallet.create({
      data: { userId },
      select: { id: true, status: true },
    });
  } catch (error) {
    // Ikki so'rov bir vaqtda yaratmoqchi bo'lsa biri UNIQUE xatosini oladi —
    // bu xatolik emas, shunchaki ikkinchisi ulgurgan.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const wallet = await prisma.wallet.findUnique({
        where: { userId },
        select: { id: true, status: true },
      });

      if (wallet) return wallet;
    }

    throw error;
  }
}

/** Hamyon holati va oxirgi amallar. */
export async function getWalletSummary(userId: string, recentLimit = 5): Promise<WalletSummaryPayload> {
  await getOrCreateWallet(userId);

  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: {
      id: true,
      balance: true,
      reserved: true,
      currency: true,
      status: true,
      transactions: {
        select: TRANSACTION_SELECT,
        orderBy: { createdAt: 'desc' },
        take: recentLimit,
      },
    },
  });

  if (!wallet) {
    throw new NotFoundError('Hamyon');
  }

  return {
    id: wallet.id,
    balance: tiyinToNumber(wallet.balance),
    reserved: tiyinToNumber(wallet.reserved),
    available: tiyinToNumber(wallet.balance - wallet.reserved),
    currency: wallet.currency,
    status: wallet.status,
    recentTransactions: wallet.transactions.map(toTransactionPayload),
  };
}

/** Tranzaksiyalar tarixi — sahifalangan. */
export async function listTransactions(
  userId: string,
  query: TransactionQuery,
): Promise<{ transactions: WalletTransactionPayload[]; total: number }> {
  const wallet = await getOrCreateWallet(userId);
  const { skip, take } = toPrismaPagination(query);

  const where = {
    walletId: wallet.id,
    ...(query.type === 'ALL' ? {} : { type: query.type as TransactionType }),
  };

  const [rows, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      select: TRANSACTION_SELECT,
      orderBy: { createdAt: query.order },
      skip,
      take,
    }),
    prisma.walletTransaction.count({ where }),
  ]);

  return { transactions: rows.map(toTransactionPayload), total };
}

/**
 * Hamyon qatorini QULFLAB balansini o'qiydi.
 *
 * `FOR UPDATE` — PostgreSQL buyrug'i: shu qator tranzaksiya tugaguncha
 * boshqa hech kim tomonidan o'zgartirilmaydi. Aynan shu bir qator kod
 * ikki marta yechilishning oldini oladi.
 */
async function lockWallet(
  tx: Prisma.TransactionClient,
  walletId: string,
): Promise<{ balance: bigint; reserved: bigint; status: WalletStatus }> {
  const rows = await tx.$queryRaw<{ balance: bigint; reserved: bigint; status: WalletStatus }[]>`
    SELECT balance, reserved, status
    FROM wallets
    WHERE id = ${walletId}::uuid
    FOR UPDATE
  `;

  const row = rows[0];

  if (!row) {
    throw new NotFoundError('Hamyon');
  }

  return row;
}

/** Hamyon amal bajarishga tayyormi. */
function assertWalletUsable(status: WalletStatus): void {
  if (status === WalletStatus.FROZEN) {
    throw new ConflictError("Hamyoningiz muzlatilgan. Qo'llab-quvvatlash xizmatiga murojaat qiling.");
  }

  if (status === WalletStatus.CLOSED) {
    throw new ConflictError('Hamyoningiz yopilgan.');
  }
}

/**
 * Shu kalit bilan amal allaqachon bajarilganmi — tekshiradi.
 *
 * Bajarilgan bo'lsa o'shani qaytaradi: mijoz uchun natija bir xil bo'ladi,
 * lekin pul ikkinchi marta harakatlanmaydi.
 */
async function findByIdempotencyKey(key: string): Promise<WalletTransactionPayload | null> {
  const existing = await prisma.walletTransaction.findUnique({
    where: { idempotencyKey: key },
    select: TRANSACTION_SELECT,
  });

  return existing ? toTransactionPayload(existing) : null;
}

interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Hamyonni to'ldiradi.
 *
 * Hozircha to'lov provayderi SIMULYATSIYA qilinadi: real Payme/Click
 * integratsiyasi alohida bosqichda ulanadi. Shunga qaramay tranzaksiya
 * mantig'i (qulf, idempotentlik, audit) haqiqiy — provayder ulanganda
 * faqat "tasdiqlash" qismi almashadi.
 */
export async function topUp(
  userId: string,
  input: TopUpInput,
  meta: OperationMeta = {},
): Promise<WalletTransactionPayload> {
  const duplicate = await findByIdempotencyKey(input.idempotencyKey);
  if (duplicate) return duplicate;

  const wallet = await getOrCreateWallet(userId);
  assertWalletUsable(wallet.status);

  const amountTiyin = somToTiyin(input.amount);
  const methodLabel = input.method;

  const created = await prisma.$transaction(async (tx) => {
    const locked = await lockWallet(tx, wallet.id);
    assertWalletUsable(locked.status);

    const newBalance = locked.balance + amountTiyin;

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: TransactionType.TOP_UP,
        direction: TransactionDirection.IN,
        status: TransactionStatus.COMPLETED,
        amount: amountTiyin,
        balanceAfter: newBalance,
        description: `${methodLabel} orqali to'ldirildi`,
        idempotencyKey: input.idempotencyKey,
        externalReference: `SIM-${input.idempotencyKey.slice(0, 24)}`,
        sourceModule: SOURCE_MODULE,
        completedAt: new Date(),
      },
      select: TRANSACTION_SELECT,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.WALLET_TOP_UP,
    resourceType: 'Wallet',
    resourceId: wallet.id,
    module: SOURCE_MODULE,
    metadata: { amountTiyin: amountTiyin.toString(), method: input.method },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  // Tranzaksiyadan KEYIN — xabar yiqilsa ham pul joyida qoladi.
  await notifyUser(userId, 'wallet.topped_up', {
    amountTiyin: tiyinToNumber(amountTiyin),
    balanceTiyin: tiyinToNumber(created.balanceAfter),
  });

  logger.info({ userId, walletId: wallet.id, amount: input.amount }, "Hamyon to'ldirildi");

  return toTransactionPayload(created);
}

/**
 * Boshqa foydalanuvchiga pul o'tkazadi.
 *
 * Ikki hamyon bir vaqtda o'zgaradi, shuning uchun ikkalasi ham BITTA
 * tranzaksiya ichida qulflanadi. Qulflar HAR DOIM bir xil tartibda
 * (ID bo'yicha saralangan holda) olinadi — aks holda ikki o'tkazma
 * bir-birini kutib "o'lik qulf" (deadlock) hosil qilishi mumkin.
 */
export async function transfer(
  userId: string,
  input: TransferInput,
  meta: OperationMeta = {},
): Promise<WalletTransactionPayload> {
  const duplicate = await findByIdempotencyKey(input.idempotencyKey);
  if (duplicate) return duplicate;

  const recipient = await prisma.user.findUnique({
    where: { phone: input.phone },
    select: { id: true, firstName: true, lastName: true, deletedAt: true },
  });

  if (!recipient || recipient.deletedAt) {
    throw new NotFoundError('Bu raqam bilan foydalanuvchi');
  }

  if (recipient.id === userId) {
    throw new ValidationError("O'zingizga pul o'tkaza olmaysiz", {
      phone: ['Boshqa foydalanuvchining raqamini kiriting'],
    });
  }

  const [senderWallet, recipientWallet] = await Promise.all([
    getOrCreateWallet(userId),
    getOrCreateWallet(recipient.id),
  ]);

  assertWalletUsable(senderWallet.status);
  assertWalletUsable(recipientWallet.status);

  const amountTiyin = somToTiyin(input.amount);
  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, phone: true },
  });

  const recipientName = [recipient.firstName, recipient.lastName].filter(Boolean).join(' ') || input.phone;
  const senderName = [sender?.firstName, sender?.lastName].filter(Boolean).join(' ') || sender?.phone || '';

  // Deadlock'ning oldini olish uchun qulflar doim bir xil tartibda olinadi.
  const lockOrder = [senderWallet.id, recipientWallet.id].sort();

  const created = await prisma.$transaction(async (tx) => {
    const locked = new Map<string, { balance: bigint; reserved: bigint; status: WalletStatus }>();

    for (const walletId of lockOrder) {
      locked.set(walletId, await lockWallet(tx, walletId));
    }

    const senderState = locked.get(senderWallet.id)!;
    const recipientState = locked.get(recipientWallet.id)!;

    assertWalletUsable(senderState.status);
    assertWalletUsable(recipientState.status);

    const available = senderState.balance - senderState.reserved;

    if (available < amountTiyin) {
      throw new ConflictError("Hamyoningizda mablag' yetarli emas. Avval hisobni to'ldiring.");
    }

    const senderBalance = senderState.balance - amountTiyin;
    const recipientBalance = recipientState.balance + amountTiyin;

    await tx.wallet.update({ where: { id: senderWallet.id }, data: { balance: senderBalance } });
    await tx.wallet.update({ where: { id: recipientWallet.id }, data: { balance: recipientBalance } });

    // Qabul qiluvchi tomondagi yozuv — uning tarixida ko'rinishi uchun.
    await tx.walletTransaction.create({
      data: {
        walletId: recipientWallet.id,
        type: TransactionType.TRANSFER,
        direction: TransactionDirection.IN,
        status: TransactionStatus.COMPLETED,
        amount: amountTiyin,
        balanceAfter: recipientBalance,
        description: senderName ? `${senderName} dan o'tkazma` : "Kelgan o'tkazma",
        idempotencyKey: `${input.idempotencyKey}-in`,
        sourceModule: SOURCE_MODULE,
        sourceId: userId,
        completedAt: new Date(),
      },
    });

    // Yuboruvchi tomondagi yozuv — javobda shu qaytariladi.
    return tx.walletTransaction.create({
      data: {
        walletId: senderWallet.id,
        type: TransactionType.TRANSFER,
        direction: TransactionDirection.OUT,
        status: TransactionStatus.COMPLETED,
        amount: amountTiyin,
        balanceAfter: senderBalance,
        description: input.note ? `${recipientName} ga: ${input.note}` : `${recipientName} ga o'tkazma`,
        idempotencyKey: input.idempotencyKey,
        sourceModule: SOURCE_MODULE,
        sourceId: recipient.id,
        completedAt: new Date(),
      },
      select: TRANSACTION_SELECT,
    });
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.WALLET_TRANSFER,
    resourceType: 'Wallet',
    resourceId: senderWallet.id,
    module: SOURCE_MODULE,
    metadata: { amountTiyin: amountTiyin.toString(), recipientId: recipient.id },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  // Ikkala tomon ham xabardor bo'lishi kerak.
  await notifyUser(userId, 'wallet.transfer_sent', {
    amountTiyin: tiyinToNumber(amountTiyin),
    recipientName,
  });

  await notifyUser(recipient.id, 'wallet.transfer_received', {
    amountTiyin: tiyinToNumber(amountTiyin),
    senderName: senderName || 'Navix foydalanuvchisi',
  });

  logger.info(
    { userId, recipientId: recipient.id, amount: input.amount },
    "Foydalanuvchilar o'rtasida o'tkazma bajarildi",
  );

  return toTransactionPayload(created);
}

/**
 * Hamyondan xizmat uchun pul yechadi — BOSHQA MODULLAR ishlatadi.
 *
 * ── Nima uchun alohida eksport ────────────────────────────────────────
 * To'lovlar, taksi, ovqat yetkazish — hammasi hamyondan pul yechadi.
 * Har biri o'zicha yozsa, qulflash va tekshiruv mantig'i takrorlanadi va
 * bir joyda xato qilinsa pul yo'qoladi. Shuning uchun bitta joyda.
 *
 * ── Nima uchun `tx` tashqaridan keladi ────────────────────────────────
 * Chaqiruvchi modulning o'z yozuvi (masalan `ServicePayment`) va pul
 * yechish BIR tranzaksiyada bo'lishi shart. Aks holda pul yechilib,
 * buyurtma yozilmay qolishi mumkin.
 *
 * Chaqiruvchi tranzaksiyani o'zi ochadi va shu funksiyaga uzatadi.
 */
export async function chargeWallet(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    walletId: string;
    /** Summa TIYINDA, musbat. */
    amountTiyin: bigint;
    description: string;
    /** Qaysi modul: "payments", "taxi". */
    sourceModule: string;
    /** Shu moduldagi obyekt ID'si. */
    sourceId: string;
    idempotencyKey: string;
  },
): Promise<{ id: string; balanceAfter: bigint }> {
  if (params.amountTiyin <= 0n) {
    throw new ValidationError("Summa noldan katta bo'lishi kerak");
  }

  const locked = await lockWallet(tx, params.walletId);
  assertWalletUsable(locked.status);

  const available = locked.balance - locked.reserved;

  if (available < params.amountTiyin) {
    throw new ConflictError("Hamyoningizda mablag' yetarli emas. Avval hisobni to'ldiring.");
  }

  const balanceAfter = locked.balance - params.amountTiyin;

  await tx.wallet.update({ where: { id: params.walletId }, data: { balance: balanceAfter } });

  const transaction = await tx.walletTransaction.create({
    data: {
      walletId: params.walletId,
      type: TransactionType.PAYMENT,
      direction: TransactionDirection.OUT,
      status: TransactionStatus.COMPLETED,
      amount: params.amountTiyin,
      balanceAfter,
      description: params.description,
      idempotencyKey: params.idempotencyKey,
      sourceModule: params.sourceModule,
      sourceId: params.sourceId,
      completedAt: new Date(),
    },
    select: { id: true },
  });

  return { id: transaction.id, balanceAfter };
}

/**
 * Hamyonga pulni QAYTARADI — `chargeWallet` ning teskarisi.
 *
 * ── Nima uchun `chargeWallet` ga `-amountTiyin` berilmaydi ────────────
 * Manfiy summa bilan chaqirish vasvasasi bor, lekin bu xato bo'lardi:
 * yechishda balans yetarlimi degan tekshiruv bor, qaytarishda esa yo'q;
 * yozuv turi ham boshqa (`REFUND`, yo'nalish `IN`). Ikkalasini bitta
 * funksiyaga tiqish shartlar chalkashuviga olib kelardi.
 *
 * ── Nima uchun MUZLATILGAN hamyonga qaytariladi ───────────────────────
 * Muzlatish — pulni SARFLASHNI to'xtatadi, egalikni emas. Qaytarilayotgan
 * pul foydalanuvchining o'zinikidir; uni qaytarmaslik pulni o'zlashtirish
 * bo'lardi. Sarflash baribir bloklangan holicha qoladi.
 *
 * YOPILGAN hamyon boshqa masala: u yerda tranzaksiya yozib bo'lmaydi,
 * shuning uchun xatolik qaytadi va pul boshqa yo'l bilan beriladi.
 */
export async function refundWallet(
  tx: Prisma.TransactionClient,
  params: {
    walletId: string;
    /** Summa TIYINDA, musbat. */
    amountTiyin: bigint;
    description: string;
    sourceModule: string;
    sourceId: string;
    idempotencyKey: string;
  },
): Promise<{ id: string; balanceAfter: bigint }> {
  if (params.amountTiyin <= 0n) {
    throw new ValidationError("Summa noldan katta bo'lishi kerak");
  }

  const locked = await lockWallet(tx, params.walletId);

  if (locked.status === WalletStatus.CLOSED) {
    throw new ConflictError("Hamyon yopilgan — pulni qaytarib bo'lmaydi.");
  }

  const balanceAfter = locked.balance + params.amountTiyin;

  await tx.wallet.update({ where: { id: params.walletId }, data: { balance: balanceAfter } });

  const transaction = await tx.walletTransaction.create({
    data: {
      walletId: params.walletId,
      type: TransactionType.REFUND,
      direction: TransactionDirection.IN,
      status: TransactionStatus.COMPLETED,
      amount: params.amountTiyin,
      balanceAfter,
      description: params.description,
      idempotencyKey: params.idempotencyKey,
      sourceModule: params.sourceModule,
      sourceId: params.sourceId,
      completedAt: new Date(),
    },
    select: { id: true },
  });

  return { id: transaction.id, balanceAfter };
}

/**
 * Takroriy so'rovni aniqlaydi — boshqa modullar uchun.
 *
 * @returns Shu kalit bilan amal allaqachon bajarilgan bo'lsa uning ID'si.
 */
export async function findTransactionByIdempotencyKey(key: string): Promise<{ sourceId: string | null } | null> {
  return prisma.walletTransaction.findUnique({
    where: { idempotencyKey: key },
    select: { sourceId: true },
  });
}

/**
 * Qabul qiluvchini o'tkazmadan OLDIN tekshiradi.
 *
 * Nima uchun alohida: foydalanuvchi raqamni kiritishi bilan "kimga
 * yuborayotganini" ko'rishi kerak. Aks holda bitta xato raqam tufayli
 * pul begonaga ketadi.
 *
 * Xavfsizlik: faqat ISM qaytariladi. Telefon raqami bo'yicha begona
 * odamning boshqa ma'lumotlarini bilib olish mumkin emas.
 */
export async function lookupTransferRecipient(
  userId: string,
  phone: string,
): Promise<{ name: string; isSelf: boolean }> {
  const recipient = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, firstName: true, lastName: true, deletedAt: true },
  });

  if (!recipient || recipient.deletedAt) {
    throw new NotFoundError('Bu raqam bilan foydalanuvchi');
  }

  return {
    name: [recipient.firstName, recipient.lastName].filter(Boolean).join(' ') || 'Navix foydalanuvchisi',
    isSelf: recipient.id === userId,
  };
}
