import type { IOpsDL } from '@repo/datalayer';

export type Context = {
  dl: IOpsDL;
  orgId?: string;
  userId?: string;
};
