-- AlterTable
ALTER TABLE "Repair" ADD COLUMN     "isPlannedInspection" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RepairTemplate" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "estimatedDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairTemplateCheckbox" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairTemplateCheckbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepairTemplate_unitId_idx" ON "RepairTemplate"("unitId");

-- CreateIndex
CREATE INDEX "RepairTemplateCheckbox_templateId_idx" ON "RepairTemplateCheckbox"("templateId");

-- AddForeignKey
ALTER TABLE "RepairTemplateCheckbox" ADD CONSTRAINT "RepairTemplateCheckbox_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RepairTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
