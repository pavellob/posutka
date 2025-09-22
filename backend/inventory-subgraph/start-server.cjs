const { readFileSync } = require('fs');
const path = require('path');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { createYoga } = require('graphql-yoga');
const { createServer } = require('http');
const gql = require('graphql-tag');

// Простые резолверы для тестирования
const resolvers = {
  Query: {
    property: () => ({ 
      id: 'test-prop', 
      title: 'Test Property', 
      address: 'Test Address', 
      amenities: ['wifi'] 
    }),
    unit: () => ({ 
      id: 'test-unit', 
      name: 'Test Unit', 
      capacity: 2, 
      beds: 1, 
      bathrooms: 1, 
      amenities: ['wifi'] 
    })
  }
};

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@key"])

  scalar UUID
  scalar DateTime

  type Query {
    property(id: UUID!): Property
    unit(id: UUID!): Unit
  }

  type Property @key(fields: "id") {
    id: UUID!
    title: String!
    address: String!
    amenities: [String!]!
  }

  type Unit @key(fields: "id") {
    id: UUID!
    name: String!
    capacity: Int!
    beds: Int!
    bathrooms: Int!
    amenities: [String!]!
  }
`;

const schema = buildSubgraphSchema({ typeDefs, resolvers });
const yoga = createYoga({ schema });
const server = createServer(yoga);

server.listen(4001, () => {
  console.log('🚀 inventory-subgraph running on http://localhost:4001/graphql');
  console.log('📊 GraphQL Playground available at http://localhost:4001/graphql');
  console.log('💡 Try this query:');
  console.log('   query { property(id: "test") { id title address amenities } }');
});
