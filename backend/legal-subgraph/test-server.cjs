const { createYoga } = require('graphql-yoga');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { readFileSync } = require('fs');
const path = require('path');
const gql = require('graphql-tag');

// Mock resolvers for testing
const mockResolvers = {
  Query: {
    document: () => ({
      id: 'doc-1',
      type: 'CONTRACT',
      url: 'https://docs.example.com/contracts/booking-1/doc-1.pdf',
      createdAt: new Date().toISOString(),
      bookingId: 'booking-1',
      meta: {
        template: 'default',
        generatedAt: new Date().toISOString(),
        version: '1.0'
      }
    }),
    depositTx: () => ({
      id: 'deposit-1',
      bookingId: 'booking-1',
      hold: { amount: 5000, currency: 'RUB' },
      captured: { amount: 5000, currency: 'RUB' },
      refunded: null,
      method: 'CARD',
      status: 'CAPTURED',
      createdAt: new Date().toISOString(),
    }),
  },
  Mutation: {
    generateContract: (_, { bookingId, template }) => ({
      id: 'doc-1',
      type: 'CONTRACT',
      url: `https://docs.example.com/contracts/${bookingId}/doc-1.pdf`,
      createdAt: new Date().toISOString(),
      bookingId,
      meta: {
        template: template || 'default',
        generatedAt: new Date().toISOString(),
        version: '1.0'
      }
    }),
    depositAction: (_, { bookingId, action, amount }) => ({
      id: 'deposit-1',
      bookingId,
      hold: { amount: amount?.amount || 5000, currency: amount?.currency || 'RUB' },
      captured: action === 'CAPTURE' ? { amount: amount?.amount || 5000, currency: amount?.currency || 'RUB' } : null,
      refunded: action === 'REFUND' ? { amount: amount?.amount || 5000, currency: amount?.currency || 'RUB' } : null,
      method: 'CARD',
      status: action === 'HOLD' ? 'HELD' : action === 'CAPTURE' ? 'CAPTURED' : action === 'REFUND' ? 'REFUNDED' : 'RELEASED',
      createdAt: new Date().toISOString(),
    }),
  },
  Document: {
    booking: (document) => ({ __typename: 'Booking', id: document.bookingId }),
  },
  DepositTransaction: {
    booking: (transaction) => ({ __typename: 'Booking', id: transaction.bookingId }),
  },
  // Entity resolvers
  Document__resolveReference: (ref) => ({
    id: ref.id,
    type: 'CONTRACT',
    url: `https://docs.example.com/contracts/booking-1/${ref.id}.pdf`,
    createdAt: new Date().toISOString(),
    bookingId: 'booking-1',
    meta: { template: 'default' }
  }),
  DepositTransaction__resolveReference: (ref) => ({
    id: ref.id,
    bookingId: 'booking-1',
    hold: { amount: 5000, currency: 'RUB' },
    captured: { amount: 5000, currency: 'RUB' },
    refunded: null,
    method: 'CARD',
    status: 'CAPTURED',
    createdAt: new Date().toISOString(),
  }),
};

const typeDefs = gql(readFileSync(path.join(__dirname, 'src/schema/index.gql'), 'utf8'));
const schema = buildSubgraphSchema({ typeDefs, resolvers: mockResolvers });

const yoga = createYoga({
  schema,
  context: () => ({ dl: {} }),
});

const server = require('http').createServer(yoga);
server.listen(4007, () => console.log('Test legal-subgraph on :4007'));
