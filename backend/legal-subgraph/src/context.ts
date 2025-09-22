import type { ILegalDL } from '@repo/datalayer';

export type Context = {
  dl: ILegalDL;
  userId?: string;
  orgId?: string;
};
