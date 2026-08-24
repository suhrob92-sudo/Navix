import { Prisma, ReturnReason, ReturnStatus } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { AuditAction, recordAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import {
  RETURN_BLOCK_TEXT,
  calculateRefund,
  checkReturnEligibility,
  refundsDeliveryFee,
  type ReturnReasonName,
  type ReturnStatusName,
} from '@/config/order-return';
import { notifyUser } from '@/modules/notification/notification.service';
import { getOrCreateWallet, refundWallet } from '@/modules/wallet/wallet.service';
import type { CreateReturnInput, DecideReturnInput } from '@/modules/market/return.schemas';
import type { ReturnRequestView } from '@/modules/market/return.types';

/**
 * Mahsulotni qaytarish.
 *
 * ── Nima uchun pul SO'ROV PAYTIDA hisoblanadi ─────────────────────────
 * Summani sotuvchi tasdiqlaganda hisoblash ham mumkin edi.
 *
 * Lekin o'shanda xaridor "qancha qaytadi?" degan savolga javob
 * bilmasdan so'rov yuborardi va keyin kutilmagan raqamni ko'rardi.
 *
 * Hisob `market_order_items` dagi MUZLATILGAN narxlardan qilinadi —
 * ular hech qachon o'zgarmaydi, ya'ni so'rov paytida ko'rsatilgan
 * summa tasdiqlash paytida ham o'sha bo'ladi.
 *
 * ── Nima uchun ZAXIRA avtomatik tiklanmaydi ───────────────────────────
 * Bekor qilishda zaxira tiklanadi: mahsulot omborni tark etmagan.
 *
 * Qaytarishda esa boshqacha: mahsulot xaridorda va uning HOLATI
 * noma'lum. Buzilgan telefonni avtomatik ravishda sotuvga qaytarish
 * keyingi xaridorga o'sha buzuq telefonni jo'natish demak.
 *
 * Shuning uchun zaxirani sotuvchi O'ZI qo'shadi — faqat u
 * mahsulotni ko'rib, holatini baholay oladi.
 */

/** So'rov haqidagi qo'shimcha ma'lumot — tekshiruv yozuvi uchun. */
interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const MODULE = 'market';

const REQUEST_SELECT = {
  id: true,
  orderId: true,
  status: true,
  reason: true,
  comment: true,
  amount: true,
  createdAt: true,
  decidedAt: true,
  decisionNote: true,
  order: {
    select: {
      orderNumber: true,
      deliveryFee: true,
      shop: { select: { name: true } },
      user: { select: { firstName: true, lastName: true } },
    },
  },
  items: {
    select: {
      orderItemId: true,
      quantity: true,
      orderItem: { select: { name: true, variantLabel: true, unitPrice: true } },
    },
  },
} satisfies Prisma.ReturnRequestSelect;

type RequestRow = Prisma.ReturnRequestGetPayload<{ select: typeof REQUEST_SELECT }>;

function toView(row: RequestRow): ReturnRequestView {
  const items = row.items.map((item) => ({
    orderItemId: item.orderItemId,
    name: item.orderItem.name,
    variantLabel: item.orderItem.variantLabel,
    unitPrice: tiyinToNumber(item.orderItem.unitPrice),
    quantity: item.quantity,
  }));

  const goods = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const name = [row.order.user.firstName, row.order.user.lastName].filter(Boolean).join(' ');

  return {
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.order.orderNumber,
    status: row.status as ReturnStatusName,
    reason: row.reason as ReturnReasonName,
    comment: row.comment,
    amount: tiyinToNumber(row.amount),
    /*
      Yetkazish haqi kirganini QAYTA hisoblamaymiz — saqlangan
      summani mahsulotlar narxi bilan solishtiramiz.

      Shu tufayli ekrandagi yozuv har doim HAQIQIY summaga mos
      keladi, hatto qoida keyinchalik o'zgarsa ham.
    */
    includesDeliveryFee: tiyinToNumber(row.amount) > goods,
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
    decisionNote: row.decisionNote,
    items,
    customerName: name || null,
    shopName: row.order.shop.name,
  };
}

/**
 * Xaridor qaytarish so'rovini yuboradi.
 */
export async function createReturn(
  userId: string,
  orderId: string,
  input: CreateReturnInput,
  meta: OperationMeta = {},
): Promise<ReturnRequestView> {
  const order = await prisma.marketOrder.findFirst({
    where: { id: orderId, userId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      deliveredAt: true,
      deliveryFee: true,
      shop: { select: { name: true, ownerId: true } },
      items: { select: { id: true, quantity: true, unitPrice: true, name: true } },
      returnRequest: { select: { id: true } },
    },
  });

  if (!order) {
    throw new NotFoundError('Buyurtma');
  }

  const eligibility = checkReturnEligibility(
    {
      status: order.status,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      hasReturnRequest: order.returnRequest !== null,
    },
  );

  if (!eligibility.canRequest) {
    throw new ConflictError(RETURN_BLOCK_TEXT[eligibility.reason ?? 'NOT_DELIVERED']);
  }

  const itemById = new Map(order.items.map((item) => [item.id, item]));

  /*
    Har bir qator TEKSHIRILADI: so'rov brauzerdan keladi va unda
    boshqa buyurtmaning qatori yoki haddan ortiq son bo'lishi
    mumkin.
  */
  const lines = input.items.map((requested) => {
    const item = itemById.get(requested.orderItemId);

    if (!item) {
      throw new ValidationError('Bu mahsulot buyurtmada yo\'q');
    }

    if (requested.quantity > item.quantity) {
      throw new ValidationError(
        `"${item.name}" uchun ${item.quantity} tadan ko'p qaytarib bo'lmaydi`,
      );
    }

    return { item, quantity: requested.quantity };
  });

  /*
    Bir qator ikki marta yuborilgan bo'lishi mumkin — u holda
    umumiy son buyurtmadagidan oshib ketardi.
  */
  if (new Set(input.items.map((item) => item.orderItemId)).size !== input.items.length) {
    throw new ValidationError('Bir mahsulot ikki marta tanlangan');
  }

  const orderedTotal = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const returnedTotal = lines.reduce((sum, line) => sum + line.quantity, 0);

  const isFullReturn = returnedTotal === orderedTotal;
  const reason = input.reason as ReturnReasonName;

  const amount = calculateRefund(
    lines.map((line) => ({ unitPrice: tiyinToNumber(line.item.unitPrice), quantity: line.quantity })),
    { deliveryFee: tiyinToNumber(order.deliveryFee), reason, isFullReturn },
  );

  const created = await prisma.returnRequest.create({
    data: {
      orderId: order.id,
      userId,
      reason: reason as ReturnReason,
      comment: input.comment ?? null,
      amount: BigInt(amount),
      items: {
        create: lines.map((line) => ({ orderItemId: line.item.id, quantity: line.quantity })),
      },
    },
    select: REQUEST_SELECT,
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.MARKET_RETURN_REQUESTED,
    resourceType: 'ReturnRequest',
    resourceId: created.id,
    module: MODULE,
    metadata: { orderNumber: order.orderNumber, amountTiyin: String(amount), reason },
    ...meta,
  });

  /*
    Sotuvchiga xabar beramiz — aks holda so'rov ko'rilmay
    osilib qolardi.
  */
  if (order.shop.ownerId) {
    await notifyUser(order.shop.ownerId, 'market.return_requested', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountTiyin: amount,
    });
  }

  logger.info({ userId, orderId: order.id, amount, reason }, "Qaytarish so'rovi yuborildi");

  return toView(created);
}

/** Xaridorning o'z so'rovi. */
export async function getReturnForOrder(
  userId: string,
  orderId: string,
): Promise<ReturnRequestView | null> {
  const row = await prisma.returnRequest.findFirst({
    where: { orderId, userId },
    select: REQUEST_SELECT,
  });

  return row ? toView(row) : null;
}

/** Sotuvchining do'konlariga kelgan so'rovlar. */
export async function listShopReturns(
  ownerId: string,
  status?: ReturnStatusName,
): Promise<ReturnRequestView[]> {
  const rows = await prisma.returnRequest.findMany({
    where: {
      order: { shop: { ownerId } },
      ...(status ? { status: status as ReturnStatus } : {}),
    },
    select: REQUEST_SELECT,
    /*
      Ko'rib chiqilmaganlari BIRINCHI: sotuvchining ishi aynan
      ular bilan. Yakunlanganlari tarix uchun pastda qoladi.
    */
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  return rows.map(toView);
}

/**
 * Sotuvchi so'rovni tasdiqlaydi yoki rad etadi.
 *
 * ── Nima uchun PUL shu yerda qaytadi ──────────────────────────────────
 * Tasdiqlash va pul qaytarish AJRALMAS: sotuvchi "roziman" deb,
 * pul qaytmasa — xaridor aldangan bo'lardi.
 *
 * Ikkalasi bitta amaliyotda bajariladi.
 */
export async function decideReturn(
  ownerId: string,
  returnId: string,
  input: DecideReturnInput,
  meta: OperationMeta = {},
): Promise<ReturnRequestView> {
  const request = await prisma.returnRequest.findFirst({
    where: { id: returnId, order: { shop: { ownerId } } },
    select: {
      id: true,
      status: true,
      amount: true,
      userId: true,
      orderId: true,
      order: { select: { orderNumber: true, shop: { select: { name: true } } } },
    },
  });

  if (!request) {
    throw new NotFoundError("Qaytarish so'rovi");
  }

  if (request.status !== ReturnStatus.PENDING) {
    throw new ConflictError("Bu so'rov allaqachon ko'rib chiqilgan.");
  }

  const now = new Date();

  if (!input.approve) {
    const rejected = await prisma.returnRequest.update({
      where: { id: request.id },
      data: {
        status: ReturnStatus.REJECTED,
        decidedAt: now,
        decidedById: ownerId,
        decisionNote: input.note ?? null,
      },
      select: REQUEST_SELECT,
    });

    await recordAudit({
      actorId: ownerId,
      action: AuditAction.MARKET_RETURN_REJECTED,
      resourceType: 'ReturnRequest',
      resourceId: request.id,
      module: MODULE,
      metadata: { orderNumber: request.order.orderNumber, note: input.note ?? '' },
      ...meta,
    });

    await notifyUser(request.userId, 'market.return_rejected', {
      orderId: request.orderId,
      orderNumber: request.order.orderNumber,
      shopName: request.order.shop.name,
      reason: input.note ?? "Sabab ko'rsatilmagan",
    });

    return toView(rejected);
  }

  const wallet = await getOrCreateWallet(request.userId);

  const approved = await prisma.$transaction(async (tx) => {
    /*
      Holatni QULF ostida yana tekshiramiz.

      Ikkita so'rov bir vaqtda kelsa (sotuvchi ikki marta bosgan
      bo'lsa), ikkinchisi shu yerda to'xtaydi va pul IKKI MARTA
      qaytmaydi.
    */
    const claimed = await tx.returnRequest.updateMany({
      where: { id: request.id, status: ReturnStatus.PENDING },
      data: {
        status: ReturnStatus.APPROVED,
        decidedAt: now,
        decidedById: ownerId,
        decisionNote: input.note ?? null,
      },
    });

    if (claimed.count === 0) {
      throw new ConflictError("Bu so'rov allaqachon ko'rib chiqilgan.");
    }

    const credit = await refundWallet(tx, {
      walletId: wallet.id,
      amountTiyin: request.amount,
      description: `${request.order.shop.name} — qaytarilgan mahsulot uchun`,
      sourceModule: MODULE,
      sourceId: request.orderId,
      /*
        Takroriy so'rovdan himoya: kalit so'rov ID'siga bog'langan,
        ya'ni bitta so'rov uchun pul bir marta qaytadi.
      */
      idempotencyKey: `market-return-${request.id}`,
    });

    await tx.returnRequest.update({
      where: { id: request.id },
      data: { refundTransactionId: credit.id },
    });

    return tx.returnRequest.findUniqueOrThrow({
      where: { id: request.id },
      select: REQUEST_SELECT,
    });
  });

  await recordAudit({
    actorId: ownerId,
    action: AuditAction.MARKET_RETURN_APPROVED,
    resourceType: 'ReturnRequest',
    resourceId: request.id,
    module: MODULE,
    metadata: {
      orderNumber: request.order.orderNumber,
      amountTiyin: request.amount.toString(),
      customerId: request.userId,
    },
    ...meta,
  });

  await notifyUser(request.userId, 'market.return_approved', {
    orderId: request.orderId,
    orderNumber: request.order.orderNumber,
    shopName: request.order.shop.name,
    amountTiyin: tiyinToNumber(request.amount),
  });

  logger.info(
    { ownerId, returnId: request.id, amount: request.amount.toString() },
    "Qaytarish tasdiqlandi va pul qaytarildi",
  );

  return toView(approved);
}

/** Ekranda "qaytarish mumkinmi" savoliga javob. */
export { refundsDeliveryFee };
