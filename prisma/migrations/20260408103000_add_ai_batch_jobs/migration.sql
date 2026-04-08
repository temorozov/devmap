-- CreateTable
CREATE TABLE "AiBatchJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "treeId" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "batchId" TEXT,
    "inputFileId" TEXT,
    "outputFileId" TEXT,
    "errorFileId" TEXT,
    "inputJsonlPath" TEXT,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "lastError" TEXT,
    "completedAt" TIMESTAMP(3),
    "resultsAppliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiBatchJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiBatchJob_batchId_key" ON "AiBatchJob"("batchId");

-- CreateIndex
CREATE INDEX "AiBatchJob_userId_createdAt_idx" ON "AiBatchJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiBatchJob_treeId_createdAt_idx" ON "AiBatchJob"("treeId", "createdAt");

-- CreateIndex
CREATE INDEX "AiBatchJob_status_createdAt_idx" ON "AiBatchJob"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AiBatchJob" ADD CONSTRAINT "AiBatchJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiBatchJob" ADD CONSTRAINT "AiBatchJob_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree"("id") ON DELETE CASCADE ON UPDATE CASCADE;
