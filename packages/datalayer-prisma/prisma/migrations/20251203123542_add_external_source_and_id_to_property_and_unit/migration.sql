-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT;

-- CreateIndex
CREATE INDEX "Property_externalSource_externalId_idx" ON "Property"("externalSource", "externalId");

-- CreateIndex
CREATE INDEX "Unit_externalSource_externalId_idx" ON "Unit"("externalSource", "externalId");

-- CreateIndex
CREATE INDEX "Unit_propertyId_externalSource_externalId_idx" ON "Unit"("propertyId", "externalSource", "externalId");
