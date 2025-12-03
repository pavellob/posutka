import { defineConfig, loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

// Читаем базовую схему
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const baseSchema = readFileSync(join(__dirname, '../../base-schema.gql'), 'utf-8')

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('ai-subgraph', {
        endpoint: 'http://localhost:4008/graphql'
      })
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('identity-subgraph', {
        endpoint: 'http://localhost:4005/graphql',
        operationHeaders: {
          Authorization: '{context.headers.authorization}'
        }
      })
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('bookings-subgraph', {
        endpoint: 'http://localhost:4002/graphql'
      })
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('billing-subgraph', {
        endpoint: 'http://localhost:4004/graphql'
      })
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('ops-subgraph', {
        endpoint: 'http://localhost:4003/graphql'
      })
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('inventory-subgraph', {
        endpoint: 'http://localhost:4001/graphql',
        operationHeaders: {
          Authorization: '{context.headers.authorization}'
        }
      })
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('legal-subgraph', {
        endpoint: 'http://localhost:4007/graphql'
      })
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('listings-subgraph', {
        endpoint: 'http://localhost:4006/graphql'
      })
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('iam-subgraph', {
        endpoint: 'http://localhost:4009/graphql',
        operationHeaders: {
          Authorization: '{context.headers.authorization}'
        }
      })
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('field-service-subgraph', {
        endpoint: 'http://localhost:4010/graphql'
      })
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('notifications-subgraph', {
        endpoint: 'http://localhost:4011/graphql'
      })
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('pricing-subgraph', {
        endpoint: 'http://localhost:4012/graphql'
      })
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('realty-calendar-subgraph', {
        endpoint: 'http://localhost:4013/graphql'
      })
    }
  ],
  additionalTypeDefs: baseSchema
})