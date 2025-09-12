import { defineConfig, loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

// Читаем базовую схему для Hive
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const baseSchema = readFileSync(join(__dirname, 'base-schema.gql'), 'utf-8')

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('ai-subgraph', {
        endpoint: 'http://localhost:4008/graphql'
      })
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('identity-subgraph', {
        endpoint: 'http://localhost:4005/graphql'
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
    }
  ],
  additionalTypeDefs: baseSchema
})
