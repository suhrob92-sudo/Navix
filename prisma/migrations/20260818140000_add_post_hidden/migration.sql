-- CreateTable
CREATE TABLE "post_hidden" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_hidden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_hidden_userId_createdAt_idx" ON "post_hidden"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "post_hidden_userId_postId_key" ON "post_hidden"("userId", "postId");

-- AddForeignKey
ALTER TABLE "post_hidden" ADD CONSTRAINT "post_hidden_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_hidden" ADD CONSTRAINT "post_hidden_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
