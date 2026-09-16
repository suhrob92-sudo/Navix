import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/prisma';
import { Role, type RoleValue } from '@/config/rbac';
import {
  chaqir,
  sinovOdam,
  sorov,
  tozala,
  type Javob,
  type SinovOdam,
  type YolFunksiyasi,
} from '@/test/api-harness';

import { GET as auditGet } from '@/app/api/v1/admin/audit/route';
import { GET as businessesGet } from '@/app/api/v1/admin/businesses/route';
import { PATCH as businessPatch } from '@/app/api/v1/admin/businesses/[kind]/[id]/route';
import { GET as contentGet } from '@/app/api/v1/admin/content/route';
import { PATCH as contentPatch } from '@/app/api/v1/admin/content/[kind]/[id]/route';
import { GET as errorsGet, DELETE as errorsDelete } from '@/app/api/v1/admin/errors/route';
import { PATCH as errorPatch } from '@/app/api/v1/admin/errors/[id]/route';
import { GET as modulesGet } from '@/app/api/v1/admin/modules/route';
import { PATCH as modulePatch } from '@/app/api/v1/admin/modules/[id]/route';
import { GET as paymentsGet } from '@/app/api/v1/admin/payments/route';
import { POST as refundPost } from '@/app/api/v1/admin/payments/[id]/refund/route';
import { GET as providersGet, POST as providerPost } from '@/app/api/v1/admin/providers/route';
import { GET as providerGet, PATCH as providerPatch } from '@/app/api/v1/admin/providers/[id]/route';
import { GET as reportsGet } from '@/app/api/v1/admin/reports/route';
import { PATCH as reportPatch } from '@/app/api/v1/admin/reports/[id]/route';
import { GET as statsGet } from '@/app/api/v1/admin/stats/route';
import { GET as supportGet } from '@/app/api/v1/admin/support/route';
import { GET as ticketGet, POST as ticketPost, PATCH as ticketPatch } from '@/app/api/v1/admin/support/[id]/route';
import { GET as transactionsGet } from '@/app/api/v1/admin/transactions/route';
import { GET as usersGet } from '@/app/api/v1/admin/users/route';
import { GET as userGet, PATCH as userPatch } from '@/app/api/v1/admin/users/[id]/route';
import { PATCH as rolesPatch } from '@/app/api/v1/admin/users/[id]/roles/route';
import { GET as waitlistGet } from '@/app/api/v1/admin/waitlist/route';

/**
 * ADMIN YO'LLARI — qaysi rol nimaga yetadi.
 *
 * ── Nima uchun statik qoida yetarli emas ──────────────────────────────
 * `route-auth.test.ts` har bir admin yo'lida rol yoki ruxsat tekshiruvi
 * BORLIGINI ko'radi. Lekin u "qaysi ruxsat kerak" degan savolga javob
 * bermaydi. Ruxsat noto'g'ri tanlansa — masalan bloklash yo'lida
 * `PLATFORM_USER_READ` yozilsa — statik qoida baribir o'tardi, ammo
 * har bir qo'llab-quvvatlash xodimi odamlarni bloklay olardi.
 *
 * ── Eng muhim chegara: ROL BERISH ────────────────────────────────────
 * `PATCH /admin/users/[id]/roles` uchun `PLATFORM_ROLE_MANAGE` kerak
 * va u FAQAT `SUPER_ADMIN` da bor. Bu chegara buzilsa, har qanday
 * administrator o'ziga `SUPER_ADMIN` berib, butun platformani egallab
 * olardi. Qolgan barcha tekshiruvlar shundan keyin ma'nosiz bo'lardi.
 *
 * ── Ruxsat tekshiruvi ENG BIRINCHI ishlaydi ──────────────────────────
 * Har bir yo'lda `requirePermission` birinchi qatorda turadi — manzil
 * va tana hali o'qilmagan. Shuning uchun bu yerda soxta (mavjud
 * bo'lmagan) ID ishlatilishi mumkin: ruxsat yetmasa 403, yetsa esa
 * boshqa kod (404, 400, 200). Ya'ni "403 emas" — ruxsat o'tdi degani.
 */

const BAZA_BOR = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return true;
  } catch {
    return false;
  }
})();

afterAll(async () => {
  if (!BAZA_BOR) return;

  await tozala();
  await prisma.$disconnect();
});

const SOXTA_ID = '00000000-0000-0000-0000-000000000000';

interface AdminYol {
  nom: string;
  /** Shu yo'lga KIRA OLADIGAN rollar. Qolganlari 403 olishi shart. */
  ruxsat: readonly RoleValue[];
  /** Yo'lni berilgan odam nomidan chaqiradi. */
  urin: (odam: SinovOdam) => Promise<Javob>;
}

/**
 * Jadval qatorini yasaydi.
 *
 * ── Nima uchun funksiya, oddiy obyekt emas ────────────────────────────
 * Har yo'lning manzil parametrlari boshqacha: birida `{ id }`, birida
 * `{ kind, id }`, birida umuman yo'q. Jadvalga hammasini bitta tip
 * bilan yozsak, TypeScript ularni tekshira olmasdi va `as` bilan
 * majburlash kerak bo'lardi — ya'ni yo'l noto'g'ri parametr bilan
 * chaqirilsa ham hech kim aytmasdi.
 *
 * Bu yerda tip HAR QATOR uchun alohida aniqlanadi: `handler` va
 * `params` bir-biriga mos kelmasa, sinov hatto ishga tushmaydi.
 */
function yol<TParams extends Record<string, string>>(spec: {
  nom: string;
  method: string;
  path: string;
  handler: YolFunksiyasi<TParams>;
  params: TParams;
  body?: unknown;
  ruxsat: readonly RoleValue[];
}): AdminYol {
  return {
    nom: spec.nom,
    ruxsat: spec.ruxsat,
    urin: (odam) =>
      chaqir(spec.handler, sorov(spec.method, spec.path, { token: odam.token, body: spec.body }), spec.params),
  };
}

const FAQAT_SUPER: readonly RoleValue[] = [Role.SUPER_ADMIN];
const ADMINLAR: readonly RoleValue[] = [Role.ADMIN, Role.SUPER_ADMIN];
const HAMMA_ADMIN: readonly RoleValue[] = [Role.SUPPORT, Role.ADMIN, Role.SUPER_ADMIN];

const YOLLAR: readonly AdminYol[] = [
  /* ── Eng muhim: rol berish faqat SUPER_ADMIN da ──────────────────── */
  yol({
    nom: 'PATCH /admin/users/[id]/roles',
    method: 'PATCH',
    path: `/api/v1/admin/users/${SOXTA_ID}/roles`,
    handler: rolesPatch,
    params: { id: SOXTA_ID },
    body: { role: 'ADMIN', action: 'grant' },
    ruxsat: FAQAT_SUPER,
  }),

  /* ── Qo'llab-quvvatlash xodimi ham ko'ra oladi ────────────────────── */
  yol({
    nom: 'GET /admin/stats',
    method: 'GET',
    path: '/api/v1/admin/stats',
    handler: statsGet,
    params: {},
    ruxsat: HAMMA_ADMIN,
  }),
  yol({
    nom: 'GET /admin/users',
    method: 'GET',
    path: '/api/v1/admin/users',
    handler: usersGet,
    params: {},
    ruxsat: HAMMA_ADMIN,
  }),
  yol({
    nom: 'GET /admin/users/[id]',
    method: 'GET',
    path: `/api/v1/admin/users/${SOXTA_ID}`,
    handler: userGet,
    params: { id: SOXTA_ID },
    ruxsat: HAMMA_ADMIN,
  }),
  yol({
    nom: 'GET /admin/transactions',
    method: 'GET',
    path: '/api/v1/admin/transactions',
    handler: transactionsGet,
    params: {},
    ruxsat: HAMMA_ADMIN,
  }),
  yol({
    nom: 'GET /admin/payments',
    method: 'GET',
    path: '/api/v1/admin/payments',
    handler: paymentsGet,
    params: {},
    ruxsat: HAMMA_ADMIN,
  }),
  yol({
    nom: 'GET /admin/support',
    method: 'GET',
    path: '/api/v1/admin/support',
    handler: supportGet,
    params: {},
    ruxsat: HAMMA_ADMIN,
  }),
  yol({
    nom: 'GET /admin/support/[id]',
    method: 'GET',
    path: `/api/v1/admin/support/${SOXTA_ID}`,
    handler: ticketGet,
    params: { id: SOXTA_ID },
    ruxsat: HAMMA_ADMIN,
  }),
  yol({
    nom: 'POST /admin/support/[id]',
    method: 'POST',
    path: `/api/v1/admin/support/${SOXTA_ID}`,
    handler: ticketPost,
    params: { id: SOXTA_ID },
    body: { message: 'Sinov javobi' },
    ruxsat: HAMMA_ADMIN,
  }),
  yol({
    nom: 'PATCH /admin/support/[id]',
    method: 'PATCH',
    path: `/api/v1/admin/support/${SOXTA_ID}`,
    handler: ticketPatch,
    params: { id: SOXTA_ID },
    body: { status: 'RESOLVED' },
    ruxsat: HAMMA_ADMIN,
  }),
  yol({
    nom: 'POST /admin/payments/[id]/refund',
    method: 'POST',
    path: `/api/v1/admin/payments/${SOXTA_ID}/refund`,
    handler: refundPost,
    params: { id: SOXTA_ID },
    body: { reason: 'Sinov' },
    ruxsat: HAMMA_ADMIN,
  }),

  /* ── Faqat ADMIN va yuqorisi: o'zgartiradigan amallar ─────────────── */
  yol({
    nom: 'PATCH /admin/users/[id] (bloklash)',
    method: 'PATCH',
    path: `/api/v1/admin/users/${SOXTA_ID}`,
    handler: userPatch,
    params: { id: SOXTA_ID },
    body: { isActive: false },
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'GET /admin/audit',
    method: 'GET',
    path: '/api/v1/admin/audit',
    handler: auditGet,
    params: {},
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'GET /admin/errors',
    method: 'GET',
    path: '/api/v1/admin/errors',
    handler: errorsGet,
    params: {},
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'DELETE /admin/errors',
    method: 'DELETE',
    path: '/api/v1/admin/errors',
    handler: errorsDelete,
    params: {},
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'PATCH /admin/errors/[id]',
    method: 'PATCH',
    path: `/api/v1/admin/errors/${SOXTA_ID}`,
    handler: errorPatch,
    params: { id: SOXTA_ID },
    body: { isResolved: true },
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'GET /admin/modules',
    method: 'GET',
    path: '/api/v1/admin/modules',
    handler: modulesGet,
    params: {},
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'PATCH /admin/modules/[id]',
    method: 'PATCH',
    path: '/api/v1/admin/modules/taxi',
    handler: modulePatch,
    params: { id: 'taxi' },
    body: { isEnabled: true },
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'GET /admin/providers',
    method: 'GET',
    path: '/api/v1/admin/providers',
    handler: providersGet,
    params: {},
    ruxsat: HAMMA_ADMIN,
  }),
  yol({
    nom: 'POST /admin/providers',
    method: 'POST',
    path: '/api/v1/admin/providers',
    handler: providerPost,
    body: {},
    params: {},
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'GET /admin/providers/[id]',
    method: 'GET',
    path: `/api/v1/admin/providers/${SOXTA_ID}`,
    handler: providerGet,
    params: { id: SOXTA_ID },
    ruxsat: HAMMA_ADMIN,
  }),
  yol({
    nom: 'PATCH /admin/providers/[id]',
    method: 'PATCH',
    path: `/api/v1/admin/providers/${SOXTA_ID}`,
    handler: providerPatch,
    params: { id: SOXTA_ID },
    body: {},
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'GET /admin/businesses',
    method: 'GET',
    path: '/api/v1/admin/businesses',
    handler: businessesGet,
    params: {},
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'PATCH /admin/businesses/[kind]/[id]',
    method: 'PATCH',
    path: `/api/v1/admin/businesses/SHOP/${SOXTA_ID}`,
    handler: businessPatch,
    params: { kind: 'SHOP', id: SOXTA_ID },
    body: { isActive: false },
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'GET /admin/content',
    method: 'GET',
    path: '/api/v1/admin/content',
    handler: contentGet,
    params: {},
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'PATCH /admin/content/[kind]/[id]',
    method: 'PATCH',
    path: `/api/v1/admin/content/PRODUCT/${SOXTA_ID}`,
    handler: contentPatch,
    params: { kind: 'PRODUCT', id: SOXTA_ID },
    body: { isActive: false },
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'GET /admin/reports',
    method: 'GET',
    path: '/api/v1/admin/reports',
    handler: reportsGet,
    params: {},
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'PATCH /admin/reports/[id]',
    method: 'PATCH',
    path: `/api/v1/admin/reports/${SOXTA_ID}`,
    handler: reportPatch,
    params: { id: SOXTA_ID },
    body: { status: 'REVIEWED' },
    ruxsat: ADMINLAR,
  }),
  yol({
    nom: 'GET /admin/waitlist',
    method: 'GET',
    path: '/api/v1/admin/waitlist',
    handler: waitlistGet,
    params: {},
    ruxsat: ADMINLAR,
  }),
];

/** Sinaladigan rollar — oddiy mijozdan bosh administratorgacha. */
const ROLLAR: readonly RoleValue[] = [Role.CUSTOMER, Role.SUPPORT, Role.ADMIN, Role.SUPER_ADMIN];

describe.skipIf(!BAZA_BOR)("admin yo'llari — rol chegaralari", () => {
  for (const yol of YOLLAR) {
    for (const rol of ROLLAR) {
      const kiraOladi = yol.ruxsat.includes(rol);

      it(`${yol.nom} — ${rol} ${kiraOladi ? 'KIRA OLADI' : 'kira olmaydi'}`, async () => {
        const odam = await sinovOdam({ roles: [rol] });
        const javob = await yol.urin(odam);

        if (kiraOladi) {
          /*
            Ruxsat O'TDI degani 200 degani emas: soxta ID ishlatilgani
            uchun javob 404 yoki 400 bo'lishi mumkin. Muhimi — 403 emas.

            Bu teskari tomondan tekshiruv: busiz "hammaga 403"
            qaytaradigan kod ham barcha sinovlardan o'tardi.
          */
          expect(javob.status, `${rol} ga ruxsat berilmadi`).not.toBe(403);
        } else {
          expect(javob.status, `${rol} ichkariga kirdi`).toBe(403);
        }
      });
    }
  }
});

describe.skipIf(!BAZA_BOR)('rol berish — chuqur tekshiruv', () => {
  it("ADMIN o'ziga SUPER_ADMIN berolmaydi", async () => {
    /*
      ── Eng jiddiy xavf: huquq o'sishi (escalation) ─────────────────
      Administrator o'ziga bosh administrator roli bera olsa, u
      platformaning hamma narsasiga ega bo'lardi — jumladan boshqa
      adminlarni chetlatish va audit jurnalini boshqarish.

      Bu yerda IKKI qorovul bor va ikkalasi ham kerak:
        1. Ruxsat qatlami: `PLATFORM_ROLE_MANAGE` ADMIN da yo'q
        2. Xizmat qatlami: o'z rolini o'zgartirish taqiqlangan
    */
    const admin = await sinovOdam({ roles: [Role.ADMIN] });

    const javob = await chaqir(
      rolesPatch,
      sorov('PATCH', `/api/v1/admin/users/${admin.userId}/roles`, {
        token: admin.token,
        body: { role: 'SUPER_ADMIN', action: 'grant' },
      }),
      { id: admin.userId },
    );

    expect(javob.status).toBe(403);
    expect(await prisma.userRoleAssignment.count({ where: { userId: admin.userId } })).toBe(0);
  });

  it("SUPER_ADMIN ham O'Z rollarini o'zgartira olmaydi", async () => {
    /*
      Ikkinchi qorovul — xizmat qatlamida. Ruxsati bor odam ham
      o'ziga tegishi mumkin emas: bu tasodifiy "o'zimni chetlatib
      qo'ydim" holatidan ham himoya qiladi.
    */
    const bosh = await sinovOdam({ roles: [Role.SUPER_ADMIN] });

    const javob = await chaqir(
      rolesPatch,
      sorov('PATCH', `/api/v1/admin/users/${bosh.userId}/roles`, {
        token: bosh.token,
        body: { role: 'ADMIN', action: 'grant' },
      }),
      { id: bosh.userId },
    );

    expect(javob.status).toBe(403);
    expect(await prisma.userRoleAssignment.count({ where: { userId: bosh.userId } })).toBe(0);
  });

  it('SUPER_ADMIN BOSHQA odamga rol bera oladi', async () => {
    /*
      Teskari tomondan tekshiruv: himoya juda qattiq bo'lib, rol
      berishning o'zini to'sib qo'ymasligi kerak.
    */
    const bosh = await sinovOdam({ roles: [Role.SUPER_ADMIN] });
    const oddiy = await sinovOdam();

    const javob = await chaqir(
      rolesPatch,
      sorov('PATCH', `/api/v1/admin/users/${oddiy.userId}/roles`, {
        token: bosh.token,
        body: { role: 'DRIVER', action: 'grant' },
      }),
      { id: oddiy.userId },
    );

    expect(javob.status).toBe(200);

    const rollar = await prisma.userRoleAssignment.findMany({
      where: { userId: oddiy.userId },
      select: { role: { select: { name: true } } },
    });

    expect(rollar.map((r) => r.role.name)).toContain('DRIVER');
  });
});
