import type { IBookingsDL, IIdentityDL, IDataLayerInventory } from '@repo/datalayer';
import type { BookingService } from './services/booking.service.js';

export type Context = {
  dl: IBookingsDL;
  identityDL: IIdentityDL;
  inventoryDL: IDataLayerInventory;
  bookingService: BookingService;
  orgId?: string;
  userId?: string;
};
