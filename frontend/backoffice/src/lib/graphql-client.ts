import { GraphQLClient } from 'graphql-request'

// Конфигурация GraphQL клиента
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql'

export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  headers: {
    'Content-Type': 'application/json',
  },
})