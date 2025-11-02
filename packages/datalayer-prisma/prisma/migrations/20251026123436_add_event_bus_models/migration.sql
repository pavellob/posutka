-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CLEANING_AVAILABLE', 'CLEANING_ASSIGNED', 'CLEANING_STARTED', 'CLEANING_COMPLETED', 'CLEANING_CANCELLED', 'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_CHECKIN', 'BOOKING_CHECKOUT', 'TASK_CREATED', 'TASK_ASSIGNED', 'TASK_STATUS_CHANGED', 'TASK_COMPLETED', 'USER_CREATED', 'USER_UPDATED', 'USER_LOCKED', 'USER_UNLOCKED', 'ORG_CREATED', 'ORG_UPDATED', 'MEMBER_ADDED', 'MEMBER_REMOVED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HandlerType" AS ENUM ('NOTIFICATION', 'ANALYTICS', 'AUDIT', 'WEBHOOK', 'CUSTOM');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "eventId" TEXT;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "sourceSubgraph" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "orgId" TEXT,
    "actorUserId" TEXT,
    "targetUserIds" TEXT[],
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSubscription" (
    "id" TEXT NOT NULL,
    "handlerType" "HandlerType" NOT NULL,
    "eventTypes" TEXT[],
    "targetUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventNotification" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Event_entityType_entityId_idx" ON "Event"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Event_orgId_idx" ON "Event"("orgId");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex
CREATE INDEX "EventSubscription_handlerType_idx" ON "EventSubscription"("handlerType");

-- CreateIndex
CREATE INDEX "EventSubscription_isActive_idx" ON "EventSubscription"("isActive");

-- CreateIndex
CREATE INDEX "EventNotification_eventId_idx" ON "EventNotification"("eventId");

-- CreateIndex
CREATE INDEX "EventNotification_notificationId_idx" ON "EventNotification"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "EventNotification_eventId_notificationId_key" ON "EventNotification"("eventId", "notificationId");

-- CreateIndex
CREATE INDEX "Notification_eventId_idx" ON "Notification"("eventId");

-- AddForeignKey
ALTER TABLE "EventNotification" ADD CONSTRAINT "EventNotification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventNotification" ADD CONSTRAINT "EventNotification_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default event subscriptions
INSERT INTO "EventSubscription" ("id", "handlerType", "eventTypes", "isActive", "createdAt", "updatedAt")
VALUES 
  -- NOTIFICATION подписки
  (
    'sub_notification_cleaning',
    'NOTIFICATION',
    ARRAY['CLEANING_AVAILABLE', 'CLEANING_ASSIGNED', 'CLEANING_STARTED', 'CLEANING_COMPLETED', 'CLEANING_CANCELLED']::text[],
    true,
    NOW(),
    NOW()
  ),
  (
    'sub_notification_booking',
    'NOTIFICATION',
    ARRAY['BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_CHECKIN', 'BOOKING_CHECKOUT']::text[],
    true,
    NOW(),
    NOW()
  ),
  (
    'sub_notification_task',
    'NOTIFICATION',
    ARRAY['TASK_CREATED', 'TASK_ASSIGNED', 'TASK_STATUS_CHANGED', 'TASK_COMPLETED']::text[],
    true,
    NOW(),
    NOW()
  ),
  -- AUDIT подписка на все события
  (
    'sub_audit_all',
    'AUDIT',
    ARRAY[
      'CLEANING_AVAILABLE', 'CLEANING_ASSIGNED', 'CLEANING_STARTED', 'CLEANING_COMPLETED', 'CLEANING_CANCELLED',
      'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_CHECKIN', 'BOOKING_CHECKOUT',
      'TASK_CREATED', 'TASK_ASSIGNED', 'TASK_STATUS_CHANGED', 'TASK_COMPLETED',
      'USER_CREATED', 'USER_UPDATED', 'USER_LOCKED', 'USER_UNLOCKED',
      'ORG_CREATED', 'ORG_UPDATED', 'MEMBER_ADDED', 'MEMBER_REMOVED'
    ]::text[],
    true,
    NOW(),
    NOW()
  ),
  -- ANALYTICS подписка
  (
    'sub_analytics_key_events',
    'ANALYTICS',
    ARRAY['CLEANING_COMPLETED', 'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'TASK_COMPLETED']::text[],
    true,
    NOW(),
    NOW()
  )
ON CONFLICT ("id") DO NOTHING;
