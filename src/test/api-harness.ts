import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { Role, type RoleValue } from '@/config/rbac';
import { signAccessToken } from '@/modules/auth/token.service';

/**
 * API YO'LLARINI sinash uchun umumiy asboblar.
 *
 * ── Nima uchun alohida fayl ───────────────────────────────────────────
 * Xizmat (`*.service.ts`) sinovlari funksiyani TO'G'RIDAN chaqiradi va
 * `userId` ni o'zi beradi. Ya'ni ular "boshqa odamning buyurtmasini
 * ocholadimi" degan savolga javob BERMAYDI: u savol API qatlamida,
 * token bilan foydalanuvchi aniqlanadigan joyda tug'iladi.
 *
 * Shuning uchun bu yerda haqiqiy `NextRequest` yasaladi, unga haqiqiy
 * imzolangan token qo'yiladi va yo'l funksiyasi Next ishga tushirgani
 * kabi chaqiriladi. Soxta `requireAuth` ishlatilmaydi — aynan o'sha
 * tekshiruv sinalayotgan narsa.
 */

/** Sinov uchun yaratilgan foydalanuvchi va uning tayyor token'i. */
export interface SinovOdam {
  userId: string;
  phone: string;
  token: string;
}

/**
 * Yaratilgan foydalanuvchilar — `tozala()` ular bo'yicha ishlaydi.
 *
 * Ro'yxat MODULGA tegishli: har sinov fayli o'z jarayonida ishlaydi,
 * shuning uchun ular aralashib ketmaydi.
 */
const yaratilganlar: string[] = [];

/** Sinov davomida yaratilgan foydalanuvchilar ro'yxati (faqat o'qish uchun). */
export function sinovOdamlar(): readonly string[] {
  return yaratilganlar;
}

/**
 * Bazada foydalanuvchi yaratadi va unga HAQIQIY token beradi.
 *
 * Telefon raqami tasodifiy: sinovlar parallel ketganda bir xil raqam
 * yagona indeksga urilib, sabab koddan emas, sinovlardan bo'lardi.
 */
export async function sinovOdam(opts: { roles?: RoleValue[]; ism?: string } = {}): Promise<SinovOdam> {
  const phone = `+99890${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;
  const roles = opts.roles ?? [Role.CUSTOMER];

  const user = await prisma.user.create({
    /*
      Rollar bazadagi qatorga YOZILMAYDI — ular token ichida.

      API aynan token'ga ishonadi (`requireAuth` payload'dan o'qiydi),
      shuning uchun ruxsat sinovi ham token orqali qilinishi kerak.
      Bazaga yozsak, sinov tekshirmayotgan yo'lni tekshirgandek
      ko'rinardi.
    */
    data: { phone, firstName: opts.ism ?? 'Sinov', lastName: 'API' },
    select: { id: true },
  });

  yaratilganlar.push(user.id);

  /**
   * `sessionId` — bazadagi sessiya emas, tasodifiy qiymat.
   *
   * `requireAuth` uni faqat QORA RO'YXATDA bor-yo'qligini tekshiradi
   * (Redis'da). Tasodifiy qiymat u yerda yo'q, ya'ni token yaroqli
   * hisoblanadi — bu bizga aynan kerak.
   */
  const token = await signAccessToken({ userId: user.id, phone, roles, sessionId: randomUUID() });

  return { userId: user.id, phone, token };
}

/** So'rov yasash sozlamalari. */
export interface SorovOpts {
  /** `Authorization: Bearer` uchun token. Berilmasa — MEHMON so'rovi. */
  token?: string;
  /** JSON tana. `undefined` bo'lsa tana yuborilmaydi. */
  body?: unknown;
  /** Manzil so'rovi (`?page=2`). */
  query?: Record<string, string>;
}

const ASOS = 'http://localhost:3000';

/** Next yo'liga tushadigan so'rovni yasaydi. */
export function sorov(method: string, path: string, opts: SorovOpts = {}): NextRequest {
  const url = new URL(path, ASOS);

  for (const [kalit, qiymat] of Object.entries(opts.query ?? {})) {
    url.searchParams.set(kalit, qiymat);
  }

  const headers = new Headers({
    /* Audit jurnali IP yozadi — haqiqiy so'rovdagidek beriladi. */
    'x-forwarded-for': '203.0.113.10',
    'user-agent': 'navix-sinov/1.0',
  });

  if (opts.token) headers.set('authorization', `Bearer ${opts.token}`);
  if (opts.body !== undefined) headers.set('content-type', 'application/json');

  return new NextRequest(url, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

/** Yo'l funksiyasining javobi — holat kodi va o'qilgan tanasi. */
export interface Javob {
  status: number;
  body: { success?: boolean; data?: unknown; error?: { code?: string; message?: string } };
}

/**
 * Yo'l funksiyasining tipi — `params` turi bilan.
 *
 * Umumiy (generic): `[id]` yo'li `{ id: string }` kutadi, `[slug]`
 * yo'li `{ slug: string }`. Qattiq yozib qo'yilsa, sinov yo'lni
 * noto'g'ri chaqirganini TypeScript aytmasdi.
 */
export type YolFunksiyasi<TParams extends Record<string, string> = Record<string, string>> = (
  request: NextRequest,
  context: { params: Promise<TParams> },
) => Promise<Response>;

/**
 * Yo'l funksiyasini Next chaqirgani KABI chaqiradi.
 *
 * `params` — va'da (Promise): Next 16 da shunday beriladi, shuning
 * uchun bu yerda ham shunday, aks holda sinov haqiqatdan uzoqlashardi.
 */
export async function chaqir<TParams extends Record<string, string> = Record<string, string>>(
  handler: YolFunksiyasi<TParams>,
  request: NextRequest,
  params: TParams = {} as TParams,
): Promise<Javob> {
  const response = await handler(request, { params: Promise.resolve(params) });

  /*
    Ba'zi javoblarda tana bo'lmaydi (204) yoki u JSON emas (fayl).
    Shunda tana bo'sh obyekt bo'ladi — holat kodi baribir tekshiriladi.
  */
  let body: Javob['body'] = {};

  try {
    body = (await response.clone().json()) as Javob['body'];
  } catch {
    /* JSON emas — holat kodi yetarli. */
  }

  return { status: response.status, body };
}

/**
 * Sinov yaratgan HAMMA narsani o'chiradi.
 *
 * Tartib muhim: bog'langan yozuvlar avval, foydalanuvchi oxirida.
 * Aks holda tashqi kalit xatoligi chiqadi va tozalash yarim yo'lda
 * to'xtab, bazada axlat qolardi.
 */
export async function tozala(): Promise<void> {
  if (yaratilganlar.length === 0) return;

  const id = { in: yaratilganlar };

  const wallets = await prisma.wallet.findMany({ where: { userId: id }, select: { id: true } });
  const walletId = { in: wallets.map((w) => w.id) };

  /*
    Safar IKKI odamga bog'langan: yo'lovchi va haydovchi. Faqat
    yo'lovchi bo'yicha tozalasak, haydovchi tomonidagi safarlar
    qolib ketardi va ular bilan birga foydalanuvchi ham o'chmasdi.
  */
  const drivers = await prisma.taxiDriver.findMany({ where: { userId: id }, select: { id: true } });

  await prisma.taxiRide.deleteMany({
    where: { OR: [{ riderId: id }, { driverId: { in: drivers.map((d) => d.id) } }] },
  });
  await prisma.taxiDriver.deleteMany({ where: { userId: id } });

  await prisma.foodOrder.deleteMany({ where: { userId: id } });
  await prisma.marketOrder.deleteMany({ where: { userId: id } });
  await prisma.parcel.deleteMany({ where: { senderId: id } });
  await prisma.tripBooking.deleteMany({ where: { userId: id } });
  await prisma.hotelBooking.deleteMany({ where: { userId: id } });
  await prisma.walletTransaction.deleteMany({ where: { walletId } });
  await prisma.wallet.deleteMany({ where: { userId: id } });
  await prisma.userRoleAssignment.deleteMany({ where: { userId: id } });
  await prisma.address.deleteMany({ where: { userId: id } });
  await prisma.notification.deleteMany({ where: { userId: id } });
  await prisma.auditLog.deleteMany({ where: { actorId: id } });
  await prisma.user.deleteMany({ where: { id } });

  yaratilganlar.length = 0;
}

/** Foydalanuvchining hamyon balansi — tiyinda. Hamyoni yo'q bo'lsa 0. */
export async function balans(userId: string): Promise<bigint> {
  const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });

  return wallet?.balance ?? 0n;
}
