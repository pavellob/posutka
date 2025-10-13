// @ts-ignore - PrismaClient is available at runtime but linter has cache issues
import type { PrismaClient } from '@prisma/client';
import type { ICleaningDL, IIdentityDL, IDataLayerInventory, IBookingsDL } from '@repo/datalayer';

export interface Context {
  dl: ICleaningDL;
  identityDL: IIdentityDL;
  inventoryDL: IDataLayerInventory;
  bookingsDL: IBookingsDL;
  prisma: PrismaClient;
}

