/*
  Warnings:

  - You are about to drop the column `cleaningId` on the `Task` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('CLEANING', 'REPAIR', 'BOOKING', 'INSPECTION', 'OTHER');

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Source_type_entityId_idx" ON "Source"("type", "entityId");

-- CreateIndex
CREATE INDEX "Source_orgId_idx" ON "Source"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Source_type_entityId_key" ON "Source"("type", "entityId");

-- Миграция данных: создаем Source записи для существующих cleaningId
-- Используем cuid-подобный формат для совместимости с Prisma
DO $$
DECLARE
    cleaning_record RECORD;
    source_id TEXT;
    counter INTEGER := 0;
BEGIN
    FOR cleaning_record IN 
        SELECT DISTINCT t."cleaningId", t."orgId"
        FROM "Task" t
        WHERE t."cleaningId" IS NOT NULL
    LOOP
        -- Генерируем ID в формате, совместимом с cuid
        -- Используем комбинацию префикса, хеша и счетчика для уникальности
        source_id := 'cl' || substr(md5(cleaning_record."cleaningId" || counter::text || random()::text), 1, 22);
        counter := counter + 1;
        
        INSERT INTO "Source" ("id", "type", "entityId", "orgId", "createdAt", "updatedAt")
        VALUES (
            source_id,
            'CLEANING'::"SourceType",
            cleaning_record."cleaningId",
            cleaning_record."orgId",
            NOW(),
            NOW()
        )
        ON CONFLICT ("type", "entityId") DO NOTHING;
    END LOOP;
END $$;

-- Добавляем sourceId в Task
ALTER TABLE "Task" ADD COLUMN "sourceId" TEXT;

-- Обновляем sourceId для существующих задач
UPDATE "Task" t
SET "sourceId" = s."id"
FROM "Source" s
WHERE t."cleaningId" = s."entityId" AND s."type" = 'CLEANING';

-- DropIndex
DROP INDEX IF EXISTS "Task_cleaningId_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "cleaningId";

-- CreateIndex
CREATE INDEX "Task_sourceId_idx" ON "Task"("sourceId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
