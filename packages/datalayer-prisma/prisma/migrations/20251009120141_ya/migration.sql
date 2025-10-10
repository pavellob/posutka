/*
  Warnings:

  - The values [BOOKING] on the enum `Channel` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Channel_new" AS ENUM ('DIRECT', 'AIRBNB', 'BOOKING_COM', 'AVITO');
ALTER TABLE "Listing" ALTER COLUMN "channel" TYPE "Channel_new" USING ("channel"::text::"Channel_new");
ALTER TYPE "Channel" RENAME TO "Channel_old";
ALTER TYPE "Channel_new" RENAME TO "Channel";
DROP TYPE "Channel_old";
COMMIT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "airConditioning" BOOLEAN DEFAULT false,
ADD COLUMN     "apartment" TEXT,
ADD COLUMN     "balcony" BOOLEAN DEFAULT false,
ADD COLUMN     "buildingSeries" TEXT,
ADD COLUMN     "buildingType" TEXT,
ADD COLUMN     "buildingYear" INTEGER,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "concierge" BOOLEAN DEFAULT false,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "dealStatus" TEXT,
ADD COLUMN     "dishwasher" BOOLEAN DEFAULT false,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "elevator" BOOLEAN DEFAULT false,
ADD COLUMN     "floor" INTEGER,
ADD COLUMN     "floorsTotal" INTEGER,
ADD COLUMN     "furniture" BOOLEAN DEFAULT false,
ADD COLUMN     "gym" BOOLEAN DEFAULT false,
ADD COLUMN     "internet" BOOLEAN DEFAULT false,
ADD COLUMN     "isElite" BOOLEAN DEFAULT false,
ADD COLUMN     "kitchenArea" DOUBLE PRECISION,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "livingArea" DOUBLE PRECISION,
ADD COLUMN     "localityName" TEXT,
ADD COLUMN     "loggia" BOOLEAN DEFAULT false,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "metroName" TEXT,
ADD COLUMN     "metroTimeOnFoot" INTEGER,
ADD COLUMN     "metroTimeOnTransport" INTEGER,
ADD COLUMN     "parking" BOOLEAN DEFAULT false,
ADD COLUMN     "playground" BOOLEAN DEFAULT false,
ADD COLUMN     "propertyType" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "renovation" TEXT,
ADD COLUMN     "rooms" INTEGER,
ADD COLUMN     "roomsOffered" INTEGER,
ADD COLUMN     "security" BOOLEAN DEFAULT false,
ADD COLUMN     "totalArea" DOUBLE PRECISION,
ADD COLUMN     "tv" BOOLEAN DEFAULT false,
ADD COLUMN     "washingMachine" BOOLEAN DEFAULT false,
ADD COLUMN     "yandexBuildingId" TEXT,
ADD COLUMN     "yandexHouseId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "systemRoles" TEXT[] DEFAULT ARRAY['USER']::TEXT[],
ALTER COLUMN "password" DROP NOT NULL,
ALTER COLUMN "password" SET DEFAULT '';
