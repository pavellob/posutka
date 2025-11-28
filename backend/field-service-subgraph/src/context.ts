// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import type { PrismaClient } from '@prisma/client';
import type { ICleaningDL, IIdentityDL, IDataLayerInventory, IBookingsDL } from '@repo/datalayer';
import type { ChecklistInstanceService } from './services/checklist-instance.service.js';
import type { CleaningService } from './services/cleaning.service.js';

export interface Context {
  dl: ICleaningDL;
  identityDL: IIdentityDL;
  inventoryDL: IDataLayerInventory;
  bookingsDL: IBookingsDL;
  prisma: PrismaClient;
  checklistInstanceService: ChecklistInstanceService;
  cleaningService: CleaningService;
}

