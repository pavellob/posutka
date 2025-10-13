-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assignedCleanerId" TEXT;

-- CreateIndex
CREATE INDEX "Task_assignedCleanerId_idx" ON "Task"("assignedCleanerId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedCleanerId_fkey" FOREIGN KEY ("assignedCleanerId") REFERENCES "Cleaner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
