import type { Context } from '../context.js';

import { createGraphQLLogger } from '@repo/shared-logger';

const logger = createGraphQLLogger('bookings-subgraph-resolvers');
export const resolvers = {
  Query: {
    booking: (_: unknown, { id }: { id: string }, { dl }: Context) => dl.getBookingById(id),
    bookings: (_: unknown, params: any, { dl }: Context) => dl.listBookings(params),
  },
  
  // Резолверы для связей между типами
  Booking: {
    org: (parent: any, _: unknown, { identityDL }: Context) => {
      return identityDL.getOrganizationById(parent.orgId);
    },
    unit: (parent: any, _: unknown, { inventoryDL }: Context) => {
      return inventoryDL.getUnitById(parent.unitId);
    },
    guest: (parent: any, _: unknown, { dl }: Context) => {
      return dl.getGuestById(parent.guestId);
    },
  },
  Mutation: {
    createBooking: async (_: unknown, { input }: { input: any }, { dl }: Context) => {
      // Check availability first
      const isAvailable = await dl.isRangeAvailable(input.unitId, input.checkIn, input.checkOut);
      if (!isAvailable) {
        throw new Error('Unit is not available for the selected dates');
      }
      
      return dl.createBooking(input);
    },
    cancelBooking: (_: unknown, { id, reason }: { id: string; reason?: string }, { dl }: Context) => 
      dl.cancelBooking(id, reason),
    changeBookingDates: async (_: unknown, { id, checkIn, checkOut }: { id: string; checkIn: string; checkOut: string }, { dl }: Context) => {
      // Check availability for new dates (excluding current booking)
      const isAvailable = await dl.isRangeAvailable('', checkIn, checkOut, id);
      if (!isAvailable) {
        throw new Error('Unit is not available for the new dates');
      }
      
      return dl.changeBookingDates(id, checkIn, checkOut);
    },
    // generateContract и depositAction перенесены в legal-subgraph
  },
  // Все связи между типами будут решаться на уровне mesh через base-schema.gql
  // Здесь оставляем только прямые запросы к данным
};
