import type { IBookingsDL } from '@repo/datalayer';

export type Context = {
  dl: IBookingsDL;
  orgId?: string;
  userId?: string;
};
