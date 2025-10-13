-- AlterTable
ALTER TABLE "Cleaner" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Cleaner_isActive_idx" ON "Cleaner"("isActive");

-- CreateIndex
CREATE INDEX "Cleaner_deletedAt_idx" ON "Cleaner"("deletedAt");
