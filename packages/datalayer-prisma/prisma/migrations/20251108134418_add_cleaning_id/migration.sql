-- AlterTable
ALTER TABLE "ChecklistInstance" ADD COLUMN     "cleaningId" TEXT;

-- CreateIndex
CREATE INDEX "ChecklistInstance_cleaningId_stage_idx" ON "ChecklistInstance"("cleaningId", "stage");

-- AddForeignKey
ALTER TABLE "ChecklistInstance" ADD CONSTRAINT "ChecklistInstance_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;
