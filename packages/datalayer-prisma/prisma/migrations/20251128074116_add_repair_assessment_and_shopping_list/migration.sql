-- AlterTable
ALTER TABLE "Repair" ADD COLUMN     "assessedAt" TIMESTAMP(3),
ADD COLUMN     "assessedDifficulty" INTEGER,
ADD COLUMN     "assessedSize" INTEGER;

-- CreateTable
CREATE TABLE "RepairShoppingItem" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairShoppingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairShoppingItemPhoto" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairShoppingItemPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepairShoppingItem_repairId_idx" ON "RepairShoppingItem"("repairId");

-- CreateIndex
CREATE INDEX "RepairShoppingItemPhoto_itemId_idx" ON "RepairShoppingItemPhoto"("itemId");

-- AddForeignKey
ALTER TABLE "RepairShoppingItem" ADD CONSTRAINT "RepairShoppingItem_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "Repair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairShoppingItemPhoto" ADD CONSTRAINT "RepairShoppingItemPhoto_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "RepairShoppingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
