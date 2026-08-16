-- CreateTable
CREATE TABLE "post_seen" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_seen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_seen_userId_seenAt_idx" ON "post_seen"("userId", "seenAt");

-- CreateIndex
CREATE UNIQUE INDEX "post_seen_userId_postId_key" ON "post_seen"("userId", "postId");

-- AddForeignKey
ALTER TABLE "post_seen" ADD CONSTRAINT "post_seen_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_seen" ADD CONSTRAINT "post_seen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

