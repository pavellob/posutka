import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  schema: '../../backend/gateway-mesh/supergraph.graphql',
  documents: 'src/**/*.graphql',
  generates: {
    'src/lib/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-query',
      ],
      config: {
        fetcher: 'fetch',
        skipTypeCheck: true,
        legacyMode: false, // Используем @tanstack/react-query
        exposeDocument: true,
        exposeQueryKeys: true,
        exposeMutationKeys: true,
        exposeFetcher: true,
        addInfiniteQuery: true,
        errorType: 'Error',
        namingConvention: 'change-case-all#pascalCase',
        // TanStack Query v5 compatibility
        reactQueryVersion: 5,
        // Исправляем проблему с типами
        useTypeImports: true,
        skipTypename: false,
        scalars: {
          UUID: 'string',
          DateTime: 'string',
          JSON: 'Record<string, any>',
          Money: '{ amount: number; currency: string }',
          TransportOptions: 'Record<string, any>',
        },
      },
    },
  },
  ignoreNoDocuments: true,
}

export default config
