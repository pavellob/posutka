try {
  const { buildSubgraphSchema } = require('@apollo/subgraph');
  const { createYoga } = require('graphql-yoga');
  const { createServer } = require('http');
  const gql = require('graphql-tag');
  
  console.log('✅ All dependencies loaded successfully');
  
  const resolvers = {
    Query: {
      booking: () => ({ 
        id: 'test-booking', 
        status: 'CONFIRMED',
        checkIn: '2025-01-01T00:00:00.000Z',
        checkOut: '2025-01-05T00:00:00.000Z',
        guestsCount: 2,
        priceBreakdown: {
          basePrice: { amount: 1000, currency: 'RUB' },
          total: { amount: 1000, currency: 'RUB' }
        }
      }),
      bookings: () => ({
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0
      })
    },
    Mutation: {
      createBooking: () => ({ 
        id: 'new-booking', 
        status: 'PENDING',
        checkIn: '2025-01-01T00:00:00.000Z',
        checkOut: '2025-01-05T00:00:00.000Z',
        guestsCount: 2
      })
    }
  };
  
  const typeDefs = gql`
    extend schema @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])
    scalar UUID
    scalar DateTime
    scalar Money
    type Query { 
      booking(id: UUID!): Booking
      bookings: BookingConnection!
    }
    type Mutation {
      createBooking(input: CreateBookingInput!): Booking!
    }
    type Booking @key(fields: "id") { 
      id: UUID!
      status: BookingStatus!
      checkIn: DateTime!
      checkOut: DateTime!
      guestsCount: Int!
      priceBreakdown: PriceBreakdown!
    }
    type PriceBreakdown {
      basePrice: Money!
      total: Money!
    }
    type BookingConnection {
      edges: [BookingEdge!]!
      pageInfo: PageInfo!
      totalCount: Int!
    }
    type BookingEdge {
      node: Booking!
      cursor: String!
    }
    type PageInfo {
      hasNextPage: Boolean!
      hasPreviousPage: Boolean!
    }
    input CreateBookingInput {
      orgId: UUID!
      unitId: UUID!
      guest: GuestInput!
      checkIn: DateTime!
      checkOut: DateTime!
      guestsCount: Int!
    }
    input GuestInput {
      name: String!
      email: String!
    }
    enum BookingStatus {
      PENDING
      CONFIRMED
      CANCELLED
    }
  `;
  
  console.log('✅ Schema created');
  
  const schema = buildSubgraphSchema({ typeDefs, resolvers });
  console.log('✅ Subgraph schema built');
  
  const yoga = createYoga({ schema });
  console.log('✅ Yoga created');
  
  const server = createServer(yoga);
  console.log('✅ Server created');
  
  server.listen(4002, () => {
    console.log('🚀 bookings-subgraph running on http://localhost:4002/graphql');
    console.log('💡 Try this query:');
    console.log('   query { booking(id: "test") { id status checkIn checkOut guestsCount } }');
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
