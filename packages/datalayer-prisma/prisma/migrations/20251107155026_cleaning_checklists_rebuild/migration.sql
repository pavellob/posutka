-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('BOOL', 'NUMBER', 'TEXT', 'SELECT', 'MULTISELECT', 'PHOTO_ONLY');

-- CreateEnum
CREATE TYPE "ChecklistStage" AS ENUM ('PRE_CLEANING', 'CLEANING', 'FINAL_REPORT');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED');

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItemTemplate" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ItemType" NOT NULL DEFAULT 'BOOL',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "photoMin" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItemTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItemTemplateMedia" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItemTemplateMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistInstance" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "stage" "ChecklistStage" NOT NULL,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'DRAFT',
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "parentInstanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistInstanceItem" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ItemType" NOT NULL,
    "required" BOOLEAN NOT NULL,
    "requiresPhoto" BOOLEAN NOT NULL,
    "photoMin" INTEGER,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistInstanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistAnswer" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "value" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistAttachment" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistTemplate_unitId_idx" ON "ChecklistTemplate"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTemplate_unitId_version_key" ON "ChecklistTemplate"("unitId", "version");

-- CreateIndex
CREATE INDEX "ChecklistItemTemplate_templateId_idx" ON "ChecklistItemTemplate"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItemTemplate_templateId_key_key" ON "ChecklistItemTemplate"("templateId", "key");

-- CreateIndex
CREATE INDEX "ChecklistItemTemplateMedia_templateId_itemKey_idx" ON "ChecklistItemTemplateMedia"("templateId", "itemKey");

-- CreateIndex
CREATE INDEX "ChecklistItemTemplateMedia_templateId_idx" ON "ChecklistItemTemplateMedia"("templateId");

-- CreateIndex
CREATE INDEX "ChecklistInstance_unitId_stage_idx" ON "ChecklistInstance"("unitId", "stage");

-- CreateIndex
CREATE INDEX "ChecklistInstance_templateId_templateVersion_idx" ON "ChecklistInstance"("templateId", "templateVersion");

-- CreateIndex
CREATE INDEX "ChecklistInstance_parentInstanceId_idx" ON "ChecklistInstance"("parentInstanceId");

-- CreateIndex
CREATE INDEX "ChecklistInstanceItem_instanceId_idx" ON "ChecklistInstanceItem"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistInstanceItem_instanceId_key_key" ON "ChecklistInstanceItem"("instanceId", "key");

-- CreateIndex
CREATE INDEX "ChecklistAnswer_instanceId_idx" ON "ChecklistAnswer"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistAnswer_instanceId_itemKey_key" ON "ChecklistAnswer"("instanceId", "itemKey");

-- CreateIndex
CREATE INDEX "ChecklistAttachment_instanceId_idx" ON "ChecklistAttachment"("instanceId");

-- CreateIndex
CREATE INDEX "ChecklistAttachment_instanceId_itemKey_idx" ON "ChecklistAttachment"("instanceId", "itemKey");

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemTemplate" ADD CONSTRAINT "ChecklistItemTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemTemplateMedia" ADD CONSTRAINT "ChecklistItemTemplateMedia_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemTemplateMedia" ADD CONSTRAINT "ChecklistItemTemplateMedia_templateId_itemKey_fkey" FOREIGN KEY ("templateId", "itemKey") REFERENCES "ChecklistItemTemplate"("templateId", "key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstance" ADD CONSTRAINT "ChecklistInstance_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstance" ADD CONSTRAINT "ChecklistInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstance" ADD CONSTRAINT "ChecklistInstance_parentInstanceId_fkey" FOREIGN KEY ("parentInstanceId") REFERENCES "ChecklistInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstanceItem" ADD CONSTRAINT "ChecklistInstanceItem_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ChecklistInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistAnswer" ADD CONSTRAINT "ChecklistAnswer_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ChecklistInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistAnswer" ADD CONSTRAINT "ChecklistAnswer_instanceId_itemKey_fkey" FOREIGN KEY ("instanceId", "itemKey") REFERENCES "ChecklistInstanceItem"("instanceId", "key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistAttachment" ADD CONSTRAINT "ChecklistAttachment_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ChecklistInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistAttachment" ADD CONSTRAINT "ChecklistAttachment_instanceId_itemKey_fkey" FOREIGN KEY ("instanceId", "itemKey") REFERENCES "ChecklistInstanceItem"("instanceId", "key") ON DELETE CASCADE ON UPDATE CASCADE;
