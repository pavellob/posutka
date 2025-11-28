-- CreateTable
CREATE TABLE "RepairPricingRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "unitId" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'BASIC',
    "baseRepairPrice" INTEGER NOT NULL,
    "baseRepairCurrency" TEXT NOT NULL DEFAULT 'RUB',
    "gradeStep" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "difficultyStep" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "increasedDifficultyDelta" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "extras" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairPricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepairPricingRule_orgId_idx" ON "RepairPricingRule"("orgId");

-- CreateIndex
CREATE INDEX "RepairPricingRule_unitId_idx" ON "RepairPricingRule"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "RepairPricingRule_orgId_unitId_key" ON "RepairPricingRule"("orgId", "unitId");
