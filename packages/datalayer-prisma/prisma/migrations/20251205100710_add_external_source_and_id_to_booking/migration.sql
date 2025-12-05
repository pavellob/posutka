-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT;

-- CreateIndex
CREATE INDEX "Booking_externalSource_externalId_idx" ON "Booking"("externalSource", "externalId");
