-- AlterTable
ALTER TABLE "Cleaning" ADD COLUMN     "assessedAt" TIMESTAMP(3),
ADD COLUMN     "assessedDifficulty" INTEGER;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "cleaningDifficulty" INTEGER DEFAULT 0,
ADD COLUMN     "grade" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "CleaningPricingRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "unitId" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'BASIC',
    "baseCleaningPrice" INTEGER NOT NULL,
    "baseCleaningCurrency" TEXT NOT NULL DEFAULT 'RUB',
    "gradeStep" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "difficultyStep" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "increasedDifficultyDelta" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "extras" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningPricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CleaningPricingRule_orgId_idx" ON "CleaningPricingRule"("orgId");

-- CreateIndex
CREATE INDEX "CleaningPricingRule_unitId_idx" ON "CleaningPricingRule"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "CleaningPricingRule_orgId_unitId_key" ON "CleaningPricingRule"("orgId", "unitId");
