import type { IListingsDL } from '@repo/datalayer';

export type Context = {
  dl: IListingsDL;
  userId?: string;
  orgId?: string;
};
