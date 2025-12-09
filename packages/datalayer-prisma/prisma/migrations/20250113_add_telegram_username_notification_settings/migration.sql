-- AlterTable
ALTER TABLE "UserNotificationSettings"
ADD COLUMN     "telegramUsername" TEXT;

-- CreateIndex
CREATE INDEX "UserNotificationSettings_telegramUsername_idx" ON "UserNotificationSettings"("telegramUsername");

