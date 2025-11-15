/*
  Warnings:

  - You are about to drop the column `systemRoles` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'CLEANER';
ALTER TYPE "Role" ADD VALUE 'OPERATOR';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "systemRoles";
