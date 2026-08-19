-- CreateTable
CREATE TABLE "live_streams" (
    "id" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_reminders" (
    "id" UUID NOT NULL,
    "streamId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_streams_status_scheduledAt_idx" ON "live_streams"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "live_streams_hostId_scheduledAt_idx" ON "live_streams"("hostId", "scheduledAt");

-- CreateIndex
CREATE INDEX "live_reminders_userId_idx" ON "live_reminders"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "live_reminders_streamId_userId_key" ON "live_reminders"("streamId", "userId");

-- AddForeignKey
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_reminders" ADD CONSTRAINT "live_reminders_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "live_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_reminders" ADD CONSTRAINT "live_reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
