-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assignedMasterId" TEXT;

-- CreateIndex
CREATE INDEX "Task_assignedMasterId_idx" ON "Task"("assignedMasterId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedMasterId_fkey" FOREIGN KEY ("assignedMasterId") REFERENCES "Master"("id") ON DELETE SET NULL ON UPDATE CASCADE;
