import type { Context } from '../context.js';
import type { AIAdapterConfig } from '@repo/datalayer';

export const resolvers: any = {
  Query: {
    _empty: () => true,
  },
  Mutation: {
    aiCommand: (_: unknown, { orgId, command, context }: { 
      orgId: string; 
      command: string; 
      context?: unknown 
    }, { orchestrator }: Context) => 
      orchestrator.run(orgId, command, context),
    
    generateGraphQLQuery: async (
      _: unknown, 
      { orgId, description, adapterConfig, schemaContext }: {
        orgId: string;
        description: string;
        adapterConfig: AIAdapterConfig;
        schemaContext?: Record<string, any>;
      }, 
      { orchestrator }: Context
    ) => {
      return orchestrator.generateGraphQLQuery(
        orgId, 
        description, 
        adapterConfig, 
        schemaContext
      );
    },
    
    executeGeneratedQuery: async (
      _: unknown,
      { orgId, query, variables }: {
        orgId: string;
        query: string;
        variables?: Record<string, any>;
      },
      { orchestrator }: Context
    ) => {
      return orchestrator.executeGeneratedQuery(orgId, query, variables);
    },
  },
};
