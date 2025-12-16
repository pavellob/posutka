-- AlterEnum: Добавляем значение DAILY_NOTIFICATION в enum TaskType
-- Примечание: ALTER TYPE ADD VALUE нельзя выполнить в транзакции, поэтому используем DO блок
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'DAILY_NOTIFICATION' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TaskType')
    ) THEN
        ALTER TYPE "TaskType" ADD VALUE 'DAILY_NOTIFICATION';
    END IF;
END $$;

-- CreateTable
CREATE TABLE "OrganizationNotificationSettings" (
    "orgId" TEXT NOT NULL,
    "dailyCleaningNotificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyCleaningNotificationTime" TEXT,
    "dailyRepairNotificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyRepairNotificationTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationNotificationSettings_pkey" PRIMARY KEY ("orgId")
);

-- AddForeignKey
ALTER TABLE "OrganizationNotificationSettings" ADD CONSTRAINT "OrganizationNotificationSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

