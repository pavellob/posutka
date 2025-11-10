-- CreateEnum
CREATE TYPE "CleaningReviewStatus" AS ENUM ('APPROVED');

-- AlterEnum
ALTER TYPE "CleaningStatus" ADD VALUE 'APPROVED';

-- CreateTable
CREATE TABLE "CleaningReview" (
    "id" TEXT NOT NULL,
    "cleaningId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "status" "CleaningReviewStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CleaningReview_cleaningId_idx" ON "CleaningReview"("cleaningId");

-- AddForeignKey
ALTER TABLE "CleaningReview" ADD CONSTRAINT "CleaningReview_cleaningId_fkey" FOREIGN KEY ("cleaningId") REFERENCES "Cleaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;
