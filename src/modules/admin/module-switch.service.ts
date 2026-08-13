import { AuditAction, recordAudit } from '@/lib/audit';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { APP_MODULES, getModuleById, type AppModule } from '@/config/modules';

/**
 * Bo'limlarni vaqtincha yopish (kill-switch).
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Tashqi xizmat ishdan chiqadi: to'lov tizimi javob bermaydi, restoran
 * API si o'chadi, yoki bo'limda jiddiy xato topiladi. Bunday paytda
 * bo'limni DARHOL yopish kerak — dasturni qayta yig'ib, tarqatib
 * o'tirmasdan.
 *
 * ── Ikki qavatli himoya ───────────────────────────────────────────────
 * 1. KO'RINISH — kartochka bosh sahifada, qidiruvda va AI javoblarida
 *    ko'rinmaydi;
 * 2. API — yopilgan bo'limning so'rovlari `503` bilan rad etiladi.
 *
 * Faqat birinchisi qilinsa, himoya ALDAMCHI bo'lardi: manzilni qo'lda
 * yozgan yoki eski sahifasi ochiq qolgan odam baribir buyurtma bera
 * olardi.
 *
 * ── Nima uchun KESH ───────────────────────────────────────────────────
 * Tekshiruv HAR BIR API so'rovida bajariladi. Har safar bazaga borish
 * — bu har bir so'rovga qo'shimcha yuk. Yopilgan bo'limlar esa juda
 * kam o'zgaradi, shuning uchun natija qisqa muddatga xotirada
 * saqlanadi.
 *
 * Kesh muddati ATAYLAB qisqa: bo'lim yopilgach eng ko'pi bilan shuncha
 * vaqt o'tib to'xtaydi. Uzunroq qilish "darhol yopish" degan maqsadga
 * zid bo'lardi.
 */

const MODULE = 'admin';

/** Kesh necha millisekund yashaydi. */
const CACHE_TTL_MS = 10_000;

interface CacheEntry {
  disabled: Map<string, string | null>;
  expiresAt: number;
}

/**
 * Kesh `globalThis` da saqlanadi.
 *
 * Ishlab chiqish rejimida Next.js modullarni qayta yuklaydi va oddiy
 * o'zgaruvchi har safar noldan boshlanardi.
 */
const globalForCache = globalThis as unknown as { navixModuleSwitchCache?: CacheEntry };

/** Keshni bekor qiladi — holat o'zgargandan keyin chaqiriladi. */
function invalidateCache(): void {
  globalForCache.navixModuleSwitchCache = undefined;
}

/**
 * Yopilgan bo'limlar: `moduleId` → sabab.
 *
 * Baza javob bermasa BO'SH ro'yxat qaytadi, ya'ni hamma bo'lim ochiq
 * qoladi. Bu ataylab: baza o'chganda butun ilovani "yopiq" deb
 * ko'rsatish nosozlikni bir necha barobar kattalashtirardi.
 */
export async function getDisabledModules(): Promise<Map<string, string | null>> {
  const cached = globalForCache.navixModuleSwitchCache;

  if (cached && cached.expiresAt > Date.now()) {
    return cached.disabled;
  }

  try {
    const rows = await prisma.moduleSwitch.findMany({
      where: { isEnabled: false },
      select: { moduleId: true, reason: true },
    });

    const disabled = new Map(rows.map((row) => [row.moduleId, row.reason]));

    globalForCache.navixModuleSwitchCache = { disabled, expiresAt: Date.now() + CACHE_TTL_MS };

    return disabled;
  } catch (error) {
    logger.error({ err: error }, "Yopilgan bo'limlar ro'yxati o'qilmadi");

    return new Map();
  }
}

/** Bo'lim hozir ochiqmi. */
export async function isModuleEnabled(moduleId: string): Promise<boolean> {
  return !(await getDisabledModules()).has(moduleId);
}

/**
 * Manzil qaysi bo'limga tegishli.
 *
 * Manzil `/api/v1/food/orders` ko'rinishida keladi; bo'lim esa
 * `apiPrefixes: ['food']` deb e'lon qilingan. Taqqoslash aynan BO'LAK
 * bo'yicha bajariladi: `market` prefiksi `marketing` degan boshqa
 * manzilga tegib ketmasligi kerak. Aynan shu sababli oddiy
 * `startsWith` yetarli emas.
 *
 * Bazaga tegmaydi — shuning uchun alohida sinash mumkin.
 */
export function resolveModuleForPath(pathname: string): AppModule | null {
  const match = /^\/api\/v\d+\/([^/?]+)/.exec(pathname);
  if (!match) return null;

  const segment = match[1];

  return APP_MODULES.find((entry) => entry.apiPrefixes?.includes(segment)) ?? null;
}

/**
 * So'rov manzili yopilgan bo'limga tegishlimi.
 *
 * @returns yopilgan bo'lim va sababi, yoki `null`
 */
export async function findDisabledModuleForPath(
  pathname: string,
): Promise<{ module: AppModule; reason: string | null } | null> {
  const owner = resolveModuleForPath(pathname);

  if (!owner) return null;

  const disabled = await getDisabledModules();
  if (!disabled.has(owner.id)) return null;

  return { module: owner, reason: disabled.get(owner.id) ?? null };
}

// ── Administrator uchun ───────────────────────────────────────────────

export interface ModuleSwitchItem {
  moduleId: string;
  name: string;
  description: string;
  href: string;
  category: string;
  isEnabled: boolean;
  reason: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

/** Yopish mumkin bo'lgan barcha bo'limlar va ularning holati. */
export async function listModuleSwitches(): Promise<ModuleSwitchItem[]> {
  const switchable = APP_MODULES.filter((entry) => entry.canDisable === true);

  const rows = await prisma.moduleSwitch.findMany({
    where: { moduleId: { in: switchable.map((entry) => entry.id) } },
    select: {
      moduleId: true,
      isEnabled: true,
      reason: true,
      updatedAt: true,
      updatedBy: { select: { firstName: true, lastName: true } },
    },
  });

  const byId = new Map(rows.map((row) => [row.moduleId, row]));

  return switchable.map((entry) => {
    const row = byId.get(entry.id);

    return {
      moduleId: entry.id,
      name: entry.name,
      description: entry.description,
      href: entry.href,
      category: entry.category,
      // Yozuv yo'q bo'lsa bo'lim OCHIQ — odatiy holat bazaga tegmaydi.
      isEnabled: row?.isEnabled ?? true,
      reason: row?.reason ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      updatedBy: row?.updatedBy
        ? [row.updatedBy.firstName, row.updatedBy.lastName].filter(Boolean).join(' ') || null
        : null,
    };
  });
}

export interface SetModuleEnabledInput {
  isEnabled: boolean;
  reason?: string | null;
}

interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/**
 * Bo'limni yopadi yoki qayta ochadi.
 *
 * ── Nima uchun sabab MAJBURIY (yopishda) ──────────────────────────────
 * Sabab foydalanuvchiga ko'rsatiladi. Usiz odam "Xizmat ishlamayapti"
 * degan quruq yozuvni ko'rib, qo'llab-quvvatlashga qo'ng'iroq qilardi.
 * "Bank tomonida texnik ishlar, soat 18:00 da tiklanadi" degan matn
 * esa qo'ng'iroqning o'zini keraksiz qiladi.
 */
export async function setModuleEnabled(
  actorId: string,
  moduleId: string,
  input: SetModuleEnabledInput,
  meta: OperationMeta = {},
): Promise<ModuleSwitchItem> {
  const target = getModuleById(moduleId);

  if (!target) {
    throw new NotFoundError("Bo'lim");
  }

  if (target.canDisable !== true) {
    /**
     * Ro'yxatdan tashqari bo'limlar HIMOYALANGAN.
     *
     * Hamyon yoki xavfsizlik bo'limi yopilsa, ilova ishlamas holga
     * keladi. Bu tekshiruv serverda: interfeysda tugma ko'rsatmaslik
     * yetarli emas, chunki so'rovni qo'lda yuborish mumkin.
     */
    throw new ConflictError(`"${target.name}" bo'limini yopib bo'lmaydi — u ilovaning asosiy qismi.`);
  }

  const reason = input.isEnabled ? null : (input.reason?.trim() || null);

  await prisma.moduleSwitch.upsert({
    where: { moduleId },
    create: { moduleId, isEnabled: input.isEnabled, reason, updatedById: actorId },
    update: { isEnabled: input.isEnabled, reason, updatedById: actorId },
  });

  invalidateCache();

  await recordAudit({
    actorId,
    action: input.isEnabled ? AuditAction.ADMIN_MODULE_ENABLED : AuditAction.ADMIN_MODULE_DISABLED,
    resourceType: 'ModuleSwitch',
    resourceId: moduleId,
    module: MODULE,
    metadata: { moduleName: target.name, reason },
    ...meta,
  });

  logger.warn(
    { actorId, moduleId, isEnabled: input.isEnabled, reason },
    input.isEnabled ? "Bo'lim qayta ochildi" : "Bo'lim yopildi",
  );

  const items = await listModuleSwitches();

  return items.find((item) => item.moduleId === moduleId)!;
}
