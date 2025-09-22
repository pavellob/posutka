import type { IIdentityDL } from '@repo/datalayer';

export type Context = {
  dl: IIdentityDL;
  userId?: string;
  orgId?: string;
};
