-- CreateEnum
CREATE TYPE "CleaningStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CleaningDocumentType" AS ENUM ('PRE_CLEANING_ACCEPTANCE', 'POST_CLEANING_HANDOVER');

-- CreateTable
CREATE TABLE "Cleaner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "rating" DOUBLE PRECISION DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cleaner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningTemplate" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiresLinenChange" BOOLEAN NOT NULL DEFAULT false,
    "estimatedDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningTemplateCheckbox" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningTemplateCheckbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cleaning" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "bookingId" TEXT,
    "status" "CleaningStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "requiresLinenChange" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cleaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningChecklist" (
    "id" TEXT NOT NULL,
    "cleaningId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningDocument" (
    "id" TEXT NOT NULL,
    "cleaningId" TEXT NOT NULL,
    "type" "CleaningDocumentType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningDocumentPhoto" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningDocumentPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cleaner_orgId_idx" ON "Cleaner"("orgId");

-- CreateIndex
CREATE INDEX "Cleaner_userId_idx" ON "Cleaner"("userId");

-- CreateIndex
CREATE INDEX "CleaningTemplate_unitId_idx" ON "CleaningTemplate"("unitId");

-- CreateIndex
CREATE INDEX "CleaningTemplateCheckbox_templateId_idx" ON "CleaningTemplateCheckbox"("templateId");

-- CreateIndex
CREATE INDEX "Cleaning_orgId_idx" ON "Cleaning"("orgId");

-- CreateIndex
CREATE INDEX "Cleaning_cleanerId_idx" ON "Cleaning"("cleanerId");

-- CreateIndex
CREATE INDEX "Cleaning_unitId_idx" ON "Cleaning"("unitId");

-- CreateIndex
CREATE INDEX "Cleaning_bookingId_idx" ON "Cleaning"("bookingId");

-- CreateIndex
CREATE INDEX "Cleaning_scheduledAt_idx" ON "Cleaning"("scheduledAt");

-- CreateIndex
CREATE INDEX "CleaningChecklist_cleaningId_idx" ON "CleaningChecklist"("cleaningId");

-- CreateIndex
CREATE INDEX "CleaningDocument_cleaningId_idx" ON "CleaningDocument"("cleaningId");

-- CreateIndex
CREATE INDEX "CleaningDocumentPhoto_documentId_idx" ON "CleaningDocumentPhoto"("documentId");

-- AddForeignKey
ALTER TABLE "CleaningTemplateCheckbox" ADD CONSTRAINT "CleaningTemplateCheckbox_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CleaningTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cleaning" ADD CONSTRAINT "Cleaning_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "Cleaner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningChecklist" ADD CONSTRAINT "CleaningChecklist_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningDocument" ADD CONSTRAINT "CleaningDocument_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningDocumentPhoto" ADD CONSTRAINT "CleaningDocumentPhoto_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CleaningDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
