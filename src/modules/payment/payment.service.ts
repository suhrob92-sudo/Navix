import { Prisma, ServiceCategory, ServicePaymentStatus, type ServiceProvider } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { clientIdempotencyKey, runIdempotent } from '@/lib/idempotency';
import { logger } from '@/lib/logger';
import { somToTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/modules/notification/notification.service';
import { chargeWallet, getOrCreateWallet, refundWallet } from '@/modules/wallet/wallet.service';
import type {
  CreatePaymentInput,
  CreateSavedAccountInput,
  PaymentHistoryQuery,
  ProviderQuery,
} from '@/modules/payment/payment.schemas';

/**
 * Xizmat to'lovlari — kommunal, internet, mobil aloqa, TV.
 *
 * ── Asosiy qoida ──────────────────────────────────────────────────────
 * Pul yechish va to'lov yozuvini yaratish BITTA tranzaksiyada bajariladi.
 * Aks holda pul yechilib, to'lov yozilmay qolishi mumkin — foydalanuvchi
 * pulini yo'qotadi va isbotlay olmaydi.
 *
 * ── Provayder bilan aloqa ─────────────────────────────────────────────
 * Hozircha provayderga so'rov SIMULYATSIYA qilinadi. Real integratsiyada
 * shu joyga tashqi API chaqiruvi qo'shiladi va to'lov `PENDING` holatida
 * qolib, javob kelgach `COMPLETED` bo'ladi. Shuning uchun holat maydoni
 * allaqachon mavjud.
 */

const SOURCE_MODULE = 'payments';

/** Bitta foydalanuvchi saqlashi mumkin bo'lgan hisoblar chegarasi. */
const MAX_SAVED_ACCOUNTS = 30;

export interface ProviderPayload {
  id: string;
  code: string;
  name: string;
  category: ServiceCategory;
  description: string | null;
  accountLabel: string;
  accountHint: string;
  /** Chegaralar TIYINDA. */
  minAmount: number;
  maxAmount: number;
  color: string;
}

export interface SavedAccountPayload {
  id: string;
  accountNumber: string;
  label: string;
  provider: ProviderPayload;
  createdAt: Date;
}

export interface PaymentPayload {
  id: string;
  accountNumber: string;
  /** Summa TIYINDA. */
  amount: number;
  status: ServicePaymentStatus;
  receiptNumber: string;
  failureReason: string | null;
  provider: ProviderPayload;
  createdAt: Date;
  completedAt: Date | null;
}

const PROVIDER_SELECT = {
  id: true,
  code: true,
  name: true,
  category: true,
  description: true,
  accountLabel: true,
  accountHint: true,
  minAmount: true,
  maxAmount: true,
  color: true,
} as const;

type ProviderRow = Pick<
  ServiceProvider,
  | 'id'
  | 'code'
  | 'name'
  | 'category'
  | 'description'
  | 'accountLabel'
  | 'accountHint'
  | 'minAmount'
  | 'maxAmount'
  | 'color'
>;

function toProviderPayload(row: ProviderRow): ProviderPayload {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    description: row.description,
    accountLabel: row.accountLabel,
    accountHint: row.accountHint,
    minAmount: tiyinToNumber(row.minAmount),
    maxAmount: tiyinToNumber(row.maxAmount),
    color: row.color,
  };
}

/** Faol provayderlar ro'yxati. */
export async function listProviders(query: ProviderQuery): Promise<ProviderPayload[]> {
  const providers = await prisma.serviceProvider.findMany({
    where: {
      isActive: true,
      ...(query.category === 'ALL' ? {} : { category: query.category as ServiceCategory }),
    },
    select: PROVIDER_SELECT,
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  });

  return providers.map(toProviderPayload);
}

/** Bitta provayder. Faol bo'lmasa — topilmadi. */
export async function getProvider(providerId: string): Promise<ProviderPayload> {
  const provider = await prisma.serviceProvider.findFirst({
    where: { id: providerId, isActive: true },
    select: PROVIDER_SELECT,
  });

  if (!provider) {
    throw new NotFoundError('Xizmat');
  }

  return toProviderPayload(provider);
}

/**
 * Hisob raqami provayder talabiga mos keladimi.
 *
 * Naqsh bazadan keladi, shuning uchun uni ehtiyotkorlik bilan qo'llaymiz:
 * noto'g'ri yozilgan naqsh butun so'rovni yiqitmasligi kerak.
 */
function assertAccountNumberValid(provider: { accountRegex: string; accountHint: string }, value: string): void {
  let pattern: RegExp;

  try {
    pattern = new RegExp(provider.accountRegex);
  } catch {
    logger.error({ regex: provider.accountRegex }, "Provayder naqshi noto'g'ri yozilgan");
    // Naqsh buzuq bo'lsa to'lovni to'xtatamiz — noto'g'ri hisobga pul
    // ketgandan ko'ra xato qaytargan yaxshi.
    throw new ConflictError("Bu xizmat vaqtincha ishlamayapti. Keyinroq urinib ko'ring.");
  }

  if (!pattern.test(value)) {
    throw new ValidationError("Hisob raqami noto'g'ri", {
      accountNumber: [`Namuna: ${provider.accountHint}`],
    });
  }
}

/** Chek raqamini yaratadi: NVX-20260803-8F3A21 */
function generateReceiptNumber(): string {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('');

  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `NVX-${stamp}-${random}`;
}

// ── Saqlangan hisoblar ────────────────────────────────────────────────

const SAVED_ACCOUNT_SELECT = {
  id: true,
  accountNumber: true,
  label: true,
  createdAt: true,
  provider: { select: PROVIDER_SELECT },
} as const;

export async function listSavedAccounts(userId: string): Promise<SavedAccountPayload[]> {
  const accounts = await prisma.savedAccount.findMany({
    where: { userId, deletedAt: null, provider: { isActive: true } },
    select: SAVED_ACCOUNT_SELECT,
    orderBy: { createdAt: 'desc' },
  });

  return accounts.map((account) => ({
    id: account.id,
    accountNumber: account.accountNumber,
    label: account.label,
    provider: toProviderPayload(account.provider),
    createdAt: account.createdAt,
  }));
}

export async function createSavedAccount(
  userId: string,
  input: CreateSavedAccountInput,
): Promise<SavedAccountPayload> {
  const provider = await prisma.serviceProvider.findFirst({
    where: { id: input.providerId, isActive: true },
    select: { ...PROVIDER_SELECT, accountRegex: true },
  });

  if (!provider) {
    throw new NotFoundError('Xizmat');
  }

  assertAccountNumberValid(provider, input.accountNumber);

  const existingCount = await prisma.savedAccount.count({ where: { userId, deletedAt: null } });

  if (existingCount >= MAX_SAVED_ACCOUNTS) {
    throw new ConflictError(
      `Ko'pi bilan ${MAX_SAVED_ACCOUNTS} ta hisob saqlash mumkin. Keraksizlarini o'chiring.`,
    );
  }

  try {
    const account = await prisma.savedAccount.upsert({
      where: {
        userId_providerId_accountNumber: {
          userId,
          providerId: input.providerId,
          accountNumber: input.accountNumber,
        },
      },
      // Ilgari o'chirilgan bo'lsa — tiklaymiz, dublikat yaratmaymiz.
      update: { label: input.label, deletedAt: null },
      create: {
        userId,
        providerId: input.providerId,
        accountNumber: input.accountNumber,
        label: input.label,
      },
      select: SAVED_ACCOUNT_SELECT,
    });

    return {
      id: account.id,
      accountNumber: account.accountNumber,
      label: account.label,
      provider: toProviderPayload(account.provider),
      createdAt: account.createdAt,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('Bu hisob allaqachon saqlangan');
    }

    throw error;
  }
}

/** Saqlangan hisobni o'chiradi (yumshoq — tarix buzilmasligi uchun). */
export async function deleteSavedAccount(userId: string, accountId: string): Promise<void> {
  const account = await prisma.savedAccount.findFirst({
    where: { id: accountId, userId, deletedAt: null },
    select: { id: true },
  });

  if (!account) {
    throw new NotFoundError('Saqlangan hisob');
  }

  await prisma.savedAccount.update({
    where: { id: account.id },
    data: { deletedAt: new Date() },
  });
}

// ── To'lov ────────────────────────────────────────────────────────────

const PAYMENT_SELECT = {
  id: true,
  accountNumber: true,
  amount: true,
  status: true,
  receiptNumber: true,
  failureReason: true,
  createdAt: true,
  completedAt: true,
  provider: { select: PROVIDER_SELECT },
} as const;

type PaymentRow = {
  id: string;
  accountNumber: string;
  amount: bigint;
  status: ServicePaymentStatus;
  receiptNumber: string;
  failureReason: string | null;
  createdAt: Date;
  completedAt: Date | null;
  provider: ProviderRow;
};

function toPaymentPayload(row: PaymentRow): PaymentPayload {
  return {
    id: row.id,
    accountNumber: row.accountNumber,
    amount: tiyinToNumber(row.amount),
    status: row.status,
    receiptNumber: row.receiptNumber,
    failureReason: row.failureReason,
    provider: toProviderPayload(row.provider),
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}

interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Xizmat uchun to'lov qiladi.
 *
 * Ketma-ketlik:
 *  1. Takroriy so'rov emasligini tekshiramiz (idempotencyKey);
 *  2. Provayder va hisob raqamini tekshiramiz;
 *  3. Summa provayder chegarasiga mos kelishini tekshiramiz;
 *  4. BITTA tranzaksiyada: hamyondan pul yechamiz + to'lov yozuvini yaratamiz;
 *  5. Audit yozuvini qoldiramiz.
 */
export async function createPayment(
  userId: string,
  input: CreatePaymentInput,
  meta: OperationMeta = {},
): Promise<PaymentPayload> {
  /**
   * Bir vaqtda kelgan takroriy so'rov.
   *
   * Ichkaridagi "takror bo'lsa qaytaramiz" tekshiruvi ketma-ket
   * so'rovlar uchun yetarli. Ikkita so'rov BIR VAQTDA kelsa esa
   * ikkalasi ham "yo'q" deb ko'rardi va ikkinchisi yagona indeksga
   * urilib, 500 qaytarardi.
   *
   * Sekin internetda bu ENG QIMMAT xato: ilova "xatolik" deb
   * ko'rsatadi, odam yangi kalit bilan qaytadan to'laydi va pul IKKI
   * MARTA ketadi. Boshqa pul modullari allaqachon shu himoyada edi,
   * xizmat to'lovi esa e'tibordan chetda qolgan.
   */
  return runIdempotent(
    () => performCreatePayment(userId, input, meta),
    () => findExistingPayment(userId, input.idempotencyKey),
  );
}

/** Kalit bo'yicha allaqachon bajarilgan to'lovni topadi. */
async function findExistingPayment(userId: string, rawKey: string): Promise<PaymentPayload | null> {
  const transaction = await prisma.walletTransaction.findUnique({
    where: { idempotencyKey: clientIdempotencyKey(userId, rawKey) },
    select: { sourceId: true },
  });

  if (!transaction?.sourceId) return null;

  const existing = await prisma.servicePayment.findUnique({
    where: { id: transaction.sourceId },
    select: PAYMENT_SELECT,
  });

  return existing ? toPaymentPayload(existing) : null;
}

async function performCreatePayment(
  userId: string,
  input: CreatePaymentInput,
  meta: OperationMeta,
): Promise<PaymentPayload> {
  // 1. Takror bo'lsa — eski natijani qaytaramiz, pul ikkinchi marta ketmaydi.
  const duplicate = await findExistingPayment(userId, input.idempotencyKey);

  if (duplicate) return duplicate;

  // 2. Provayder va hisob raqami.
  const provider = await prisma.serviceProvider.findFirst({
    where: { id: input.providerId, isActive: true },
    select: { ...PROVIDER_SELECT, accountRegex: true },
  });

  if (!provider) {
    throw new NotFoundError('Xizmat');
  }

  assertAccountNumberValid(provider, input.accountNumber);

  // 3. Summa chegaralari — har provayderda o'zinikicha.
  const amountTiyin = somToTiyin(input.amount);

  if (amountTiyin < provider.minAmount || amountTiyin > provider.maxAmount) {
    throw new ValidationError("Summa noto'g'ri", {
      amount: [
        `${provider.name} uchun ${tiyinToNumber(provider.minAmount) / 100} dan ` +
          `${tiyinToNumber(provider.maxAmount) / 100} so'mgacha to'lash mumkin`,
      ],
    });
  }

  const wallet = await getOrCreateWallet(userId);
  const receiptNumber = generateReceiptNumber();

  // 4. Pul yechish va to'lov yozuvi — ajralmas juftlik.
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.servicePayment.create({
      data: {
        userId,
        providerId: provider.id,
        accountNumber: input.accountNumber,
        amount: amountTiyin,
        status: ServicePaymentStatus.COMPLETED,
        receiptNumber,
        externalReference: `SIM-${receiptNumber}`,
        completedAt: new Date(),
      },
      select: { id: true },
    });

    const charge = await chargeWallet(tx, {
      userId,
      walletId: wallet.id,
      amountTiyin,
      description: `${provider.name} — ${input.accountNumber}`,
      sourceModule: SOURCE_MODULE,
      sourceId: created.id,
      idempotencyKey: clientIdempotencyKey(userId, input.idempotencyKey),
    });

    // Hamyondagi yozuv bilan bog'laymiz — chekda ikkalasi ko'rinadi.
    return tx.servicePayment.update({
      where: { id: created.id },
      data: { walletTransactionId: charge.id },
      select: PAYMENT_SELECT,
    });
  });

  // Hisobni saqlash — to'lov muvaffaqiyatli bo'lgandan KEYIN.
  // Saqlash xatosi to'lovni bekor qilmasligi kerak.
  if (input.saveAccount) {
    try {
      await createSavedAccount(userId, {
        providerId: provider.id,
        accountNumber: input.accountNumber,
        label: input.accountLabel ?? provider.name,
      });
    } catch (error) {
      logger.warn({ err: error, userId }, "Hisobni saqlab bo'lmadi, lekin to'lov bajarildi");
    }
  }

  await recordAudit({
    actorId: userId,
    action: AuditAction.SERVICE_PAYMENT,
    resourceType: 'ServicePayment',
    resourceId: payment.id,
    module: SOURCE_MODULE,
    metadata: {
      amountTiyin: amountTiyin.toString(),
      provider: provider.code,
      receiptNumber,
    },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  await notifyUser(userId, 'payment.completed', {
    amountTiyin: tiyinToNumber(amountTiyin),
    providerName: provider.name,
    paymentId: payment.id,
  });

  logger.info({ userId, provider: provider.code, amount: input.amount }, "Xizmat to'lovi bajarildi");

  return toPaymentPayload(payment);
}

/**
 * To'lovni bekor qilib, pulni hamyonga qaytaradi.
 *
 * ── Kim chaqiradi ─────────────────────────────────────────────────────
 * Admin panel (`PATCH /api/v1/admin/payments/{id}/refund`). Foydalanuvchi
 * o'zi qaytara olmaydi: provayderga pul ketgan-ketmaganini faqat xodim
 * tekshira oladi.
 *
 * ── Ikki marta qaytarilishining oldini olish ──────────────────────────
 * Idempotentlik kaliti mijozdan OLINMAYDI — u to'lov ID'sidan
 * hisoblanadi: `refund-{paymentId}`. Ustun bazada UNIQUE bo'lgani uchun
 * ikkinchi urinish DARAJADA to'xtaydi, hatto ikki xodim bir vaqtda
 * bosgan bo'lsa ham. Bu holat kodda emas, BAZADA kafolatlanadi.
 *
 * Holat tekshiruvi ham tranzaksiya ICHIDA, `updateMany` shartida
 * takrorlanadi: shunda "tekshirdim → boshqasi o'zgartirdi → yozdim"
 * (TOCTOU) oralig'i qolmaydi.
 */
export async function refundPayment(
  actorId: string,
  paymentId: string,
  reason: string,
  meta: OperationMeta = {},
): Promise<PaymentPayload> {
  const payment = await prisma.servicePayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      userId: true,
      amount: true,
      status: true,
      receiptNumber: true,
      provider: { select: { name: true } },
    },
  });

  if (!payment) {
    throw new NotFoundError("To'lov");
  }

  if (payment.status === ServicePaymentStatus.REFUNDED) {
    throw new ConflictError("Bu to'lov allaqachon qaytarilgan");
  }

  if (payment.status !== ServicePaymentStatus.COMPLETED) {
    throw new ConflictError("Faqat bajarilgan to'lovni qaytarish mumkin");
  }

  const wallet = await getOrCreateWallet(payment.userId);
  const idempotencyKey = `refund-${payment.id}`;

  const refunded = await prisma.$transaction(async (tx) => {
    /**
     * Holatni yana bir bor, lekin bu safar QULF ostida tekshiramiz.
     * `updateMany` faqat hali COMPLETED bo'lgan qatorni yangilaydi;
     * boshqa so'rov ulgurgan bo'lsa `count` nolga teng bo'ladi.
     */
    const claimed = await tx.servicePayment.updateMany({
      where: { id: payment.id, status: ServicePaymentStatus.COMPLETED },
      data: {
        status: ServicePaymentStatus.REFUNDED,
        refundedAt: new Date(),
        refundReason: reason,
        refundedById: actorId,
      },
    });

    if (claimed.count === 0) {
      throw new ConflictError("Bu to'lov allaqachon qaytarilgan");
    }

    const credit = await refundWallet(tx, {
      walletId: wallet.id,
      amountTiyin: payment.amount,
      description: `${payment.provider.name} — to'lov qaytarildi`,
      sourceModule: SOURCE_MODULE,
      sourceId: payment.id,
      idempotencyKey,
    });

    return tx.servicePayment.update({
      where: { id: payment.id },
      data: { refundTransactionId: credit.id },
      select: PAYMENT_SELECT,
    });
  });

  await recordAudit({
    actorId,
    action: AuditAction.SERVICE_PAYMENT_REFUNDED,
    resourceType: 'ServicePayment',
    resourceId: payment.id,
    module: SOURCE_MODULE,
    metadata: {
      amountTiyin: payment.amount.toString(),
      receiptNumber: payment.receiptNumber,
      customerId: payment.userId,
      reason,
    },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  await notifyUser(payment.userId, 'payment.refunded', {
    amountTiyin: tiyinToNumber(payment.amount),
    providerName: payment.provider.name,
    paymentId: payment.id,
  });

  logger.warn(
    { actorId, paymentId: payment.id, customerId: payment.userId, amount: payment.amount.toString() },
    "To'lov qaytarildi",
  );

  return toPaymentPayload(refunded);
}

/** To'lovlar tarixi — sahifalangan. */
export async function listPayments(
  userId: string,
  query: PaymentHistoryQuery,
): Promise<{ payments: PaymentPayload[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  const where = {
    userId,
    ...(query.status === 'ALL' ? {} : { status: query.status as ServicePaymentStatus }),
  };

  const [rows, total] = await Promise.all([
    prisma.servicePayment.findMany({
      where,
      select: PAYMENT_SELECT,
      orderBy: { createdAt: query.order },
      skip,
      take,
    }),
    prisma.servicePayment.count({ where }),
  ]);

  return { payments: rows.map(toPaymentPayload), total };
}

/** Bitta to'lov — chek uchun. Boshqa foydalanuvchi to'lovi ko'rinmaydi. */
export async function getPayment(userId: string, paymentId: string): Promise<PaymentPayload> {
  const payment = await prisma.servicePayment.findFirst({
    where: { id: paymentId, userId },
    select: PAYMENT_SELECT,
  });

  if (!payment) {
    throw new NotFoundError("To'lov");
  }

  return toPaymentPayload(payment);
}
