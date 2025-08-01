-- CreateTable
CREATE TABLE "approval_conversations" (
    "id" TEXT NOT NULL,
    "approvalId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'user',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_conversations_approvalId_idx" ON "approval_conversations"("approvalId");

-- CreateIndex
CREATE INDEX "approval_conversations_authorId_idx" ON "approval_conversations"("authorId");

-- CreateIndex
CREATE INDEX "approval_conversations_createdAt_idx" ON "approval_conversations"("createdAt");

-- AddForeignKey
ALTER TABLE "approval_conversations" ADD CONSTRAINT "approval_conversations_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "request_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_conversations" ADD CONSTRAINT "approval_conversations_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
