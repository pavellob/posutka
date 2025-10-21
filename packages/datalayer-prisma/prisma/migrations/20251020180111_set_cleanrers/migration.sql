-- DropForeignKey
ALTER TABLE "Cleaning" DROP CONSTRAINT "Cleaning_cleanerId_fkey";

-- AlterTable
ALTER TABLE "Cleaning" ALTER COLUMN "cleanerId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UnitPreferredCleaner" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnitPreferredCleaner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnitPreferredCleaner_unitId_idx" ON "UnitPreferredCleaner"("unitId");

-- CreateIndex
CREATE INDEX "UnitPreferredCleaner_cleanerId_idx" ON "UnitPreferredCleaner"("cleanerId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitPreferredCleaner_unitId_cleanerId_key" ON "UnitPreferredCleaner"("unitId", "cleanerId");

-- AddForeignKey
ALTER TABLE "UnitPreferredCleaner" ADD CONSTRAINT "UnitPreferredCleaner_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitPreferredCleaner" ADD CONSTRAINT "UnitPreferredCleaner_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "Cleaner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "Cleaner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
