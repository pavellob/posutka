import type { UUID, AICommandResult, GraphQLQueryResult, AIAdapterConfig } from './types.js';
export interface IAIOrchestrator {
    run(orgId: UUID, command: string, context?: unknown): Promise<AICommandResult>;
    generateGraphQLQuery(orgId: UUID, description: string, adapterConfig: AIAdapterConfig, schemaContext?: Record<string, any>): Promise<GraphQLQueryResult>;
    executeGeneratedQuery(orgId: UUID, query: string, variables?: Record<string, any>): Promise<any>;
}
