import type { IDataLayerInventory } from '@repo/datalayer';

export type Context = {
  dl: IDataLayerInventory;
  orgId?: string;
  userId?: string;
};
