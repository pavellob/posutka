-- DropForeignKey
ALTER TABLE "ChecklistInstance" DROP CONSTRAINT "ChecklistInstance_templateId_fkey";

-- AlterTable
ALTER TABLE "ChecklistInstance" ALTER COLUMN "templateId" DROP NOT NULL,
ALTER COLUMN "templateVersion" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ChecklistInstance" ADD CONSTRAINT "ChecklistInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
