-- Make name nullable and update existing null values to default
ALTER TABLE "ChecklistTemplate" ALTER COLUMN "name" DROP NOT NULL;
UPDATE "ChecklistTemplate" SET "name" = 'Чеклист' WHERE "name" IS NULL;
