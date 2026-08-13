-- CreateTable
CREATE TABLE "module_switches" (
    "moduleId" VARCHAR(40) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reason" VARCHAR(200),
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_switches_pkey" PRIMARY KEY ("moduleId")
);

-- AddForeignKey
ALTER TABLE "module_switches" ADD CONSTRAINT "module_switches_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
