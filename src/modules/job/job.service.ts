import { ApplicationStatus, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { AuditAction, recordAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { somToTiyin, tiyinToNumber } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { toSearchText } from '@/lib/search';
import { MAX_SIMILAR, pickSimilar } from '@/config/similar-jobs';
import { GALLERY_SELECT, toGallery } from '@/modules/catalog/catalog-image.select';
import type { ServiceColor } from '@/config/modules';
import { notifyUser } from '@/modules/notification/notification.service';
import type { ApplicationQuery, CreateApplicationInput, VacancyQuery } from '@/modules/job/job.schemas';
import {
  canWithdraw,
  type ApplicationStatusName,
  type CompanyDetail,
  type JobApplicationView,
  type JobCategoryView,
  type VacancyDetail,
  type VacancyListItem,
} from '@/modules/job/job.types';

/**
 * Ish qidirish moduli.
 *
 * ── Boshqa modullardan ENG KATTA farqi: PUL YO'Q ──────────────────────
 * Ovqat, Marketplace va kuryerda har amal hamyonga tegardi — shuning
 * uchun u yerlarda idempotentlik kaliti, tranzaksiya va qaytarish
 * mexanizmi kerak edi.
 *
 * Bu yerda ular kerak emas va ATAYLAB qo'shilmadi: keraksiz murakkablik
 * kodni tushunishni qiyinlashtiradi.
 *
 * ── Lekin bitta himoya baribir kerak ──────────────────────────────────
 * Bir nomzod bitta e'longa o'nlab ariza yuborishi mumkin edi. Buni
 * dasturda tekshirish yetarli emas: ikki so'rov bir vaqtda kelsa,
 * ikkalasi ham "hali yo'q" deb ko'radi.
 *
 * Shuning uchun qoidani BAZA qo'riqlaydi:
 *
 *     @@unique([vacancyId, userId])
 *
 * Ikkinchi yozuv UNIQUE xatosiga uchraydi va biz uni tushunarli
 * xabarga aylantiramiz. Bu — hamyondagi idempotentlik kaliti bilan
 * bir xil naqsh.
 *
 * ── Qidiruv ──────────────────────────────────────────────────────────
 * `searchName` ustuni va `toSearchText()` — apostrof muammosi
 * `src/lib/search.ts` da tushuntirilgan. Bu yerda hech qanday yangilik
 * yo'q, o'sha yechim qayta ishlatiladi.
 */

const MODULE = 'jobs';

// ── Yo'nalishlar ──────────────────────────────────────────────────────

/**
 * Yo'nalishlar ro'yxati — har birida nechta ochiq vakansiya bor.
 *
 * Bo'sh yo'nalish ko'rsatilmaydi: foydalanuvchi uni bosib, bo'sh
 * sahifaga tushsa — bu xatolikdek tuyuladi.
 */
export async function listJobCategories(): Promise<JobCategoryView[]> {
  const categories = await prisma.jobCategory.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      _count: { select: { vacancies: { where: { isActive: true, company: { isActive: true } } } } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return categories
    .filter((category) => category._count.vacancies > 0)
    .map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      icon: category.icon,
      vacancyCount: category._count.vacancies,
    }));
}

// ── Vakansiyalar ──────────────────────────────────────────────────────

const VACANCY_SELECT = {
  id: true,
  slug: true,
  title: true,
  salaryMin: true,
  salaryMax: true,
  employmentType: true,
  experienceLevel: true,
  city: true,
  createdAt: true,
  company: { select: { id: true, slug: true, name: true, industry: true, color: true } },
  category: { select: { slug: true, name: true } },
} as const;

type VacancyRow = Prisma.VacancyGetPayload<{ select: typeof VACANCY_SELECT }>;

function toVacancyItem(row: VacancyRow, appliedIds: Set<string>): VacancyListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    salaryMin: row.salaryMin === null ? null : tiyinToNumber(row.salaryMin),
    salaryMax: row.salaryMax === null ? null : tiyinToNumber(row.salaryMax),
    employmentType: row.employmentType,
    experienceLevel: row.experienceLevel,
    city: row.city,
    createdAt: row.createdAt.toISOString(),
    company: {
      id: row.company.id,
      slug: row.company.slug,
      name: row.company.name,
      industry: row.company.industry,
      color: row.company.color as ServiceColor,
    },
    category: { slug: row.category.slug, name: row.category.name },
    hasApplied: appliedIds.has(row.id),
  };
}

/**
 * Foydalanuvchi qaysi vakansiyalarga ariza yuborganini bitta so'rovda
 * oladi.
 *
 * Har bir e'lon uchun alohida so'rov yuborilsa, 20 ta e'lonli sahifa
 * 21 ta so'rov qilardi (N+1 muammosi).
 *
 * Kirmagan foydalanuvchida bo'sh to'plam qaytadi — hech qanday
 * qo'shimcha so'rov bo'lmaydi.
 */
async function findAppliedVacancyIds(userId: string | null, vacancyIds: string[]): Promise<Set<string>> {
  if (!userId || vacancyIds.length === 0) return new Set();

  const rows = await prisma.jobApplication.findMany({
    where: { userId, vacancyId: { in: vacancyIds }, status: { not: ApplicationStatus.WITHDRAWN } },
    select: { vacancyId: true },
  });

  return new Set(rows.map((row) => row.vacancyId));
}

/** Saralash tartibi. */
function buildVacancyOrder(sort: VacancyQuery['sort']): Prisma.VacancyOrderByWithRelationInput[] {
  if (sort === 'salary') {
    /**
     * Maosh bo'yicha saralashda `null` (kelishilgan) OXIRIDA turadi.
     *
     * Aks holda maoshi ko'rsatilmagan e'lonlar eng qimmatlari bilan
     * aralashib ketardi va ro'yxat ma'nosini yo'qotardi.
     */
    return [{ salaryMax: { sort: 'desc', nulls: 'last' } }, { salaryMin: { sort: 'desc', nulls: 'last' } }];
  }

  return [{ createdAt: 'desc' }, { sortOrder: 'asc' }];
}

/**
 * Maosh va qidiruv shartlari — BITTA ro'yxatda.
 *
 * Ular alohida `OR` ishlatadi va bitta obyektda ikkita `OR` kaliti
 * bo'lolmaydi, shuning uchun hammasi `AND` massiviga yig'iladi.
 */
function buildVacancyConditions(query: VacancyQuery, needle: string | null): Prisma.VacancyWhereInput[] {
  const conditions: Prisma.VacancyWhereInput[] = [];

  /*
    ── Eng kam maosh ───────────────────────────────────────────────────
    Ikkala chegara ham tekshiriladi: "5 mln dan boshlab" degan e'lon
    (`salaryMin` bor, `salaryMax` yo'q) 4 mln so'roviga to'g'ri keladi.

    Maoshi umuman ko'rsatilmaganlar chiqib ketadi — bu to'g'ri,
    chunki foydalanuvchi aynan summani so'radi.
  */
  if (query.minSalarySom !== undefined) {
    const floor = somToTiyin(query.minSalarySom);

    conditions.push({ OR: [{ salaryMax: { gte: floor } }, { salaryMin: { gte: floor } }] });
  }

  /*
    ── Eng ko'p maosh ──────────────────────────────────────────────────
    ── Nima uchun bu filtr umuman kerak ──────────────────────────────
    Birinchi qarashda g'alati: kim maoshni CHEKLAMOQCHI?

    Lekin ish qidiruvchi buni tez-tez qiladi: "20 mln lik senior
    vakansiyalar menga to'g'ri kelmaydi, ular meni chaqirmaydi".
    Yuqori chegara ro'yxatni HAQIQIY imkoniyatlar bilan to'ldiradi.

    Solishtiruv `salaryMin` bo'yicha: e'lon SHU summadan
    boshlanmasligi kerak.
  */
  if (query.maxSalarySom !== undefined) {
    const ceiling = somToTiyin(query.maxSalarySom);

    conditions.push({ OR: [{ salaryMin: { lte: ceiling } }, { salaryMax: { lte: ceiling } }] });
  }

  if (needle && needle.length > 0) {
    conditions.push({
      OR: [
        // So'z boshidan moslik — sabab `assistant.food.ts` da.
        { searchName: { startsWith: needle } },
        { searchName: { contains: ` ${needle}` } },
        { company: { searchName: { contains: needle } } },
      ],
    });
  }

  return conditions;
}

/**
 * Vakansiyalarni qidiradi va filtrlaydi.
 *
 * `userId` ixtiyoriy: kirmagan odam ham e'lonlarni ko'ra oladi —
 * faqat "ariza yuborilgan" belgisi bo'lmaydi.
 */
export async function listVacancies(
  query: VacancyQuery,
  userId: string | null,
): Promise<{ vacancies: VacancyListItem[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  const needle = query.search ? toSearchText(query.search) : null;

  const where: Prisma.VacancyWhereInput = {
    isActive: true,
    company: { isActive: true, ...(query.company ? { slug: query.company } : {}) },
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
    ...(query.employmentType ? { employmentType: query.employmentType } : {}),
    ...(query.experienceLevel ? { experienceLevel: query.experienceLevel } : {}),
    /*
      ── Nima uchun hammasi BITTA `AND` ichida ─────────────────────────
      Maosh sharti ham, qidiruv sharti ham `OR` ishlatadi. Ular
      to'g'ridan-to'g'ri `where` ga yozilsa, ikkinchisi birinchisini
      ALMASHTIRIB yuborardi — bitta obyektda ikkita `OR` kaliti
      bo'lolmaydi.

      Natijada maosh filtri jimgina yo'qolardi va buni hech kim
      sezmasdi: ro'yxat chiqadi, faqat filtr ishlamaydi.
    */
    AND: buildVacancyConditions(query, needle),
  };

  const [rows, total] = await Promise.all([
    prisma.vacancy.findMany({ where, select: VACANCY_SELECT, orderBy: buildVacancyOrder(query.sort), skip, take }),
    prisma.vacancy.count({ where }),
  ]);

  const applied = await findAppliedVacancyIds(
    userId,
    rows.map((row) => row.id),
  );

  return { vacancies: rows.map((row) => toVacancyItem(row, applied)), total };
}

/**
 * O'xshashlik uchun ko'riladigan e'lonlar soni.
 *
 * Bir yo'nalishda undan ko'p e'lon bo'lsa ham, eng yangi 40 tasidan
 * tanlash yetarli: eskiroq e'lonlar odatda allaqachon yopilgan
 * bo'ladi va so'rov ham yengil qoladi.
 */
const SIMILAR_CANDIDATE_LIMIT = 40;

/** Bitta vakansiya — kompaniya tavsifi va o'xshash e'lonlar bilan. */
export async function getVacancy(
  slug: string,
  userId: string | null,
): Promise<{ vacancy: VacancyDetail; related: VacancyListItem[] }> {
  const row = await prisma.vacancy.findFirst({
    where: { slug, isActive: true, company: { isActive: true } },
    select: {
      ...VACANCY_SELECT,
      description: true,
      categoryId: true,
      company: {
        select: { id: true, slug: true, name: true, industry: true, color: true, description: true, city: true },
      },
      _count: { select: { applications: { where: { status: { not: ApplicationStatus.WITHDRAWN } } } } },
    },
  });

  if (!row) {
    throw new NotFoundError('Vakansiya');
  }

  const applied = await findAppliedVacancyIds(userId, [row.id]);

  /*
    ── O'xshash vakansiyalar ───────────────────────────────────────────
    Avval bu yerda "shu yo'nalishdagi eng yangi to'rtta" olinardi.
    U ishlardi, lekin o'xshashlikni deyarli hisobga olmasdi:
    Toshkentdagi middle dasturchini ochgan odamga Nukusdagi
    tajribasiz e'lon chiqishi mumkin edi — faqat u yangiroq
    bo'lgani uchun.

    Endi kengroq ro'yxat olinadi va u BALL bo'yicha tartiblanadi:
    shahar, tajriba, bandlik turi va maosh yaqinligi hisobga
    olinadi (`src/config/similar-jobs.ts`).

    Chegara — 40 ta: bir yo'nalishda undan ko'p e'lon bo'lsa ham,
    eng yangi 40 tasidan tanlash yetarli va so'rov yengil qoladi.
  */
  const candidateRows = await prisma.vacancy.findMany({
    where: {
      categoryId: row.categoryId,
      id: { not: row.id },
      isActive: true,
      company: { isActive: true },
    },
    select: VACANCY_SELECT,
    orderBy: { createdAt: 'desc' },
    take: SIMILAR_CANDIDATE_LIMIT,
  });

  const toCandidate = (item: { id: string; city: string; experienceLevel: string; employmentType: string; salaryMin: bigint | null; salaryMax: bigint | null }) => ({
    id: item.id,
    /* Barchasi bir xil yo'nalishdan — shart allaqachon bajarilgan. */
    categorySlug: row.category.slug,
    city: item.city,
    experienceLevel: item.experienceLevel,
    employmentType: item.employmentType,
    salaryMin: item.salaryMin === null ? null : Number(item.salaryMin),
    salaryMax: item.salaryMax === null ? null : Number(item.salaryMax),
  });

  const ranked = pickSimilar(
    toCandidate({ ...row, id: row.id }),
    candidateRows.map((item) => toCandidate(item)),
    MAX_SIMILAR,
  );

  const rankedIds = new Set(ranked.map((item) => item.id));
  const byId = new Map(candidateRows.map((item) => [item.id, item]));

  /* Tartib `pickSimilar` dan olinadi — bazadan kelgan tartib emas. */
  const relatedRows = ranked.flatMap((item) => {
    const found = byId.get(item.id);

    return found ? [found] : [];
  });

  const relatedApplied = await findAppliedVacancyIds(userId, [...rankedIds]);

  return {
    vacancy: {
      ...toVacancyItem({ ...row, company: row.company }, applied),
      description: row.description,
      company: {
        id: row.company.id,
        slug: row.company.slug,
        name: row.company.name,
        industry: row.company.industry,
        color: row.company.color as ServiceColor,
        description: row.company.description,
        city: row.company.city,
      },
      applicationCount: row._count.applications,
    },
    related: relatedRows.map((item) => toVacancyItem(item, relatedApplied)),
  };
}

/**
 * Bitta kompaniya va uning ochiq vakansiyalari.
 *
 * ── Nima uchun vakansiyalar SHU YERDA olinadi ─────────────────────────
 * Ularni alohida so'rov bilan olish mumkin edi va sahifa
 * moslashuvchanroq bo'lardi.
 *
 * Lekin kompaniya sahifasining butun mazmuni — uning vakansiyalari.
 * Ikkita so'rov ikkita kutish degani: odam avval nomni ko'radi,
 * keyin bo'sh joyni, keyin ro'yxat paydo bo'ladi. Bitta so'rovda
 * sahifa bir marta chiziladi.
 *
 * ── Nima uchun chegara bor ────────────────────────────────────────────
 * Katta kompaniyada yuzlab e'lon bo'lishi mumkin. Hammasini bitta
 * sahifaga chiqarish telefonni qotirardi. Qolganini ko'rish uchun
 * umumiy ro'yxatga havola beriladi — u yerda filtr ham bor.
 */
export async function getCompany(
  slug: string,
  userId: string | null,
): Promise<{ company: CompanyDetail; vacancies: VacancyListItem[] }> {
  const row = await prisma.company.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      industry: true,
      color: true,
      description: true,
      city: true,
      images: GALLERY_SELECT,
      _count: { select: { vacancies: { where: { isActive: true } } } },
    },
  });

  if (!row) {
    throw new NotFoundError('Kompaniya');
  }

  const vacancyRows = await prisma.vacancy.findMany({
    where: { companyId: row.id, isActive: true },
    select: VACANCY_SELECT,
    orderBy: [{ createdAt: 'desc' }, { sortOrder: 'asc' }],
    take: COMPANY_VACANCY_LIMIT,
  });

  const applied = await findAppliedVacancyIds(
    userId,
    vacancyRows.map((item) => item.id),
  );

  return {
    company: {
      id: row.id,
      slug: row.slug,
      name: row.name,
      industry: row.industry,
      color: row.color as ServiceColor,
      description: row.description,
      city: row.city,
      vacancyCount: row._count.vacancies,
      images: toGallery(row.images),
    },
    vacancies: vacancyRows.map((item) => toVacancyItem(item, applied)),
  };
}

/**
 * Kompaniya sahifasida ko'rsatiladigan e'lonlar soni.
 *
 * Qolganini umumiy ro'yxatdan ko'rish mumkin — u yerda filtr ham bor.
 */
const COMPANY_VACANCY_LIMIT = 20;

/** Vakansiyalar joylashgan shaharlar — filtr ro'yxati uchun. */
export async function listVacancyCities(): Promise<string[]> {
  const rows = await prisma.vacancy.groupBy({
    by: ['city'],
    where: { isActive: true, company: { isActive: true } },
    _count: { _all: true },
    orderBy: { _count: { city: 'desc' } },
  });

  return rows.map((row) => row.city);
}

// ── Arizalar ──────────────────────────────────────────────────────────

const APPLICATION_SELECT = {
  id: true,
  status: true,
  coverNote: true,
  employerNote: true,
  createdAt: true,
  viewedAt: true,
  decidedAt: true,
  vacancy: {
    select: {
      id: true,
      slug: true,
      title: true,
      city: true,
      company: { select: { id: true, slug: true, name: true, industry: true, color: true } },
    },
  },
} as const;

type ApplicationRow = Prisma.JobApplicationGetPayload<{ select: typeof APPLICATION_SELECT }>;

function toApplicationView(row: ApplicationRow): JobApplicationView {
  return {
    id: row.id,
    status: row.status,
    coverNote: row.coverNote,
    employerNote: row.employerNote,
    createdAt: row.createdAt.toISOString(),
    viewedAt: row.viewedAt?.toISOString() ?? null,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    vacancy: {
      id: row.vacancy.id,
      slug: row.vacancy.slug,
      title: row.vacancy.title,
      city: row.vacancy.city,
      company: {
        id: row.vacancy.company.id,
        slug: row.vacancy.company.slug,
        name: row.vacancy.company.name,
        industry: row.vacancy.company.industry,
        color: row.vacancy.company.color as ServiceColor,
      },
    },
  };
}

/**
 * Ariza yuboradi.
 *
 * ── Telefon raqami PROFILDAN olinadi ──────────────────────────────────
 * So'rovdan kelmaydi va bu ataylab: aks holda nomzod boshqa odamning
 * raqamini yozib, uni keraksiz qo'ng'iroqqa ko'mib tashlashi mumkin
 * bo'lardi.
 *
 * Raqam ariza yozuviga NUSXA qilinadi: nomzod keyinchalik uni
 * o'zgartirsa ham, ish beruvchi ariza kelgan paytdagi raqamga
 * qo'ng'iroq qiladi.
 */
export async function createApplication(
  userId: string,
  input: CreateApplicationInput,
): Promise<JobApplicationView> {
  const vacancy = await prisma.vacancy.findFirst({
    where: { id: input.vacancyId, isActive: true, company: { isActive: true } },
    select: { id: true, title: true, company: { select: { name: true } } },
  });

  if (!vacancy) {
    throw new NotFoundError('Vakansiya');
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { phone: true },
  });

  let created: ApplicationRow;

  try {
    created = await prisma.jobApplication.create({
      data: {
        vacancyId: vacancy.id,
        userId,
        coverNote: input.coverNote ?? null,
        contactPhone: user.phone,
      },
      select: APPLICATION_SELECT,
    });
  } catch (error) {
    /**
     * UNIQUE xatosi — nomzod bu e'longa allaqachon ariza yuborgan.
     *
     * Bu "xato" emas, KUTILGAN holat: foydalanuvchi tugmani ikki marta
     * bosgan yoki ikkita ochiq varaqdan yuborgan bo'lishi mumkin.
     * Shuning uchun javob tushunarli va aybsiz bo'ladi.
     */
    if (isDuplicateApplication(error)) {
      throw new ConflictError('Siz bu vakansiyaga allaqachon ariza yuborgansiz.');
    }

    throw error;
  }

  await recordAudit({
    actorId: userId,
    action: AuditAction.JOB_APPLICATION_SENT,
    resourceType: 'JobApplication',
    resourceId: created.id,
    module: MODULE,
    metadata: { vacancyId: vacancy.id, title: vacancy.title, company: vacancy.company.name },
  });

  await notifyUser(userId, 'job.application_sent', {
    applicationId: created.id,
    vacancyTitle: vacancy.title,
    companyName: vacancy.company.name,
  });

  logger.info({ userId, vacancyId: vacancy.id, applicationId: created.id }, 'Ariza yuborildi');

  return toApplicationView(created);
}

function isDuplicateApplication(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** Nomzodning o'z arizalari. */
export async function listApplications(
  userId: string,
  query: ApplicationQuery,
): Promise<{ applications: JobApplicationView[]; total: number }> {
  const { skip, take } = toPrismaPagination(query);

  const where: Prisma.JobApplicationWhereInput = { userId, ...buildApplicationFilter(query.status) };

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

  return { applications: rows.map(toApplicationView), total };
}

function buildApplicationFilter(status: ApplicationQuery['status']): Prisma.JobApplicationWhereInput {
  if (status === 'ALL') return {};

  // "Faol" — javob hali kelmagan arizalar.
  if (status === 'ACTIVE') {
    return { status: { in: [ApplicationStatus.SENT, ApplicationStatus.VIEWED] } };
  }

  return { status: status as ApplicationStatus };
}

/**
 * Nomzod arizasini qaytarib oladi.
 *
 * Faqat javob kelmagan bo'lsa mumkin — buni holatlar jadvali
 * (`APPLICATION_TRANSITIONS`) hal qiladi. Rad etilgan yoki taklif
 * qilingan arizani "qaytarib olish" ma'nosiz: qaror allaqachon
 * qabul qilingan.
 *
 * Yozuv O'CHIRILMAYDI, holati o'zgaradi. Shunda `@@unique` cheklovi
 * kuchda qoladi va nomzod arizani qaytarib olib, keyin qayta-qayta
 * yuborib ish beruvchini bezovta qila olmaydi.
 */
export async function withdrawApplication(userId: string, applicationId: string): Promise<JobApplicationView> {
  const application = await prisma.jobApplication.findFirst({
    where: { id: applicationId, userId },
    select: { id: true, status: true },
  });

  if (!application) {
    throw new NotFoundError('Ariza');
  }

  if (!canWithdraw(application.status as ApplicationStatusName)) {
    throw new ConflictError('Bu arizaga javob berilgan — uni qaytarib olib bo\'lmaydi.');
  }

  // Eski holat sharti — raqobatdan himoya: shu oraliqda ish beruvchi
  // javob bergan bo'lishi mumkin.
  const updated = await prisma.jobApplication.updateMany({
    where: { id: application.id, status: application.status },
    data: { status: ApplicationStatus.WITHDRAWN, decidedAt: new Date() },
  });

  if (updated.count === 0) {
    throw new ConflictError("Ariza holati o'zgardi. Sahifani yangilang.");
  }

  await recordAudit({
    actorId: userId,
    action: AuditAction.JOB_APPLICATION_WITHDRAWN,
    resourceType: 'JobApplication',
    resourceId: application.id,
    module: MODULE,
  });

  logger.info({ userId, applicationId: application.id }, 'Ariza qaytarib olindi');

  const row = await prisma.jobApplication.findUniqueOrThrow({
    where: { id: application.id },
    select: APPLICATION_SELECT,
  });

  return toApplicationView(row);
}
