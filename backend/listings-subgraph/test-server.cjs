const { createYoga } = require('graphql-yoga');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { readFileSync } = require('fs');
const path = require('path');
const gql = require('graphql-tag');

// Mock resolvers for testing
const mockResolvers = {
  Query: {
    listing: () => ({
      id: 'listing-1',
      unitId: 'unit-1',
      status: 'PUBLISHED',
      channel: 'DIRECT',
      basePrice: { amount: 5000, currency: 'RUB' },
      minNights: 1,
      maxNights: 30,
      externalId: null,
      lastSyncAt: new Date().toISOString(),
    }),
    listings: () => ({
      edges: [{
        node: {
          id: 'listing-1',
          unitId: 'unit-1',
          status: 'PUBLISHED',
          channel: 'DIRECT',
          basePrice: { amount: 5000, currency: 'RUB' },
          minNights: 1,
          maxNights: 30,
          externalId: null,
          lastSyncAt: new Date().toISOString(),
        },
        cursor: 'listing-1'
      }],
      pageInfo: {
        endCursor: 'listing-1',
        hasNextPage: false
      }
    }),
  },
  Mutation: {
    upsertListing: (_, { input }) => ({
      id: 'listing-1',
      unitId: input.unitId,
      status: input.status,
      channel: input.channel,
      basePrice: input.basePrice,
      minNights: input.minNights,
      maxNights: input.maxNights,
      externalId: input.externalId,
      lastSyncAt: new Date().toISOString(),
    }),
    setPricing: (_, { listingId, basePrice, minNights, maxNights }) => ({
      id: listingId,
      unitId: 'unit-1',
      status: 'PUBLISHED',
      channel: 'DIRECT',
      basePrice,
      minNights,
      maxNights,
      externalId: null,
      lastSyncAt: new Date().toISOString(),
    }),
    addDiscountRule: (_, { input }) => ({
      id: 'discount-1',
      listingId: input.listingId,
      name: input.name,
      percentOff: input.percentOff,
      minNights: input.minNights,
    }),
    removeDiscountRule: (_, { id }) => ({
      id: 'listing-1',
      unitId: 'unit-1',
      status: 'PUBLISHED',
      channel: 'DIRECT',
      basePrice: { amount: 5000, currency: 'RUB' },
      minNights: 1,
      maxNights: 30,
      externalId: null,
      lastSyncAt: new Date().toISOString(),
    }),
  },
  Listing: {
    unit: (listing) => ({ __typename: 'Unit', id: listing.unitId }),
    discounts: (listing) => [{
      id: 'discount-1',
      listingId: listing.id,
      name: 'Early Bird',
      percentOff: 10,
      minNights: 7,
    }],
  },
  // Entity resolvers
  Listing__resolveReference: (ref) => ({
    id: ref.id,
    unitId: 'unit-1',
    status: 'PUBLISHED',
    channel: 'DIRECT',
    basePrice: { amount: 5000, currency: 'RUB' },
    minNights: 1,
    maxNights: 30,
    externalId: null,
    lastSyncAt: new Date().toISOString(),
  }),
  DiscountRule__resolveReference: (ref) => ({
    id: ref.id,
    listingId: 'listing-1',
    name: 'Early Bird',
    percentOff: 10,
    minNights: 7,
  }),
};

const typeDefs = gql(readFileSync(path.join(__dirname, 'src/schema/index.gql'), 'utf8'));
const schema = buildSubgraphSchema({ typeDefs, resolvers: mockResolvers });

const yoga = createYoga({
  schema,
  context: () => ({ dl: {} }),
});

const server = require('http').createServer(yoga);
server.listen(4006, () => console.log('Test listings-subgraph on :4006'));
