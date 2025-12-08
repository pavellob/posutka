-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "amountAmount" INTEGER,
ADD COLUMN     "amountCurrency" TEXT,
ADD COLUMN     "platformTaxAmount" INTEGER,
ADD COLUMN     "platformTaxCurrency" TEXT,
ADD COLUMN     "prepaymentAmount" INTEGER,
ADD COLUMN     "prepaymentCurrency" TEXT,
ADD COLUMN     "pricePerDayAmount" INTEGER,
ADD COLUMN     "pricePerDayCurrency" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Property_orgId_externalSource_externalId_key" ON "Property"("orgId", "externalSource", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_externalSource_externalId_key" ON "Unit"("externalSource", "externalId");

