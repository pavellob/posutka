-- CreateEnum
CREATE TYPE "MasterType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MASTER';

-- AlterTable
ALTER TABLE "ChecklistInstance" ADD COLUMN     "repairId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "checklistItemInstanceId" TEXT,
ADD COLUMN     "plannedForNextChecklist" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceCleaningId" TEXT;

-- CreateTable
CREATE TABLE "Master" (
    "id" TEXT NOT NULL,
    "type" "MasterType" NOT NULL DEFAULT 'EXTERNAL',
    "userId" TEXT,
    "orgId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "telegramUsername" TEXT,
    "rating" DOUBLE PRECISION DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repair" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "masterId" TEXT,
    "unitId" TEXT NOT NULL,
    "bookingId" TEXT,
    "taskId" TEXT,
    "status" "RepairStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitPreferredMaster" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnitPreferredMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Master_orgId_idx" ON "Master"("orgId");

-- CreateIndex
CREATE INDEX "Master_userId_idx" ON "Master"("userId");

-- CreateIndex
CREATE INDEX "Master_type_idx" ON "Master"("type");

-- CreateIndex
CREATE INDEX "Master_isActive_idx" ON "Master"("isActive");

-- CreateIndex
CREATE INDEX "Master_deletedAt_idx" ON "Master"("deletedAt");

-- CreateIndex
CREATE INDEX "Master_telegramUsername_idx" ON "Master"("telegramUsername");

-- CreateIndex
CREATE INDEX "Repair_orgId_idx" ON "Repair"("orgId");

-- CreateIndex
CREATE INDEX "Repair_masterId_idx" ON "Repair"("masterId");

-- CreateIndex
CREATE INDEX "Repair_unitId_idx" ON "Repair"("unitId");

-- CreateIndex
CREATE INDEX "Repair_bookingId_idx" ON "Repair"("bookingId");

-- CreateIndex
CREATE INDEX "Repair_taskId_idx" ON "Repair"("taskId");

-- CreateIndex
CREATE INDEX "Repair_scheduledAt_idx" ON "Repair"("scheduledAt");

-- CreateIndex
CREATE INDEX "UnitPreferredMaster_unitId_idx" ON "UnitPreferredMaster"("unitId");

-- CreateIndex
CREATE INDEX "UnitPreferredMaster_masterId_idx" ON "UnitPreferredMaster"("masterId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitPreferredMaster_unitId_masterId_key" ON "UnitPreferredMaster"("unitId", "masterId");

-- CreateIndex
CREATE INDEX "ChecklistInstance_repairId_stage_idx" ON "ChecklistInstance"("repairId", "stage");

-- CreateIndex
CREATE INDEX "Task_checklistItemInstanceId_idx" ON "Task"("checklistItemInstanceId");

-- CreateIndex
CREATE INDEX "Task_unitId_plannedForNextChecklist_idx" ON "Task"("unitId", "plannedForNextChecklist");

-- CreateIndex
CREATE INDEX "Task_sourceCleaningId_idx" ON "Task"("sourceCleaningId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_checklistItemInstanceId_fkey" FOREIGN KEY ("checklistItemInstanceId") REFERENCES "ChecklistInstanceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "Master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitPreferredMaster" ADD CONSTRAINT "UnitPreferredMaster_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitPreferredMaster" ADD CONSTRAINT "UnitPreferredMaster_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "Master"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstance" ADD CONSTRAINT "ChecklistInstance_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "Repair"("id") ON DELETE CASCADE ON UPDATE CASCADE;
