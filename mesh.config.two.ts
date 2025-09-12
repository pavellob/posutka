import { defineConfig, loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli'

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
    }
  ]
})
