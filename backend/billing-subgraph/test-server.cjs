const { createYoga } = require('graphql-yoga');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { readFileSync } = require('fs');
const path = require('path');
const gql = require('graphql-tag');

// Mock resolvers for testing
const mockResolvers = {
  Query: {
    invoice: () => ({
      id: 'inv-1',
      orgId: 'org-1',
      items: [{
        name: 'Уборка',
        qty: 1,
        price: { amount: 3000, currency: 'RUB' },
        sum: { amount: 3000, currency: 'RUB' }
      }],
      total: { amount: 3000, currency: 'RUB' },
      status: 'OPEN',
      issuedAt: new Date().toISOString(),
    }),
    invoices: () => ({
      edges: [{
        node: {
          id: 'inv-1',
          orgId: 'org-1',
          items: [],
          total: { amount: 3000, currency: 'RUB' },
          status: 'OPEN',
          issuedAt: new Date().toISOString(),
        },
        cursor: 'inv-1'
      }],
      pageInfo: {
        endCursor: 'inv-1',
        hasNextPage: false
      }
    }),
    payment: () => ({
      id: 'pay-1',
      invoiceId: 'inv-1',
      method: 'CARD',
      amount: { amount: 3000, currency: 'RUB' },
      status: 'SUCCEEDED',
      createdAt: new Date().toISOString(),
      provider: 'YOOKASSA',
    }),
  },
  Mutation: {
    createInvoice: (_, { input }) => ({
      id: 'inv-1',
      orgId: input.orgId,
      items: input.items.map(item => ({
        ...item,
        sum: { amount: item.qty * item.price.amount, currency: item.price.currency }
      })),
      total: { 
        amount: input.items.reduce((sum, item) => sum + item.qty * item.price.amount, 0),
        currency: input.items[0]?.price.currency || 'RUB'
      },
      status: 'OPEN',
      issuedAt: new Date().toISOString(),
    }),
    recordPayment: (_, { input }) => ({
      id: 'pay-1',
      invoiceId: input.invoiceId,
      method: input.method,
      amount: input.amount,
      status: 'SUCCEEDED',
      createdAt: new Date().toISOString(),
      provider: input.provider,
    }),
    generatePaymentLink: (_, { input }) => ({
      url: `https://pay.example.com/invoice/${input.invoiceId}?provider=${input.provider}`,
      provider: input.provider,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
  },
  Invoice: {
    org: (invoice) => ({ __typename: 'Organization', id: invoice.orgId }),
    order: (invoice) => invoice.orderId ? { __typename: 'ServiceOrder', id: invoice.orderId } : null,
  },
  Payment: {
    invoice: (payment) => ({
      id: payment.invoiceId,
      orgId: 'org-1',
      items: [],
      total: { amount: 3000, currency: 'RUB' },
      status: 'OPEN',
      issuedAt: new Date().toISOString(),
    }),
  },
  // Entity resolvers
  Invoice__resolveReference: (ref) => ({
    id: ref.id,
    orgId: 'org-1',
    items: [],
    total: { amount: 3000, currency: 'RUB' },
    status: 'OPEN',
    issuedAt: new Date().toISOString(),
  }),
  Payment__resolveReference: (ref) => ({
    id: ref.id,
    invoiceId: 'inv-1',
    method: 'CARD',
    amount: { amount: 3000, currency: 'RUB' },
    status: 'SUCCEEDED',
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
server.listen(4004, () => console.log('Test billing-subgraph on :4004'));
