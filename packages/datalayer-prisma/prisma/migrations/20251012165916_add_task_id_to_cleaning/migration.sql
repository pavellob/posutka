-- AlterTable
ALTER TABLE "Cleaning" ADD COLUMN     "taskId" TEXT;

-- CreateIndex
CREATE INDEX "Cleaning_taskId_idx" ON "Cleaning"("taskId");
