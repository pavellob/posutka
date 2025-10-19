-- AlterTable
ALTER TABLE "Cleaner" ADD COLUMN     "telegramUsername" TEXT;

-- CreateIndex
CREATE INDEX "Cleaner_telegramUsername_idx" ON "Cleaner"("telegramUsername");

-- AddForeignKey
ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
