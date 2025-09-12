export const resolvers = {
    Query: {
        booking: (_, { id }, { dl }) => dl.getBookingById(id),
        bookings: (_, params, { dl }) => dl.listBookings(params),
    },
    Mutation: {
        createBooking: async (_, { input }, { dl }) => {
            // Check availability first
            const isAvailable = await dl.isRangeAvailable(input.unitId, input.checkIn, input.checkOut);
            if (!isAvailable) {
                throw new Error('Unit is not available for the selected dates');
            }
            return dl.createBooking(input);
        },
        cancelBooking: (_, { id, reason }, { dl }) => dl.cancelBooking(id, reason),
        changeBookingDates: async (_, { id, checkIn, checkOut }, { dl }) => {
            // Check availability for new dates (excluding current booking)
            const isAvailable = await dl.isRangeAvailable('', checkIn, checkOut, id);
            if (!isAvailable) {
                throw new Error('Unit is not available for the new dates');
            }
            return dl.changeBookingDates(id, checkIn, checkOut);
        },
        generateContract: (_, { bookingId, template }, { dl }) => dl.generateContract(bookingId, template),
        depositAction: (_, { bookingId, action, amount }, { dl }) => dl.depositAction(bookingId, action, amount),
    },
    // Все связи между типами будут решаться на уровне mesh через base-schema.gql
    // Здесь оставляем только прямые запросы к данным
};
