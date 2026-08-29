import { ApplicationStatus, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { somToTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { toSearchText } from '@/lib/search';
import { slugify } from '@/lib/utils';
import type { ServiceColor } from '@/config/modules';
import { notifyUser } from '@/modules/notification/notification.service';
import { canTransition, type ApplicationStatusName } from '@/modules/job/job.types';
import type {
  CreateVacancyInput,
  DecideApplicationInput,
  EmployerApplicationQuery,
  EmployerVacancyQuery,
  UpdateCompanyInput,
  UpdateVacancyInput,
} from '@/modules/employer/employer.schemas';
import type {
  EmployerApplication,
  EmployerCategoryOption,
  EmployerCompany,
  EmployerStats,
  EmployerVacancy,
} from '@/modules/employer/employer.types';

/**
 * Ish beruvchi kabineti.
 *
 * ── Asosiy qoida: EGALIK har bir amalda tekshiriladi ──────────────────
 * Sotuvchi va restoran kabinetlaridagi bilan bir xil: tekshiruv
 * mijoz yuborgan ID'ga emas, TOKENDAGI foydalanuvchiga tayanadi.
 * Har so'rovda `company.ownerId = userId` sharti qo'yiladi, begona
 * ID esa "topilmadi" qaytaradi — boshqa kompaniya mavjudligini ham
 * oshkor qilmaymiz.
 *
 * ── Sotuvchi kabinetidan UCHTA jiddiy farqi ───────────────────────────
 *
 * 1. PUL YO'Q, LEKIN SHAXSIY MA'LUMOT BOR. Do'konda eng nozik narsa
 *    zaxira va pul edi. Bu yerda esa — NOMZODNING TELEFON RAQAMI.
 *    Uni faqat e'lon egasi ko'radi va ko'rilgani auditga yoziladi.
 *
 * 2. QAROR QAYTARIB BO'LMAYDI. Buyurtma holatini oldinga surish
 *    odatiy ish. Bu yerda esa "suhbatga taklif" yoki "rad etish" —
 *    yakuniy javob. Uni keyin o'zgartirib bo'lmaydi, chunki nomzod
 *    allaqachon xabar olgan.
 *
 * 3. YOPILGAN E'LON O'CHIRILMAYDI. E'lon yopilsa, u katalogdan
 *    chiqadi-yu arizalar joyida qoladi: ular tarix va ularga javob
 *    berish shart.
 */

const MODULE = 'employer';

/** Javob kutayotgan arizalar. */
const PENDING_STATUSES: ApplicationStatus[] = [ApplicationStatus.SENT, ApplicationStatus.VIEWED];

// ── Kompaniyalar ──────────────────────────────────────────────────────

/**
 * Ish beruvchining kompaniyalari va umumiy ko'rsatkichlar.
 *
 * Bitta odam bir nechta kompaniyaga ega bo'lishi mumkin (masalan
 * holding), shuning uchun ro'yxat qaytariladi.
 */
export async function getEmployerOverview(
  userId: string,
): Promise<{ companies: EmployerCompany[]; stats: EmployerStats }> {
  const rows = await prisma.company.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      industry: true,
      city: true,
      color: true,
      isActive: true,
      vacancies: {
        select: {
          isActive: true,
          _count: { select: { applications: { where: { status: { in: PENDING_STATUSES } } } } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const companies: EmployerCompany[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    industry: row.industry,
    city: row.city,
    color: row.color as ServiceColor,
    isActive: row.isActive,
    activeVacancies: row.vacancies.filter((vacancy) => vacancy.isActive).length,
    pendingApplications: row.vacancies.reduce((sum, vacancy) => sum + vacancy._count.applications, 0),
  }));

  /**
   * "Yangi" arizalar alohida sanaladi.
   *
   * Kabinetga kirgan odamning birinchi savoli — "menda yangi nima
   * bor?". `VIEWED` allaqachon ko'rilgan, shuning uchun u bu raqamga
   * kirmaydi.
   */
  const newApplications = await prisma.jobApplication.count({
    where: { status: ApplicationStatus.SENT, vacancy: { company: { ownerId: userId } } },
  });

  return {
    companies,
    stats: {
      companies: companies.length,
      activeVacancies: companies.reduce((sum, company) => sum + company.activeVacancies, 0),
      newApplications,
      pendingApplications: companies.reduce((sum, company) => sum + company.pendingApplications, 0),
    },
  };
}

/**
 * Kompaniya shu odamnikimi.
 *
 * Topilmasa "Kompaniya topilmadi" — "sizniki emas" EMAS. Farqi
 * muhim: ikkinchi javob begona kompaniya mavjudligini tasdiqlab
 * qo'yardi.
 */
async function assertOwnsCompany(userId: string, companyId: string): Promise<void> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, ownerId: userId },
    select: { id: true },
  });

  if (!company) {
    throw new NotFoundError('Kompaniya');
  }
}

// ── Vakansiyalar ──────────────────────────────────────────────────────

const VACANCY_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  salaryMin: true,
  salaryMax: true,
  employmentType: true,
  experienceLevel: true,
  city: true,
  isActive: true,
  createdAt: true,
  company: { select: { id: true, name: true, color: true } },
  category: { select: { id: true, slug: true, name: true } },
  _count: { select: { applications: true } },
} as const;

type VacancyRow = Prisma.VacancyGetPayload<{ select: typeof VACANCY_SELECT }>;

function toEmployerVacancy(row: VacancyRow, pendingCount: number): EmployerVacancy {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    salaryMin: row.salaryMin === null ? null : tiyinToNumber(row.salaryMin),
    salaryMax: row.salaryMax === null ? null : tiyinToNumber(row.salaryMax),
    employmentType: row.employmentType,
    experienceLevel: row.experienceLevel,
    city: row.city,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    company: { id: row.company.id, name: row.company.name, color: row.company.color as ServiceColor },
    category: { id: row.category.id, slug: row.category.slug, name: row.category.name },
    applicationCount: row._count.applications,
    pendingCount,
  };
}

/**
 * Har bir e'londa nechta ariza javob kutayotganini BITTA so'rovda
 * oladi.
 *
 * Har e'lon uchun alohida so'rov yuborilsa, 20 ta e'lonli sahifa
 * 21 ta so'rov qilardi (N+1 muammosi).
 */
async function countPendingByVacancy(vacancyIds: string[]): Promise<Map<string, number>> {
  if (vacancyIds.length === 0) return new Map();

  const rows = await prisma.jobApplication.groupBy({
    by: ['vacancyId'],
    where: { vacancyId: { in: vacancyIds }, status: { in: PENDING_STATUSES } },
    _count: { _all: true },
  });

  return new Map(rows.map((row) => [row.vacancyId, row._count._all]));
}

/**
 * Kompaniya ma'lumotini o'zgartiradi.
 *
 * ── Nima uchun egalik SO'ROVDA tekshiriladi ───────────────────────────
 * `where` ichida `ownerId` bor: begona kompaniya shunchaki topilmaydi.
 * Agar avval o'qib, keyin kodda solishtirilsa, o'sha tekshiruvni
 * unutish mumkin edi — bu esa boshqa birovning kompaniyasini
 * tahrirlash degani.
 */
export async function updateEmployerCompany(
  userId: string,
  companyId: string,
  input: UpdateCompanyInput,
  meta: OperationMeta = {},
): Promise<EmployerCompany> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, ownerId: userId },
    select: { id: true },
  });

  if (!company) {
    // "Sizniki emas" emas, "topilmadi" — begona kompaniya borligini
    // ham oshkor qilmaymiz.
    throw new NotFoundError('Kompaniya');
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      // Nom o'zgarsa qidiruv ustuni ham yangilanadi.
      ...(input.name === undefined ? {} : { name: input.name, searchName: toSearchText(input.name) }),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.industry === undefined ? {} : { industry: input.industry }),
      ...(input.city === undefined ? {} : { city: input.city }),
    },
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.EMPLOYER_COMPANY_UPDATED,
    resourceType: 'Company',
    resourceId: companyId,
    module: MODULE,
    metadata: { ...input },
    ...meta,
  });

  logger.info({ userId, companyId, changed: Object.keys(input) }, "Kompaniya ma'lumoti o'zgartirildi");

  const overview = await getEmployerOverview(userId);
  const updated = overview.companies.find((item) => item.id === companyId);

  if (!updated) {
    throw new NotFoundError('Kompaniya');
  }

  return updated;
}

export async function listEmployerVacancies(
  userId: string,
  query: EmployerVacancyQuery,
): Promise<{ vacancies: EmployerVacancy[]; total: number; categories: EmployerCategoryOption[] }> {
  const { skip, take } = toPrismaPagination(query);

  if (query.companyId) {
    await assertOwnsCompany(userId, query.companyId);
  }

  const where: Prisma.VacancyWhereInput = {
    company: { ownerId: userId, ...(query.companyId ? { id: query.companyId } : {}) },
    ...(query.status === 'ALL' ? {} : { isActive: query.status === 'ACTIVE' }),
  };

  const [rows, total, categories] = await Promise.all([
    prisma.vacancy.findMany({
      where,
      select: VACANCY_SELECT,
      // Javob kutayotganlari tepada emas, YANGILARI tepada: ish
      // beruvchi odatda oxirgi joylagan e'lonini qidiradi.
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.vacancy.count({ where }),
    prisma.jobCategory.findMany({
      select: { id: true, slug: true, name: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  const pending = await countPendingByVacancy(rows.map((row) => row.id));

  return {
    vacancies: rows.map((row) => toEmployerVacancy(row, pending.get(row.id) ?? 0)),
    total,
    categories,
  };
}

export async function getEmployerVacancy(userId: string, vacancyId: string): Promise<EmployerVacancy> {
  const row = await prisma.vacancy.findFirst({
    where: { id: vacancyId, company: { ownerId: userId } },
    select: VACANCY_SELECT,
  });

  if (!row) {
    throw new NotFoundError('Vakansiya');
  }

  const pending = await countPendingByVacancy([row.id]);

  return toEmployerVacancy(row, pending.get(row.id) ?? 0);
}

export interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string;
}

export async function createVacancy(
  userId: string,
  input: CreateVacancyInput,
  meta: OperationMeta = {},
): Promise<EmployerVacancy> {
  await assertOwnsCompany(userId, input.companyId);
  await assertCategoryExists(input.categoryId);

  const created = await createWithUniqueSlug(input.title, (slug) =>
    prisma.vacancy.create({
      data: {
        companyId: input.companyId,
        categoryId: input.categoryId,
        slug,
        title: input.title,
        // Qidiruv uchun apostrofsiz nusxa — sabab `src/lib/search.ts` da.
        searchName: toSearchText(input.title),
        description: input.description,
        city: input.city,
        employmentType: input.employmentType,
        experienceLevel: input.experienceLevel,
        salaryMin: input.salaryMinSom === undefined ? null : somToTiyin(input.salaryMinSom),
        salaryMax: input.salaryMaxSom === undefined ? null : somToTiyin(input.salaryMaxSom),
      },
      select: VACANCY_SELECT,
    }),
  );

  await recordAudit({
    actorId: userId,
    action: AuditAction.JOB_VACANCY_CREATED,
    resourceType: 'Vacancy',
    resourceId: created.id,
    module: MODULE,
    metadata: { title: created.title, companyId: input.companyId },
    ...meta,
  });

  logger.info({ userId, vacancyId: created.id }, 'Vakansiya joylandi');

  return toEmployerVacancy(created, 0);
}

export async function updateVacancy(
  userId: string,
  vacancyId: string,
  input: UpdateVacancyInput,
  meta: OperationMeta = {},
): Promise<EmployerVacancy> {
  const current = await prisma.vacancy.findFirst({
    where: { id: vacancyId, company: { ownerId: userId } },
    select: { id: true, salaryMin: true, salaryMax: true },
  });

  if (!current) {
    throw new NotFoundError('Vakansiya');
  }

  if (input.categoryId) {
    await assertCategoryExists(input.categoryId);
  }

  const salaryMin = resolveSalary(input.salaryMinSom, current.salaryMin);
  const salaryMax = resolveSalary(input.salaryMaxSom, current.salaryMax);

  /**
   * Oraliq QAYTA tekshiriladi.
   *
   * Sxemada faqat bitta so'rovdagi ikkala qiymat solishtiriladi.
   * Lekin ish beruvchi faqat quyi chegarani yuborishi mumkin va u
   * bazadagi yuqori chegaradan katta bo'lib qolishi mumkin —
   * buni faqat shu yerda ko'rish mumkin.
   */
  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    throw new ValidationError("Quyi chegara yuqorisidan katta bo'lib qoldi");
  }

  const updated = await prisma.vacancy.update({
    where: { id: current.id },
    data: {
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.title ? { title: input.title, searchName: toSearchText(input.title) } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.city ? { city: input.city } : {}),
      ...(input.employmentType ? { employmentType: input.employmentType } : {}),
      ...(input.experienceLevel ? { experienceLevel: input.experienceLevel } : {}),
      ...(input.salaryMinSom === undefined ? {} : { salaryMin }),
      ...(input.salaryMaxSom === undefined ? {} : { salaryMax }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    },
    select: VACANCY_SELECT,
  });

  await recordAudit({
    actorId: userId,
    action: AuditAction.JOB_VACANCY_UPDATED,
    resourceType: 'Vacancy',
    resourceId: updated.id,
    module: MODULE,
    metadata: { changed: Object.keys(input) },
    ...meta,
  });

  const pending = await countPendingByVacancy([updated.id]);

  return toEmployerVacancy(updated, pending.get(updated.id) ?? 0);
}

/**
 * `null` — "maoshni olib tashla", `undefined` — "tegilmasin".
 * Ikkalasini bitta shart bilan hal qilib bo'lmaydi.
 */
function resolveSalary(incoming: number | null | undefined, currentValue: bigint | null): bigint | null {
  if (incoming === undefined) return currentValue;
  if (incoming === null) return null;

  return somToTiyin(incoming);
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  const category = await prisma.jobCategory.findUnique({ where: { id: categoryId }, select: { id: true } });

  if (!category) {
    throw new ValidationError("Bunday yo'nalish yo'q");
  }
}

/** Manzil bandligi tufayli takrorlanadigan urinishlar soni. */
const SLUG_ATTEMPTS = 20;

async function createWithUniqueSlug<T>(title: string, create: (slug: string) => Promise<T>): Promise<T> {
  const base = slugify(title).slice(0, 60) || 'vakansiya';

  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
    const slug = attempt === 0 ? base : `${base.slice(0, 55)}-${attempt + 1}`;

    try {
      return await create(slug);
    } catch (error) {
      if (!isUniqueSlugError(error)) throw error;
    }
  }

  throw new ConflictError("Shu nomdagi vakansiya juda ko'p. Lavozimni aniqroq yozing.");
}

/**
 * Bu xato aynan MANZIL bandligimi.
 *
 * Ikki joydan qaraladi: `@prisma/adapter-pg` `meta.target` ni har
 * doim ham to'ldirmaydi va ustun nomi faqat xabar matnida qoladi.
 * Buning sababi `seller.service.ts` da batafsil yozilgan — o'sha
 * xato haqiqiy bazada topilgan edi.
 */
function isUniqueSlugError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;
  const targetText = Array.isArray(target) ? target.join(',') : String(target ?? '');

  return `${targetText} ${error.message}`.toLowerCase().includes('slug');
}

// ── Arizalar ──────────────────────────────────────────────────────────

const APPLICATION_SELECT = {
  id: true,
  status: true,
  coverNote: true,
  employerNote: true,
  contactPhone: true,
  createdAt: true,
  viewedAt: true,
  decidedAt: true,
  user: { select: { firstName: true, lastName: true } },
  vacancy: {
    select: {
      id: true,
      slug: true,
      title: true,
      city: true,
      company: { select: { id: true, name: true, color: true } },
    },
  },
} as const;

type ApplicationRow = Prisma.JobApplicationGetPayload<{ select: typeof APPLICATION_SELECT }>;

function toEmployerApplication(row: ApplicationRow): EmployerApplication {
  return {
    id: row.id,
    status: row.status,
    coverNote: row.coverNote,
    employerNote: row.employerNote,
    createdAt: row.createdAt.toISOString(),
    viewedAt: row.viewedAt?.toISOString() ?? null,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    candidate: {
      firstName: row.user.firstName,
      lastName: row.user.lastName,
      // Raqam ARIZADAN olinadi, profildan emas — sabab `job.service.ts` da.
      phone: row.contactPhone,
    },
    vacancy: {
      id: row.vacancy.id,
      slug: row.vacancy.slug,
      title: row.vacancy.title,
      city: row.vacancy.city,
      company: {
        id: row.vacancy.company.id,
        name: row.vacancy.company.name,
        color: row.vacancy.company.color as ServiceColor,
      },
    },
  };
}

function buildApplicationFilter(status: EmployerApplicationQuery['status']): Prisma.JobApplicationWhereInput {
  if (status === 'ALL') return {};
  if (status === 'PENDING') return { status: { in: PENDING_STATUSES } };

  return { status: status as ApplicationStatus };
}

export async function listEmployerApplications(
  userId: string,
  query: EmployerApplicationQuery,
): Promise<{ applications: EmployerApplication[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  if (query.companyId) {
    await assertOwnsCompany(userId, query.companyId);
  }

  /**
   * EGALIK SHARTI — bu modulning eng muhim qatori.
   *
   * `vacancy.company.ownerId = userId` bo'lmasa, har qanday ish
   * beruvchi butun platformadagi nomzodlarning telefon raqamlarini
   * ko'rib chiqa olardi.
   */
  const where: Prisma.JobApplicationWhereInput = {
    vacancy: {
      company: { ownerId: userId, ...(query.companyId ? { id: query.companyId } : {}) },
      ...(query.vacancyId ? { id: query.vacancyId } : {}),
    },
    ...buildApplicationFilter(query.status),
  };

  const [rows, total] = await Promise.all([
    prisma.jobApplication.findMany({
      where,
      select: APPLICATION_SELECT,
      orderBy: { createdAt: query.order },
      skip,
      take,
    }),
    prisma.jobApplication.count({ where }),
  ]);

  return { applications: rows.map(toEmployerApplication), total };
}

/**
 * Ariza bo'yicha qaror qabul qiladi.
 *
 * ── Nima uchun `updateMany` va shart ──────────────────────────────────
 * Bitta kompaniyada bir nechta xodim bo'lishi mumkin va ikkalasi
 * ham bir vaqtda javob berishga urinishi mumkin. Eski holat sharti
 * ikkinchisini to'xtatadi: `count === 0` bo'lsa, kimdir allaqachon
 * javob bergan.
 *
 * Bu — buyurtma holatidagi bilan bir xil naqsh.
 */
export async function decideApplication(
  userId: string,
  applicationId: string,
  input: DecideApplicationInput,
  meta: OperationMeta = {},
): Promise<EmployerApplication> {
  const current = await prisma.jobApplication.findFirst({
    where: { id: applicationId, vacancy: { company: { ownerId: userId } } },
    select: {
      id: true,
      status: true,
      userId: true,
      vacancy: { select: { title: true, company: { select: { name: true } } } },
    },
  });

  if (!current) {
    throw new NotFoundError('Ariza');
  }

  if (!canTransition(current.status as ApplicationStatusName, input.status)) {
    throw new ConflictError(
      current.status === ApplicationStatus.WITHDRAWN
        ? 'Nomzod bu arizani qaytarib olgan.'
        : 'Bu arizaga allaqachon javob berilgan.',
    );
  }

  const now = new Date();
  const isDecision = input.status !== ApplicationStatus.VIEWED;

  const updated = await prisma.jobApplication.updateMany({
    where: { id: current.id, status: current.status },
    data: {
      status: input.status,
      employerNote: input.note ?? null,
      // "Ko'rildi" belgisi bir marta qo'yiladi va keyin o'zgarmaydi.
      viewedAt: current.status === ApplicationStatus.SENT ? now : undefined,
      decidedAt: isDecision ? now : undefined,
    },
  });

  if (updated.count === 0) {
    throw new ConflictError("Ariza holati o'zgardi. Sahifani yangilang.");
  }

  /**
   * Audit YOZILADI, chunki aynan shu daqiqada ish beruvchi
   * nomzodning telefon raqamini ko'rgan bo'ladi.
   */
  await recordAudit({
    actorId: userId,
    action: AuditAction.JOB_APPLICATION_REVIEWED,
    resourceType: 'JobApplication',
    resourceId: current.id,
    module: MODULE,
    metadata: { from: current.status, to: input.status, candidateId: current.userId },
    ...meta,
  });

  /**
   * Nomzodga xabar faqat YAKUNIY javobda yuboriladi.
   *
   * "Ko'rib chiqilmoqda" — bu hali javob emas. Har ochilganda xabar
   * yuborilsa, nomzodning bildirishnomalari foydasiz matnga to'lib
   * ketardi va haqiqiy javob ular orasida ko'rinmay qolardi.
   */
  if (isDecision) {
    await notifyUser(
      current.userId,
      input.status === ApplicationStatus.INVITED ? 'job.application_invited' : 'job.application_rejected',
      {
        applicationId: current.id,
        vacancyTitle: current.vacancy.title,
        companyName: current.vacancy.company.name,
        note: input.note ?? null,
      },
    );
  }

  logger.info({ userId, applicationId: current.id, status: input.status }, 'Ariza bo\'yicha qaror qabul qilindi');

  const row = await prisma.jobApplication.findUniqueOrThrow({
    where: { id: current.id },
    select: APPLICATION_SELECT,
  });

  return toEmployerApplication(row);
}
