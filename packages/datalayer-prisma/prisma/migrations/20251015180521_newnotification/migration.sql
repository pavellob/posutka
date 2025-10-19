/*
  Warnings:

  - You are about to drop the column `channels` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `recipientIds` on the `Notification` table. All the data in the column will be lost.
  - The `status` column on the `NotificationDelivery` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `recipientId` to the `NotificationDelivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientType` to the `NotificationDelivery` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `channel` on the `NotificationDelivery` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('TELEGRAM', 'WEBSOCKET', 'EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('USER_ID', 'TELEGRAM_CHAT_ID', 'EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "channels",
DROP COLUMN "recipientIds";

-- AlterTable
ALTER TABLE "NotificationDelivery" ADD COLUMN     "recipientId" TEXT NOT NULL,
ADD COLUMN     "recipientType" "RecipientType" NOT NULL,
DROP COLUMN "channel",
ADD COLUMN     "channel" "NotificationChannel" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "NotificationDelivery_channel_idx" ON "NotificationDelivery"("channel");

-- CreateIndex
CREATE INDEX "NotificationDelivery_recipientId_idx" ON "NotificationDelivery"("recipientId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_idx" ON "NotificationDelivery"("status");
