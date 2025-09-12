import type { IBookingsDL, IIdentityDL, IDataLayerInventory } from '@repo/datalayer';

export type Context = {
  dl: IBookingsDL;
  identityDL: IIdentityDL;
  inventoryDL: IDataLayerInventory;
  orgId?: string;
  userId?: string;
};
