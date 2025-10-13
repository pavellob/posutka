-- CreateEnum
CREATE TYPE "CleanerType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- AlterTable
ALTER TABLE "Cleaner" ADD COLUMN     "type" "CleanerType" NOT NULL DEFAULT 'EXTERNAL',
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Cleaner_type_idx" ON "Cleaner"("type");
