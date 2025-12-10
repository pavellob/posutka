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
    createBooking: async (_: unknown, { input }: { input: any }, { bookingService }: Context) => {
      // Валидация доступности дат теперь выполняется внутри bookingService.createBooking
      // Это гарантирует единообразную обработку для GraphQL и gRPC
      return bookingService.createBooking(input);
    },
    cancelBooking: (_: unknown, { id, reason }: { id: string; reason?: string }, { bookingService }: Context) => 
      bookingService.cancelBooking(id, reason),
    changeBookingDates: async (_: unknown, { id, checkIn, checkOut }: { id: string; checkIn: string; checkOut: string }, { bookingService }: Context) => {
      // Валидация доступности дат теперь выполняется внутри bookingService.changeBookingDates
      // Это гарантирует единообразную обработку для GraphQL и gRPC
      return bookingService.changeBookingDates(id, checkIn, checkOut);
    },
    updateBooking: async (_: unknown, { input }: { input: any }, { bookingService }: Context) => {
      // Валидация доступности дат теперь выполняется внутри bookingService.updateBooking
      // Это гарантирует единообразную обработку для GraphQL и gRPC
      return bookingService.updateBooking({
        id: input.id,
        guestName: input.guest?.name,
        guestEmail: input.guest?.email,
        guestPhone: input.guest?.phone,
        checkIn: input.checkIn ? new Date(input.checkIn) : undefined,
        checkOut: input.checkOut ? new Date(input.checkOut) : undefined,
        arrivalTime: input.arrivalTime,
        departureTime: input.departureTime,
        guestsCount: input.guestsCount,
        status: input.status,
        notes: input.notes,
      });
    },
    // generateContract и depositAction перенесены в legal-subgraph
  },
  // Все связи между типами будут решаться на уровне mesh через base-schema.gql
  // Здесь оставляем только прямые запросы к данным
};
