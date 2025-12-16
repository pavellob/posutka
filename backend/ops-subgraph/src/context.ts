import type { IOpsDL, ICleaningDL } from '@repo/datalayer';
// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import type { PrismaClient } from '@prisma/client';
import type { InventoryGrpcClient } from '@repo/grpc-sdk';
import type { EventsGrpcClient } from '@repo/grpc-sdk';
import type { DailyNotificationTaskService } from './services/daily-notification-task.service.js';

export type Context = {
  dl: IOpsDL;
  cleaningDL?: ICleaningDL;
  prisma?: PrismaClient;
  dailyNotificationTaskService?: DailyNotificationTaskService;
  inventoryGrpcClient?: InventoryGrpcClient;
  eventsGrpcClient?: EventsGrpcClient;
  orgId?: string;
  userId?: string;
};
