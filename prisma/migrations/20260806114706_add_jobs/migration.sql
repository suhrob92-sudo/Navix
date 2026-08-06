-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('NONE', 'JUNIOR', 'MIDDLE', 'SENIOR');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SENT', 'VIEWED', 'INVITED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "ownerId" UUID,
    "slug" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(400) NOT NULL,
    "searchName" VARCHAR(200) NOT NULL,
    "industry" VARCHAR(60) NOT NULL,
    "city" VARCHAR(80) NOT NULL,
    "color" VARCHAR(20) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_categories" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "icon" VARCHAR(40) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancies" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "slug" VARCHAR(90) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(4000) NOT NULL,
    "searchName" VARCHAR(220) NOT NULL,
    "salaryMin" BIGINT,
    "salaryMax" BIGINT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'NONE',
    "city" VARCHAR(80) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" UUID NOT NULL,
    "vacancyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SENT',
    "coverNote" VARCHAR(1000),
    "contactPhone" VARCHAR(20) NOT NULL,
    "employerNote" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_isActive_sortOrder_idx" ON "companies"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "companies_ownerId_idx" ON "companies"("ownerId");

-- CreateIndex
CREATE INDEX "companies_searchName_idx" ON "companies"("searchName");

-- CreateIndex
CREATE UNIQUE INDEX "job_categories_slug_key" ON "job_categories"("slug");

-- CreateIndex
CREATE INDEX "job_categories_sortOrder_idx" ON "job_categories"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "vacancies_slug_key" ON "vacancies"("slug");

-- CreateIndex
CREATE INDEX "vacancies_companyId_isActive_idx" ON "vacancies"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "vacancies_categoryId_sortOrder_idx" ON "vacancies"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "vacancies_searchName_idx" ON "vacancies"("searchName");

-- CreateIndex
CREATE INDEX "vacancies_isActive_createdAt_idx" ON "vacancies"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "job_applications_userId_createdAt_idx" ON "job_applications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "job_applications_vacancyId_status_idx" ON "job_applications"("vacancyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_vacancyId_userId_key" ON "job_applications"("vacancyId", "userId");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "job_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
