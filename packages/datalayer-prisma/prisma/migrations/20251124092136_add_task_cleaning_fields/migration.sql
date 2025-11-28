-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "checklistItemKey" TEXT,
ADD COLUMN     "cleaningId" TEXT;

-- CreateIndex
CREATE INDEX "Task_cleaningId_idx" ON "Task"("cleaningId");

-- CreateIndex
CREATE INDEX "Task_checklistItemKey_idx" ON "Task"("checklistItemKey");
