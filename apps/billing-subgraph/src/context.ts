import type { IBillingDL } from '@repo/datalayer';

export type Context = {
  dl: IBillingDL;
  orgId?: string;
  userId?: string;
};
